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
import scrimRoutes from './src/routes/scrims.js';
import uploadRoutes from './src/routes/upload.js';
import profileRoutes from './src/routes/ProfileRoutes.js';
import adminRoutes from './src/routes/admin.js';
import orgRoutes from './src/routes/Organizations.js';
import promosRoutes from './src/routes/promos.js';

import ensureRoomIndexes from './src/startup/ensureRoomIndexes.js';
import Scrim from './src/models/Scrim.js';
import Booking from './src/models/Booking.js';
import Room from './src/models/Room.js';
import Payment from './src/models/Payment.js';
import Promotion from './src/models/Promotion.js';
import { initMailer, sendEmail } from './src/utils/mailer.js';

dotenv.config();

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://arenapulse-orcin.vercel.app').replace(/\/+$/, '');
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  'http://localhost:5173',
  'https://thearenapulse.xyz',
  'https://www.thearenapulse.xyz',
];

const app = express();
app.set('trust proxy', 1); // fixes express-rate-limit “unexpected X-Forwarded-For” warning

// Single CORS middleware (avoid dupes)
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // allow curl/postman/same-origin
    const clean = origin.replace(/\/+$/, '');
    return ALLOWED_ORIGINS.includes(clean)
      ? cb(null, true)
      : cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true, // OK even if you don’t use cookies; lets browser send them if you add later
}));
app.options('*', cors()); // fast preflight

// also mirror CORS headers on all responses (helps with some proxies/cached 4xx)
app.use((req, res, next) => {
  const origin = (req.headers.origin || '').replace(/\/+$/, '');
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Vary', 'Origin');
  }
  next();
});

app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static (uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Healthcheck
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/health', (_req, res) => res.status(200).send('ok'));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/scrims', scrimRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/organizations', orgRoutes); // alias
app.use('/api/promos', promosRoutes);
app.use('/api/tournaments', tournamentsRoutes);

// Optional diagnostics: remove or protect later
app.get('/api/diagnostics/mail', async (req, res) => {
  try {
    const to = process.env.TEST_EMAIL || process.env.MAIL_FROM || process.env.SMTP_USER;
    if (!to) return res.status(400).json({ ok: false, error: 'Set TEST_EMAIL or MAIL_FROM' });
    await sendEmail({
      to,
      subject: 'ArenaPulse mail test',
      text: 'Diagnostic email from production.',
      html: '<p>Diagnostic email from <b>production</b>.</p>',
    });
    res.json({ ok: true, to });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// HTTP server + Socket.IO
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 20000,
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization'],
    credentials: true,
  },
});

io.use((socket, next) => {
  try {
    const raw = socket.handshake.auth?.token || socket.handshake.headers?.authorization || '';
    const token = raw?.startsWith('Bearer ') ? raw.slice(7) : raw;
    if (token) jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    console.warn('[socket] auth failed:', e?.message || e);
    next(); // allow connect anyway
  }
});

io.on('connection', (socket) => {
  console.log('[socket] connected:', socket.id);
  socket.on('join-scrim', (scrimId) => {
    try {
      const room = 'scrim:' + String(scrimId);
      socket.join(room);
      console.log(`[socket] ${socket.id} joined ${room}`);
    } catch (e) {
      console.warn('join-scrim error:', e?.message || e);
    }
  });
  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected:', socket.id, reason);
  });
});

app.set('io', io);

// Cleanup job (unchanged)
const CLEANUP_EVERY_HOURS = Number(process.env.CLEANUP_EVERY_HOURS || 24);
async function purgeOldScrims() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const oldScrims = await Scrim.find({ 'timeSlot.end': { $lt: sevenDaysAgo } }).select('_id');
  if (!oldScrims.length) return;
  const ids = oldScrims.map((s) => s._id);
  await Promise.all([
    Booking.deleteMany({ scrimId: { $in: ids } }),
    Room.deleteMany({ scrimId: { $in: ids } }),
    Payment.deleteMany({ scrimId: { $in: ids } }),
    Promotion.updateMany({ scrimId: { $in: ids } }, { $unset: { scrimId: 1 } }),
    Scrim.deleteMany({ _id: { $in: ids } }),
  ]);
  console.log(`🧹 Purged ${ids.length} old scrim(s) and related data`);
}

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ Missing MONGO_URI in env');
  process.exit(1);
}

mongoose.connection.once('open', () => {
  purgeOldScrims().catch(console.error);
  setInterval(() => purgeOldScrims().catch(console.error), CLEANUP_EVERY_HOURS * 3600 * 1000);
});

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    await initMailer(); // init email provider early (logs if SMTP blocked)
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 70000;
    server.listen(PORT, () => {
      console.log(`✅ HTTP + Socket.IO on :${PORT}`);
      console.log('🗄️  MongoDB connected');
      ensureRoomIndexes();
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
