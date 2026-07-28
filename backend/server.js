import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

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
  // Garantir que a tabela HeadsetHistory exista no PostgreSQL
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HeadsetHistory" (
        "id" BIGINT PRIMARY KEY,
        "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "action" TEXT NOT NULL,
        "brand" TEXT NOT NULL,
        "qty" INTEGER NOT NULL,
        "details" TEXT
      );
    `);
  } catch (e) {
    console.error("Erro ao verificar/criar tabela HeadsetHistory:", e);
  }

  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const hashedPassword = await bcrypt.hash('Headset@2021#$!', 10);
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

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// UPDATE USER Endpoint
// =======================
app.put('/api/users/:id', async (req, res) => {
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

    // Regras de Permissão: Admin edita qualquer um; usuário comum apenas a si próprio
    const isAdmin = requesterRole === 'admin';
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
app.post('/api/sync', async (req, res) => {
  try {
    const { cpus, rooms, history, users, headsetStock, headsetDefects, headsetHistory } = req.body;
    
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

      // 6. Sincronizar Histórico CPUs
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

      // 7. Sincronizar Histórico Headsets
      if (headsetHistory && Array.isArray(headsetHistory) && headsetHistory.length > 0) {
        await tx.headsetHistory.deleteMany();
        await tx.headsetHistory.createMany({
          data: headsetHistory.map(hh => ({
            id: BigInt(hh.id),
            date: hh.date ? new Date(hh.date) : new Date(),
            action: hh.action || '',
            brand: hh.brand || '',
            qty: Number(hh.qty) || 0,
            details: hh.details || null
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
app.get('/api/all', async (req, res) => {
  try {
    const cpus = await prisma.cpu.findMany();
    const rooms = await prisma.room.findMany();
    const history = await prisma.history.findMany({ orderBy: { id: 'desc' } });
    const users = await prisma.user.findMany();
    const headsetStock = await prisma.headsetStock.findMany();
    const headsetDefects = await prisma.headsetDefect.findMany();
    const headsetHistory = await prisma.headsetHistory.findMany({ orderBy: { id: 'desc' } });
    
    // Parse JSON e sanitizar usuários
    const parsedCpus = cpus.map(c => ({...c, id: Number(c.id) || c.id}));
    const parsedStock = headsetStock.map(s => ({...s, id: Number(s.id) || s.id}));
    const parsedDefects = headsetDefects.map(d => ({...d, id: Number(d.id) || d.id}));
    const parsedHistory = history.map(h => ({...h, id: Number(h.id) || h.id}));
    const parsedHeadsetHistory = headsetHistory.map(hh => ({...hh, id: Number(hh.id) || hh.id}));
    
    const safeUsers = users.map(u => sanitizeUser(u));

    res.json({
      cpus: parsedCpus,
      rooms: rooms,
      history: parsedHistory,
      users: safeUsers,
      headsetStock: parsedStock,
      headsetDefects: parsedDefects,
      headsetHistory: parsedHeadsetHistory
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});
