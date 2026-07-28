import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// =======================
// MASS SYNC (MIGRATION ONLY)
// =======================
app.post('/api/sync', async (req, res) => {
  try {
    const { cpus, rooms, history, users, headsetStock, headsetDefects } = req.body;
    
    // Clear existing (Order matters for foreign keys if any, but we have none)
    await prisma.$transaction([
      prisma.cpu.deleteMany(),
      prisma.room.deleteMany(),
      prisma.history.deleteMany(),
      prisma.user.deleteMany(),
      prisma.headsetStock.deleteMany(),
      prisma.headsetDefect.deleteMany(),
    ]);

    // Insert new
    if (users && users.length) {
      await prisma.user.createMany({
        data: users.map(u => ({
          name: u.name,
          email: u.email,
          role: u.role,
          password: u.password
        }))
      });
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
          date: d.date || '',
          returnDate: d.returnDate || null,
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
          date: h.date || '',
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
    
    // Parse JSON correctly
    const parsedCpus = cpus.map(c => ({...c, id: Number(c.id) || c.id}));
    const parsedStock = headsetStock.map(s => ({...s, id: Number(s.id) || s.id}));
    const parsedDefects = headsetDefects.map(d => ({...d, id: Number(d.id) || d.id}));
    const parsedHistory = history.map(h => ({...h, id: Number(h.id) || h.id}));

    res.json({
      cpus: parsedCpus,
      rooms: rooms,
      history: parsedHistory,
      users: users,
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
