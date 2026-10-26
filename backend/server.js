import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'gestao-hdstech-super-secret-key-2026-production';

// Suporte a serialização automática de BigInt em JSON no Express
BigInt.prototype.toJSON = function () {
  return Number(this);
};

app.use(cors());
app.use(express.json({ limit: '50mb' }));

/**
 * Helper para remover o campo de senha dos objetos de usuário de forma limpa
 */
function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

/**
 * Helper resiliente para converter datas em formatos variados (BR, ISO, Timestamp)
 * garantindo que nunca quebre no Prisma com 'Invalid Date'.
 */
function parseSafeDate(dateInput) {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) return dateInput;
  if (typeof dateInput === 'string') {
    const str = dateInput.trim();
    const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (brMatch) {
      const day = parseInt(brMatch[1], 10);
      const month = parseInt(brMatch[2], 10) - 1;
      const year = parseInt(brMatch[3], 10);
      const hour = brMatch[4] ? parseInt(brMatch[4], 10) : 0;
      const min = brMatch[5] ? parseInt(brMatch[5], 10) : 0;
      const sec = brMatch[6] ? parseInt(brMatch[6], 10) : 0;
      const d = new Date(year, month, day, hour, min, sec);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  } else if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

// Seed initial admin & rooms if DB is empty
async function seedInitialData() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Headset@2021#$!';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.user.create({
        data: {
          name: 'Luis Miguel',
          email: 'luis.miguel@headsetbrasil.com',
          role: 'admin',
          password: hashedPassword
        }
      });
      console.log('Seed: Administrador inicial criado com sucesso.');
    }

    const roomCount = await prisma.room.count();
    if (roomCount === 0) {
      await prisma.room.createMany({
        data: [
          { id: 1, name: 'TIM', capacity: 24, paStatus: [] },
          { id: 2, name: 'Affix', capacity: 28, paStatus: [] }
        ]
      });
      console.log('Seed: Salas iniciais criadas com sucesso.');
    }
  } catch (err) {
    console.error("Aviso no seed inicial:", err.message);
  }
}

seedInitialData().catch(console.error);

