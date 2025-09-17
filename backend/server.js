// backend/server.js
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';

import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import tournamentsRoutes from './src/routes/tournaments.js';
import authRoutes from './src/routes/auth.js';
import organizationsRoutes from './src/routes/Organizations.js';
import ensureRoomIndexes from './src/startup/ensureRoomIndexes.js';




// ⬇️ ROUTES (adjust paths to your actual files)
import scrimRoutes from './src/routes/scrims.js';
import uploadRoutes from './src/routes/upload.js';
import profileRoutes from './src/routes/ProfileRoutes.js';
import adminRoutes from './src/routes/admin.js';
import orgRoutes from './src/routes/Organizations.js';
import promosRoutes from './src/routes/promos.js';


// --- automatic cleanup: delete scrims older than 7 days (keep org ratings) ---
import Scrim from './src/models/Scrim.js';
import Booking from './src/models/Booking.js';
import Room from './src/models/Room.js';
import Payment from './src/models/Payment.js';
import Promotion from './src/models/Promotion.js';


dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Healthcheck
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scrims', scrimRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orgs', orgRoutes);
// ✅ mount both prefixes so /api/organizations/* and /api/orgs/* both work
app.use('/api/organizations', orgRoutes);
app.use('/api/orgs',           orgRoutes);
app.use('/api/promos', promosRoutes);
app.use('/api/tournaments', tournamentsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentsRoutes);
app.use('/api/organizations', organizationsRoutes);


// --- Socket.IO wiring ---
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  path: '/socket.io',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// OPTIONAL: JWT auth on socket handshake (won’t block if token missing)
io.use((socket, next) => {
  try {
    const raw = socket.handshake.auth?.token || socket.handshake.headers?.authorization || '';
    const token = raw?.startsWith('Bearer ') ? raw.slice(7) : raw;
    if (!token) return next(); // allow anonymous if you prefer

    jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (e) {
    console.warn('[socket] auth failed:', e?.message || e);
    // You can block by calling next(new Error('auth failed')), but we'll allow connect:
    return next();
  }
});

io.on('connection', (socket) => {
  console.log('[socket] connected:', socket.id);

  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected:', socket.id, reason);
  });

  // Example events you might emit later:
  // socket.on('joinScrimRoom', (scrimId) => socket.join(`scrim:${scrimId}`));
  // socket.on('leaveScrimRoom', (scrimId) => socket.leave(`scrim:${scrimId}`));
  // Use: io.to(`scrim:${scrimId}`).emit('roomMessage', payload);
});

// Share io with controllers if needed:
app.set('io', io);






// runs once and then every CLEANUP_EVERY_HOURS (default daily)
const CLEANUP_EVERY_HOURS = Number(process.env.CLEANUP_EVERY_HOURS || 24);

async function purgeOldScrims() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // find scrims that finished > 7 days ago
  const oldScrims = await Scrim.find({
    'timeSlot.end': { $lt: sevenDaysAgo }
  }).select('_id');

  if (!oldScrims.length) return;

  const ids = oldScrims.map(s => s._id);

  // delete dependent data; DO NOT touch OrgRating
  await Promise.all([
    Booking.deleteMany({ scrimId: { $in: ids } }),
    Room.deleteMany({ scrimId: { $in: ids } }),
    Payment.deleteMany({ scrimId: { $in: ids } }),

    // either unlink promos from the scrim so the promo item remains…
    Promotion.updateMany({ scrimId: { $in: ids } }, { $unset: { scrimId: 1 } }),

    // …or if you prefer to remove promos entirely, use:
    // Promotion.deleteMany({ scrimId: { $in: ids } }),

    Scrim.deleteMany({ _id: { $in: ids } }),
  ]);

  console.log(`🧹 Purged ${ids.length} old scrim(s) and related data`);
}

// kick off after DB connects, then schedule
mongoose.connection.once('open', () => {
  purgeOldScrims().catch(console.error);
  setInterval(() => purgeOldScrims().catch(console.error), CLEANUP_EVERY_HOURS * 60 * 60 * 1000);
});

// Start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    const port = process.env.PORT || 4000;
    server.listen(port, () => console.log(`✅ HTTP + Socket.IO running on ${port}`, "MongoDb is connected"));
    ensureRoomIndexes();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
