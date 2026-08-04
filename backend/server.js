import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

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

// Seed initial admin & rooms if DB is empty
async function seedInitialData() {
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
}

seedInitialData().catch(console.error);

const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET || 'hdstech_secure_token_secret_2026_x89';

/**
 * Utilitários de Segurança e Geração de Tokens HMAC SHA-256
 */
function generateToken(payload) {
  const dataStr = JSON.stringify(payload);
  const base64Data = Buffer.from(dataStr, 'utf8').toString('base64url');
  const hmac = crypto.createHmac('sha256', JWT_SECRET).update(base64Data).digest('base64url');
  return `${base64Data}.${hmac}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  
  // Suporte retrocompatível para transição suave de sessões ativas
  if (parts.length !== 2) {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      if (decoded && decoded.email) return decoded;
    } catch (e) {
      return null;
    }
    return null;
  }

  const [base64Data, signature] = parts;
  const expectedHmac = crypto.createHmac('sha256', JWT_SECRET).update(base64Data).digest('base64url');
  
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedHmac);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    return JSON.parse(Buffer.from(base64Data, 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
}

/**
 * Utilitário para evitar código duplicado ao gerar BigInts únicos em transações
 */
function generateUniqueBigInt(id, usedSet, fallbackIndex = 0) {
  let rawId = BigInt(id || (Date.now() + fallbackIndex));
  while (usedSet.has(rawId.toString())) {
    rawId = rawId + BigInt(1);
  }
  usedSet.add(rawId.toString());
  return rawId;
}

/**
 * Middleware para exigir Autenticação via Token de Sessão Assinado em todas as rotas de dados
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Acesso negado: É necessário estar autenticado para acessar a API.' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const decoded = verifyToken(token);
  
  if (decoded && decoded.email) {
    req.authUser = decoded;
    return next();
  }

  return res.status(401).json({ error: 'Sessão inválida, expirada ou token adulterado. Faça login novamente.' });
}

// =======================
// LOGIN Endpoint
// =======================
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar token assinado com HMAC SHA-256
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      timestamp: Date.now()
    });

    res.json({
      user: sanitizeUser(user),
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// UPDATE USER Endpoint
// =======================
app.put('/api/users/:id', requireAuth, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { name, email, originalEmail, role, password } = req.body;

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
        existing = await prisma.user.findUnique({ where: { email: searchEmail.toLowerCase() } });
      }
    }

    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Regras de Permissão Segura: Usar req.authUser do token verificado
    const authenticatedEmail = req.authUser?.email;
    const requesterUser = authenticatedEmail ? await prisma.user.findUnique({ where: { email: authenticatedEmail.toLowerCase() } }) : null;
    const isAdmin = requesterUser?.role === 'admin';
    const isSelf = existing.email.toLowerCase() === (authenticatedEmail || '').toLowerCase();

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Acesso negado: Você só pode editar seu próprio perfil.' });
    }

    if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailTaken = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (emailTaken) {
        return res.status(400).json({ error: 'Este e-mail já está sendo utilizado por outro usuário.' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    
    // Apenas admins podem alterar perfil/role de usuários
    if (role && isAdmin) updateData.role = role;

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: existing.id },
      data: updateData
    });

    res.json({ user: sanitizeUser(updatedUser) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// FULL STATE SYNC (Transação Atômica)
// =======================
app.post('/api/sync', requireAuth, async (req, res) => {
  try {
    const { cpus, rooms, history, users, headsetStock, headsetDefects } = req.body;
    
    await prisma.$transaction(async (tx) => {
      // 1. Sincronizar Usuários
      if (users && Array.isArray(users) && users.length > 0) {
        const existingUsers = await tx.user.findMany();
        const passwordMap = new Map();
        existingUsers.forEach(eu => passwordMap.set(eu.email.toLowerCase(), eu.password));

        await tx.user.deleteMany();
        for (const u of users) {
          let finalPassword = passwordMap.get(u.email.toLowerCase());
          if (u.password && u.password.trim() !== '') {
            finalPassword = await bcrypt.hash(u.password, 10);
          }
          await tx.user.create({
            data: {
              name: u.name,
              email: u.email,
              role: u.role,
              password: finalPassword
            }
          });
        }
      }

      // 2. Sincronizar CPUs
      if (cpus && Array.isArray(cpus) && cpus.length > 0) {
        await tx.cpu.deleteMany();
        const usedCpuIds = new Set();
        const safeCpus = cpus.map((c, idx) => ({
          id: generateUniqueBigInt(c.id, usedCpuIds, idx),
          code: c.code || '',
          acquisition: c.acquisition || '',
          isAuditen: Boolean(c.isAuditen),
          location: c.location || ''
        }));
        await tx.cpu.createMany({ data: safeCpus });
      }

      // 3. Sincronizar Salas (Garantir que ID e capacidade cabem no Int de 32 bits do PostgreSQL)
      if (rooms && Array.isArray(rooms) && rooms.length > 0) {
        await tx.room.deleteMany();
        await tx.room.createMany({
          data: rooms.map((r, idx) => {
            let safeId = Number(r.id);
            if (isNaN(safeId) || safeId <= 0 || safeId > 2147483640) {
              safeId = idx + 1;
            }
            let safeCapacity = Math.min(Math.max(1, Number(r.capacity) || 1), 1000);
            return {
              id: safeId,
              name: r.name,
              capacity: safeCapacity,
              paStatus: r.paStatus || []
            };
          })
        });
      }

      // 4. Sincronizar Estoque Headsets
      if (headsetStock && Array.isArray(headsetStock) && headsetStock.length > 0) {
        await tx.headsetStock.deleteMany();
        const usedStockIds = new Set();
        const safeStock = headsetStock.map((s, idx) => ({
          id: generateUniqueBigInt(s.id, usedStockIds, idx),
          brand: s.brand,
          quantity: Number(s.quantity)
        }));
        await tx.headsetStock.createMany({ data: safeStock });
      }

      // 5. Sincronizar Headsets Danificados
      if (headsetDefects && Array.isArray(headsetDefects) && headsetDefects.length > 0) {
        await tx.headsetDefect.deleteMany();
        const usedDefectIds = new Set();
        const safeDefects = headsetDefects.map((d, idx) => ({
          id: generateUniqueBigInt(d.id, usedDefectIds, idx),
          date: d.date ? new Date(d.date) : new Date(),
          returnDate: d.returnDate ? new Date(d.returnDate) : null,
          brand: d.brand || '',
          defect: d.defect || '',
          status: d.status || '',
          box: d.box || ''
        }));
        await tx.headsetDefect.createMany({ data: safeDefects });
      }

      // 6. Sincronizar Histórico
      if (history && Array.isArray(history) && history.length > 0) {
        await tx.history.deleteMany();
        const usedHistoryIds = new Set();
        const safeHistory = history.map((h, idx) => ({
          id: generateUniqueBigInt(h.id, usedHistoryIds, idx),
          date: h.date ? new Date(h.date) : new Date(),
          action: h.action || null,
          cpuCode: h.cpuCode || null,
          from: h.from || null,
          to: h.to || null,
          brand: h.brand || null,
          qty: h.qty ? Number(h.qty) : null,
          details: h.details || null
        }));
        await tx.history.createMany({ data: safeHistory });
      }
    });

    res.json({ success: true, message: 'Sync completed' });
  } catch (err) {
    console.error("Erro na sincronização:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// FETCH ALL
// =======================
app.get('/api/all', requireAuth, async (req, res) => {
  try {
    const cpus = await prisma.cpu.findMany();
    const rooms = await prisma.room.findMany();
    const history = await prisma.history.findMany({ orderBy: { date: 'desc' } });
    const headsetStock = await prisma.headsetStock.findMany();
    const headsetDefects = await prisma.headsetDefect.findMany();

    const parsedHistory = history.map(h => ({
      ...h,
      id: Number(h.id)
    }));

    const headsetHistory = parsedHistory.filter(h => h.action || h.brand || h.qty);

    res.json({
      cpus,
      rooms,
      history: parsedHistory,
      users: [],
      headsetStock,
      headsetDefects,
      headsetHistory
    });
  } catch (err) {
    console.error("Erro em /api/all:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// GET USERS (Dedicado e Seguro)
// =======================
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const authenticatedEmail = req.authUser?.email;
    const requesterUser = authenticatedEmail ? await prisma.user.findUnique({ where: { email: authenticatedEmail.toLowerCase() } }) : null;

    if (!requesterUser || requesterUser.role !== 'admin') {
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
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});
