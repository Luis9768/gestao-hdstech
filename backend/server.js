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

/**
 * Middleware para exigir Autenticação via Token de Sessão em todas as rotas de dados
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

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    if (decoded && decoded.email) {
      req.authUser = decoded;
      return next();
    }
  } catch (err) {
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

    // Gerar token de sessão seguro contendo os dados essenciais do usuário
    const token = Buffer.from(JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role,
      timestamp: Date.now()
    })).toString('base64');

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
    const { name, email, originalEmail, role, password, requesterRole, requesterEmail } = req.body;

    let existing = null;
    
    // Tenta encontrar por ID se for numérico válido
    if (!isNaN(userId) && Number.isInteger(userId)) {
      try {
        existing = await prisma.user.findUnique({ where: { id: userId } });
      } catch (e) {
        existing = null;
      }
    }

    // Fallback: Busca pelo e-mail se o ID for um timestamp do cliente ou não for encontrado
    if (!existing) {
      const searchEmail = originalEmail || email;
      if (searchEmail) {
        existing = await prisma.user.findUnique({ where: { email: searchEmail.toLowerCase() } });
      }
    }

    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Regras de Permissão: Validar admin consultando o banco de dados
    let isAdmin = false;
    if (requesterEmail) {
      const requesterUser = await prisma.user.findUnique({ where: { email: requesterEmail.toLowerCase() } });
      if (requesterUser && requesterUser.role === 'admin') {
        isAdmin = true;
      }
    }
    const isSelf = existing.email.toLowerCase() === (requesterEmail || '').toLowerCase();

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Acesso negado: Você só pode editar seu próprio perfil.' });
    }

    // Se alterou o e-mail, verificar se já está cadastrado por outro usuário
    if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailTaken = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (emailTaken) {
        return res.status(400).json({ error: 'Este e-mail já está sendo utilizado por outro usuário.' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    
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
// FULL STATE SYNC (Transação Atômica)
// =======================
app.post('/api/sync', requireAuth, async (req, res) => {
  try {
    const { cpus, rooms, history, users, headsetStock, headsetDefects } = req.body;
    
    // Executa toda a sincronização dentro de uma única transação atômica
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
        await tx.cpu.createMany({
          data: cpus.map(c => ({
            id: BigInt(c.id),
            code: c.code || '',
            acquisition: c.acquisition || '',
            isAuditen: Boolean(c.isAuditen),
            location: c.location || ''
          }))
        });
      }

      // 3. Sincronizar Salas
      if (rooms && Array.isArray(rooms) && rooms.length > 0) {
        await tx.room.deleteMany();
        await tx.room.createMany({
          data: rooms.map(r => ({
            id: Number(r.id),
            name: r.name,
            capacity: Number(r.capacity),
            paStatus: r.paStatus || []
          }))
        });
      }

      // 4. Sincronizar Estoque Headsets
      if (headsetStock && Array.isArray(headsetStock) && headsetStock.length > 0) {
        await tx.headsetStock.deleteMany();
        await tx.headsetStock.createMany({
          data: headsetStock.map(s => ({
            id: BigInt(s.id),
            brand: s.brand,
            quantity: Number(s.quantity)
          }))
        });
      }

      // 5. Sincronizar Headsets Danificados
      if (headsetDefects && Array.isArray(headsetDefects) && headsetDefects.length > 0) {
        await tx.headsetDefect.deleteMany();
        await tx.headsetDefect.createMany({
          data: headsetDefects.map(d => ({
            id: BigInt(d.id),
            date: d.date ? new Date(d.date) : new Date(),
            returnDate: d.returnDate ? new Date(d.returnDate) : null,
            brand: d.brand || '',
            defect: d.defect || '',
            status: d.status || '',
            box: d.box || ''
          }))
        });
      }

      // 6. Sincronizar Histórico
      if (history && Array.isArray(history) && history.length > 0) {
        await tx.history.deleteMany();
        await tx.history.createMany({
          data: history.map(h => ({
            id: BigInt(h.id),
            date: h.date ? new Date(h.date) : new Date(),
            action: h.action || null,
            cpuCode: h.cpuCode || null,
            from: h.from || null,
            to: h.to || null,
            brand: h.brand || null,
            qty: h.qty ? Number(h.qty) : null,
            details: h.details || null
          }))
        });
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
      users: [], // Removido por segurança para não expor lista de contas no payload público
      headsetStock: parsedStock,
      headsetDefects: parsedDefects,
      headsetHistory: parsedHeadsetHistory
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// GET USERS (Dedicado e Seguro)
// =======================
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const requesterEmail = req.query.requesterEmail;
    if (!requesterEmail) {
      return res.status(401).json({ error: 'Acesso negado: E-mail de identificação necessário.' });
    }
    const requesterUser = await prisma.user.findUnique({ where: { email: String(requesterEmail).toLowerCase() } });
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