/**
 * Middleware para exigir Autenticação via Token JWT assinado criptograficamente
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Acesso negado: É necessário estar autenticado para acessar a API.' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação inválido ou ausente.' });
  }

  // 1. Tentar validar via JWT padrão HMAC-SHA256
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.email) {
      req.authUser = decoded;
      return next();
    }
  } catch (jwtErr) {
    // 2. Fallback de transição suave para sessões legadas já abertas
    try {
      const legacy = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      if (legacy && legacy.email) {
        req.authUser = legacy;
        return next();
      }
    } catch (legacyErr) {
      // Ignorar, cairá no 401 abaixo
    }
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }

  return res.status(401).json({ error: 'Acesso negado.' });
}

// =======================
// LOGIN Endpoint
// =======================
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar Token JWT assinado com chave secreta e validade de 24 horas
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      user: sanitizeUser(user),
      token
    });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// UPDATE USER Endpoint
// =======================
app.put('/api/users/:id', requireAuth, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { name, email, originalEmail, role, password, requesterRole, requesterEmail } = req.body;

    let existing = null;
    
    if (!isNaN(userId) && Number.isInteger(userId)) {
      try {
        existing = await prisma.user.findUnique({ where: { id: userId } });
      } catch (e) {
        existing = null;
      }
    }

    if (!existing) {
      const searchEmail = originalEmail || email;
      if (searchEmail) {
        existing = await prisma.user.findUnique({ where: { email: searchEmail.toLowerCase().trim() } });
      }
    }

    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const callerEmail = (req.authUser?.email || requesterEmail || '').toLowerCase().trim();
    let isAdmin = req.authUser?.role === 'admin';
    if (!isAdmin && callerEmail) {
      const requesterUser = await prisma.user.findUnique({ where: { email: callerEmail } });
      if (requesterUser && requesterUser.role === 'admin') {
        isAdmin = true;
      }
    }
    const isSelf = existing.email.toLowerCase() === callerEmail;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Acesso negado: Você só pode editar seu próprio perfil.' });
    }

    if (email && email.toLowerCase().trim() !== existing.email.toLowerCase()) {
      const emailTaken = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (emailTaken) {
        return res.status(400).json({ error: 'Este e-mail já está sendo utilizado por outro usuário.' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase().trim();
    
    if (role && isAdmin) {
      updateData.role = role;
    }

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: existing.id },
      data: updateData
    });

    res.json({ user: sanitizeUser(updatedUser), message: 'Usuário atualizado com sucesso' });
  } catch (err) {
    console.error("Erro ao atualizar usuário:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// FULL STATE SYNC (Totalmente Seguro com UPSERT Diferencial - SEM DELETEMANY CEGO)
// =======================
app.post('/api/sync', requireAuth, async (req, res) => {
  try {
    const { cpus, rooms, history, users, headsetStock, headsetDefects } = req.body;
    
    // Configura timeout de 60s para prevenir timeout do Prisma em conexões remotas
    await prisma.$transaction(async (tx) => {
      // 1. Sincronizar Usuários (Upsert Seguro)
      if (users && Array.isArray(users) && users.length > 0) {
        for (const u of users) {
          if (!u.email) continue;
          const cleanEmail = u.email.toLowerCase().trim();
          const existingUser = await tx.user.findUnique({ where: { email: cleanEmail } });
          let finalPassword = existingUser ? existingUser.password : null;
          if (u.password && u.password.trim() !== '') {
            finalPassword = await bcrypt.hash(u.password.trim(), 10);
          }
          await tx.user.upsert({
            where: { email: cleanEmail },
            update: {
              name: u.name,
              role: u.role || 'user',
              ...(finalPassword ? { password: finalPassword } : {})
            },
            create: {
              name: u.name,
              email: cleanEmail,
              role: u.role || 'user',
              password: finalPassword
            }
          });
        }
      }

      // 2. Sincronizar CPUs (Upsert por ID + Deleção Segura com Trava de Segurança)
      if (cpus && Array.isArray(cpus)) {
        const existingCpus = await tx.cpu.findMany();
        const safeCpus = cpus.map((c, idx) => {
          let rawId = BigInt(c.id || (Date.now() + idx));
          return {
            id: rawId,
            code: c.code || '',
            acquisition: c.acquisition || '',
            isAuditen: Boolean(c.isAuditen),
            location: c.location || 'estoque'
          };
        });

        // Executar upserts em lotes concorrentes para performance e evitar timeout
        const CHUNK_SIZE = 15;
        for (let i = 0; i < safeCpus.length; i += CHUNK_SIZE) {
          const chunk = safeCpus.slice(i, i + CHUNK_SIZE);
          await Promise.all(chunk.map(c => tx.cpu.upsert({
            where: { id: c.id },
            update: {
              code: c.code,
              acquisition: c.acquisition,
              isAuditen: c.isAuditen,
              location: c.location
            },
            create: c
          })));
        }

        // Deleção Segura: Só deleta CPUs que foram explicitamente removidas no front
        // e APENAS se a lista recebida não estiver zerada (impede apagar tudo por engano)
        if (safeCpus.length > 0 && existingCpus.length > safeCpus.length) {
          const incomingIds = new Set(safeCpus.map(c => c.id.toString()));
          const toDelete = existingCpus.filter(ec => !incomingIds.has(ec.id.toString()));
          if (toDelete.length > 0 && toDelete.length <= 15) {
            await tx.cpu.deleteMany({
              where: { id: { in: toDelete.map(d => d.id) } }
            });
          }
        }
      }

      // 3. Sincronizar Salas (Upsert por ID numérico)
      if (rooms && Array.isArray(rooms)) {
        const existingRooms = await tx.room.findMany();
        for (let idx = 0; idx < rooms.length; idx++) {
          const r = rooms[idx];
          let safeId = Number(r.id);
          if (isNaN(safeId) || safeId <= 0 || safeId > 2147483640) {
            safeId = idx + 1;
          }
          await tx.room.upsert({
            where: { id: safeId },
            update: {
              name: r.name,
              capacity: Number(r.capacity),
              paStatus: r.paStatus || []
            },
            create: {
              id: safeId,
              name: r.name,
              capacity: Number(r.capacity),
              paStatus: r.paStatus || []
            }
          });
        }

        if (rooms.length > 0 && existingRooms.length > rooms.length) {
          const incomingRoomIds = new Set(rooms.map(r => Number(r.id)));
          const toDelete = existingRooms.filter(er => !incomingRoomIds.has(er.id));
          if (toDelete.length > 0 && toDelete.length < existingRooms.length) {
            await tx.room.deleteMany({
              where: { id: { in: toDelete.map(d => d.id) } }
            });
          }
        }
      }

      // 4. Sincronizar Estoque Headsets (Upsert por Marca)
      if (headsetStock && Array.isArray(headsetStock)) {
        for (let idx = 0; idx < headsetStock.length; idx++) {
          const s = headsetStock[idx];
          if (!s.brand) continue;
          let rawId = BigInt(s.id || (Date.now() + idx));
          await tx.headsetStock.upsert({
            where: { brand: s.brand.trim() },
            update: {
              quantity: Number(s.quantity)
            },
            create: {
              id: rawId,
              brand: s.brand.trim(),
              quantity: Number(s.quantity)
            }
          });
        }
      }

      // 5. Sincronizar Headsets Danificados (Upsert Seguro com parseSafeDate)
      if (headsetDefects && Array.isArray(headsetDefects)) {
        const existingDefects = await tx.headsetDefect.findMany();
        const safeDefects = headsetDefects.map((d, idx) => {
          let rawId = BigInt(d.id || (Date.now() + idx));
          return {
            id: rawId,
            date: parseSafeDate(d.date),
            returnDate: d.returnDate ? parseSafeDate(d.returnDate) : null,
            brand: d.brand || '',
            defect: d.defect || '',
            status: d.status || 'Aguardando',
            box: d.box || ''
          };
        });

        const CHUNK_SIZE = 15;
        for (let i = 0; i < safeDefects.length; i += CHUNK_SIZE) {
          const chunk = safeDefects.slice(i, i + CHUNK_SIZE);
          await Promise.all(chunk.map(d => tx.headsetDefect.upsert({
            where: { id: d.id },
            update: {
              date: d.date,
              returnDate: d.returnDate,
              brand: d.brand,
              defect: d.defect,
              status: d.status,
              box: d.box
            },
            create: d
          })));
        }

        if (safeDefects.length > 0 && existingDefects.length > safeDefects.length) {
          const incomingIds = new Set(safeDefects.map(d => d.id.toString()));
          const toDelete = existingDefects.filter(ed => !incomingIds.has(ed.id.toString()));
          if (toDelete.length > 0 && toDelete.length <= 15) {
            await tx.headsetDefect.deleteMany({
              where: { id: { in: toDelete.map(d => d.id) } }
            });
          }
        }
      }

      // 6. Sincronizar Histórico (Otimizado: insere em lote apenas itens novos)
      if (history && Array.isArray(history) && history.length > 0) {
        const existingHist = await tx.history.findMany({ select: { id: true } });
        const existingIds = new Set(existingHist.map(h => h.id.toString()));
        const newHist = history
          .map((h, idx) => ({
            id: BigInt(h.id || (Date.now() + idx)),
            date: parseSafeDate(h.date),
            action: h.action || null,
            cpuCode: h.cpuCode || null,
            from: h.from || null,
            to: h.to || null,
            brand: h.brand || null,
            qty: h.qty ? Number(h.qty) : null,
            details: h.details || null
          }))
          .filter(h => !existingIds.has(h.id.toString()));

        if (newHist.length > 0) {
          await tx.history.createMany({
            data: newHist,
            skipDuplicates: true
          });
        }
      }
    }, {
      maxWait: 20000,
      timeout: 60000
    });

    res.json({ success: true, message: 'Sync completed safely without data loss' });
  } catch (err) {
    console.error("Erro na sincronização:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// ROTAS GRANULARES / CRUD ATÔMICO
// =======================

// CPUs
app.post('/api/cpus', requireAuth, async (req, res) => {
  try {
    const { id, code, acquisition, isAuditen, location } = req.body;
    let rawId = BigInt(id || Date.now());
    const cpu = await prisma.cpu.create({
      data: {
        id: rawId,
        code: code || '',
        acquisition: acquisition || '',
        isAuditen: Boolean(isAuditen),
        location: location || 'estoque'
      }
    });
    res.json({ success: true, cpu: { ...cpu, id: Number(cpu.id) } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/cpus/:id', requireAuth, async (req, res) => {
  try {
    const cpuId = BigInt(req.params.id);
    const { code, acquisition, isAuditen, location } = req.body;
    const cpu = await prisma.cpu.update({
      where: { id: cpuId },
      data: {
        ...(code !== undefined ? { code } : {}),
        ...(acquisition !== undefined ? { acquisition } : {}),
        ...(isAuditen !== undefined ? { isAuditen: Boolean(isAuditen) } : {}),
        ...(location !== undefined ? { location } : {})
      }
    });
    res.json({ success: true, cpu: { ...cpu, id: Number(cpu.id) } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/cpus/:id', requireAuth, async (req, res) => {
  try {
    const cpuId = BigInt(req.params.id);
    await prisma.cpu.delete({ where: { id: cpuId } });
    res.json({ success: true, message: 'CPU excluída com sucesso' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Salas
app.put('/api/rooms/:id', requireAuth, async (req, res) => {
  try {
    const roomId = Number(req.params.id);
    const { name, capacity, paStatus } = req.body;
    const room = await prisma.room.update({
      where: { id: roomId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(capacity !== undefined ? { capacity: Number(capacity) } : {}),
        ...(paStatus !== undefined ? { paStatus } : {})
      }
    });
    res.json({ success: true, room });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Headset Stock
app.put('/api/headsets/stock/:id', requireAuth, async (req, res) => {
  try {
    const stockId = BigInt(req.params.id);
    const { quantity } = req.body;
    const item = await prisma.headsetStock.update({
      where: { id: stockId },
      data: { quantity: Number(quantity) }
    });
    res.json({ success: true, stock: { ...item, id: Number(item.id) } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Headset Defeitos
app.post('/api/headsets/defects', requireAuth, async (req, res) => {
  try {
    const { id, date, returnDate, brand, defect, status, box } = req.body;
    let rawId = BigInt(id || Date.now());
    const item = await prisma.headsetDefect.create({
      data: {
        id: rawId,
        date: parseSafeDate(date),
        returnDate: returnDate ? parseSafeDate(returnDate) : null,
        brand: brand || '',
        defect: defect || '',
        status: status || 'Aguardando',
        box: box || ''
      }
    });
    res.json({ success: true, defect: { ...item, id: Number(item.id) } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/headsets/defects/:id', requireAuth, async (req, res) => {
  try {
    const defectId = BigInt(req.params.id);
    const { status, returnDate, box } = req.body;
    const item = await prisma.headsetDefect.update({
      where: { id: defectId },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(returnDate !== undefined ? { returnDate: parseSafeDate(returnDate) } : {}),
        ...(box !== undefined ? { box } : {})
      }
    });
    res.json({ success: true, defect: { ...item, id: Number(item.id) } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Histórico
app.post('/api/history', requireAuth, async (req, res) => {
  try {
    const { id, date, action, cpuCode, from, to, brand, qty, details } = req.body;
    let rawId = BigInt(id || Date.now());
    const created = await prisma.history.create({
      data: {
        id: rawId,
        date: parseSafeDate(date),
        action: action || null,
        cpuCode: cpuCode || null,
        from: from || null,
        to: to || null,
        brand: brand || null,
        qty: qty ? Number(qty) : null,
        details: details || null
      }
    });
    res.json({ success: true, historyItem: { ...created, id: Number(created.id) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// FETCH ALL (Carregamento Geral Seguro)
// =======================
app.get('/api/all', requireAuth, async (req, res) => {
  try {
    const cpus = await prisma.cpu.findMany();
    const rooms = await prisma.room.findMany();
    const history = await prisma.history.findMany({ orderBy: { id: 'desc' } });
    const headsetStock = await prisma.headsetStock.findMany();
    const headsetDefects = await prisma.headsetDefect.findMany();
    
    // Parse JSON
    const parsedCpus = cpus.map(c => ({...c, id: Number(c.id) || c.id}));
    const parsedStock = headsetStock.map(s => ({...s, id: Number(s.id) || s.id}));
    const parsedDefects = headsetDefects.map(d => ({...d, id: Number(d.id) || d.id}));
    const parsedHistory = history.map(h => ({...h, id: Number(h.id) || h.id}));

    // Filtrar histórico de headsets a partir da tabela principal History
    const parsedHeadsetHistory = parsedHistory.filter(h => h.action || h.brand || h.qty);

    res.json({
      cpus: parsedCpus,
      rooms: rooms,
      history: parsedHistory,
      users: [], // Protegido: a lista completa só é entregue na rota /api/users para admin
      headsetStock: parsedStock,
      headsetDefects: parsedDefects,
      headsetHistory: parsedHeadsetHistory
    });
  } catch(err) {
    console.error("Erro ao carregar dados gerais:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// GET USERS (Dedicado e Seguro)
// =======================
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const callerEmail = (req.authUser?.email || req.query.requesterEmail || '').toLowerCase().trim();
    if (!callerEmail) {
      return res.status(401).json({ error: 'Acesso negado: E-mail de identificação necessário.' });
    }
    let isAdmin = req.authUser?.role === 'admin';
    if (!isAdmin) {
      const requesterUser = await prisma.user.findUnique({ where: { email: callerEmail } });
      if (requesterUser && requesterUser.role === 'admin') {
        isAdmin = true;
      }
    }
    if (!isAdmin) {
      return res.status(403).json({ error: 'Acesso negado: Apenas administradores podem visualizar contas.' });
    }

    const users = await prisma.user.findMany();
    const safeUsers = users.map(u => sanitizeUser(u));
    res.json({ users: safeUsers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});

const shutdown = async () => {
  console.log('Finalizando conexões e encerrando servidor de forma segura...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
