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

// Seed initial admin & rooms if DB is empty
async function seedInitialData() {
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

    // Retorna o usuário sem a senha
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
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
    // Tenta por ID numérico se for um ID valido do Postgres (< 2 bilhoes)
    if (!isNaN(userId) && userId < 2000000000) {
      existing = await prisma.user.findUnique({ where: { id: userId } });
    }

    // Fallback: Busca pelo e-mail original se o ID for um Date.now() do frontend
    if (!existing) {
      const searchEmail = originalEmail || email;
      if (searchEmail) {
        existing = await prisma.user.findUnique({ where: { email: searchEmail.toLowerCase() } });
      }
    }

    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Regras de Permissão:
    // Admin pode alterar qualquer pessoa.
    // Usuário comum só pode alterar seu próprio perfil.
    const isAdmin = requesterRole === 'admin';
    const isSelf = existing.email.toLowerCase() === (requesterEmail || '').toLowerCase();

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Acesso negado: Você só pode editar seu próprio perfil.' });
    }

    // Se alterou o e-mail, verificar se já está cadastrado
    if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailTaken = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (emailTaken) {
        return res.status(400).json({ error: 'Este e-mail já está sendo utilizado por outro usuário.' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    
    // Apenas Admin pode alterar o nível de acesso (role)
    if (role && isAdmin) {
      updateData.role = role;
    }

    // Se uma nova senha for informada, fazer hash com bcrypt
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    const { password: _, ...safeUser } = updatedUser;
    res.json({ user: safeUser, message: 'Usuário atualizado com sucesso' });
  } catch (err) {
    console.error("Erro ao atualizar usuário:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// FULL STATE SYNC
// =======================
app.post('/api/sync', async (req, res) => {
  try {
    const { cpus, rooms, history, users, headsetStock, headsetDefects } = req.body;
    
    // Backup passwords before clearing
    const existingUsers = await prisma.user.findMany();
    const passwordMap = new Map();
    existingUsers.forEach(eu => {
      passwordMap.set(eu.email.toLowerCase(), eu.password);
    });

    // Clear existing (Order matters for foreign keys if any, but we have none)
    await prisma.$transaction([
      prisma.cpu.deleteMany(),
      prisma.room.deleteMany(),
      prisma.history.deleteMany(),
      prisma.user.deleteMany(),
      prisma.headsetStock.deleteMany(),
      prisma.headsetDefect.deleteMany(),
    ]);

    // Insert new users
    if (users && users.length) {
      for (const u of users) {
        let finalPassword = passwordMap.get(u.email.toLowerCase());
        
        // Se foi enviada uma nova senha (e não está em branco), vamos fazer hash
        if (u.password && u.password.trim() !== '') {
          finalPassword = await bcrypt.hash(u.password, 10);
        }

        await prisma.user.create({
          data: {
            name: u.name,
            email: u.email,
            role: u.role,
            password: finalPassword
          }
        });
      }
    }

    if (cpus && cpus.length) {
      await prisma.cpu.createMany({
        data: cpus.map(c => ({
          id: BigInt(c.id),
          code: c.code || '',
          acquisition: c.acquisition || '',
          isAuditen: Boolean(c.isAuditen),
          location: c.location || ''
        }))
      });
    }

    if (rooms && rooms.length) {
      await prisma.room.createMany({
        data: rooms.map(r => ({
          id: Number(r.id),
          name: r.name,
          capacity: Number(r.capacity),
          paStatus: r.paStatus || []
        }))
      });
    }

    if (headsetStock && headsetStock.length) {
      await prisma.headsetStock.createMany({
        data: headsetStock.map(s => ({
          id: BigInt(s.id),
          brand: s.brand,
          quantity: Number(s.quantity)
        }))
      });
    }

    if (headsetDefects && headsetDefects.length) {
      await prisma.headsetDefect.createMany({
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

    if (history && history.length) {
      await prisma.history.createMany({
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

    res.json({ success: true, message: 'Sync completed' });
  } catch (err) {
    console.error(err);
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
    
    // Parse JSON correctly e não enviar senhas!
    const parsedCpus = cpus.map(c => ({...c, id: Number(c.id) || c.id}));
    const parsedStock = headsetStock.map(s => ({...s, id: Number(s.id) || s.id}));
    const parsedDefects = headsetDefects.map(d => ({...d, id: Number(d.id) || d.id}));
    const parsedHistory = history.map(h => ({...h, id: Number(h.id) || h.id}));
    
    const safeUsers = users.map(u => {
      const { password, ...safe } = u;
      return safe;
    });

    res.json({
      cpus: parsedCpus,
      rooms: rooms,
      history: parsedHistory,
      users: safeUsers,
      headsetStock: parsedStock,
      headsetDefects: parsedDefects,
      headsetHistory: []
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});
