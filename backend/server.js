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

// ==== Routes (adjust if your filenames differ)
import tournamentsRoutes from './src/routes/tournaments.js';
import authRoutes from './src/routes/auth.js';
import scrimRoutes from './src/routes/scrims.js';
import uploadRoutes from './src/routes/upload.js';
import profileRoutes from './src/routes/ProfileRoutes.js';
import adminRoutes from './src/routes/admin.js';
import orgRoutes from './src/routes/Organizations.js';
import promosRoutes from './src/routes/promos.js';

// ==== Housekeeping imports
import ensureRoomIndexes from './src/startup/ensureRoomIndexes.js';
import Scrim from './src/models/Scrim.js';
import Booking from './src/models/Booking.js';
import Room from './src/models/Room.js';
import Payment from './src/models/Payment.js';
import Promotion from './src/models/Promotion.js';

dotenv.config();



// --- put these near the top (after imports, before app = express()) ---
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://arenapulse-orcin.vercel.app';
const LOCAL_FRONTEND = 'http://localhost:5173';
const ALLOWED_ORIGINS = [
  FRONTEND_URL.replace(/\/+$/, ''),
  LOCAL_FRONTEND,
  // add more if you use other preview domains
];

const corsOptions = {
  origin(origin, cb) {
    // allow non-browser tools (no Origin header)
    if (!origin) return cb(null, true);
    const clean = origin.replace(/\/+$/, '');
    if (ALLOWED_ORIGINS.includes(clean)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
  preflightContinue: false,
};

// --- after you create app ---
const app = express();

// Ensure CORS headers are set on *all* responses (including errors)
app.use((req, res, next) => {
  const origin = (req.headers.origin || '').replace(/\/+$/, '');
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    // Vary so caches don’t mix origins
    res.header('Vary', 'Origin');
  }
  next();
});

// CORS + preflight before anything else
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle OPTIONS early

app.use(express.json());



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Env
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ Missing MONGO_URI in env');
  process.exit(1);
}

// Explicit allowlist (add your custom domain later if you move off the Vercel preview)
// const ALLOWED_ORIGINS = [
//   'http://localhost:5173',
//   'https://arenapulse-orcin.vercel.app',
  
// ];

// === CORS (set BEFORE routes)
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // Allow curl/postman/same-origin
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false, // keep false unless you truly send cross-site cookies
  })
);

// Fast preflight
app.options('*', (_req, res) => res.sendStatus(204));

app.use(express.json());

// Static (uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Healthcheck
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// === API Routes
app.use('/api/auth', authRoutes);
app.use('/api/scrims', scrimRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/organizations', orgRoutes); // alias
app.use('/api/promos', promosRoutes);
app.use('/api/tournaments', tournamentsRoutes);

// === Create HTTP server + Socket.IO
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  path: '/socket.io',
  // Allow polling fallback so first connect works even if WS upgrade is flaky/cold start
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 20000,
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization'],
    credentials: false, // set true only if using cookies cross-site
  },
});

// If you have any HTTPS-enforce middleware, make sure it EXEMPTS /socket.io
// Example (uncomment if you enforce https yourself):
// app.use((req, res, next) => {
//   const proto = req.get('x-forwarded-proto');
//   if (proto && proto !== 'https' && !req.path.startsWith('/socket.io')) {
//     return res.redirect('https://' + req.get('host') + req.originalUrl);
//   }
//   next();
// });

// Optional: JWT check on WS handshake (non-blocking)
io.use((socket, next) => {
  try {
    const raw =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization ||
      '';
    const token = raw?.startsWith('Bearer ') ? raw.slice(7) : raw;
    if (token) jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    console.warn('[socket] auth failed:', e?.message || e);
    next(); // allow connect; change to next(new Error('auth failed')) to block
  }
});

io.on('connection', (socket) => {
  console.log('[socket] connected:', socket.id);
  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected:', socket.id, reason);
  });
});

// Share io with routes/controllers if needed
app.set('io', io);

// === Cleanup job (purge scrims > 7 days after end; keep org ratings)
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

mongoose.connection.once('open', () => {
  purgeOldScrims().catch(console.error);
  setInterval(() => purgeOldScrims().catch(console.error), CLEANUP_EVERY_HOURS * 3600 * 1000);
});

// === Boot
mongoose
  .connect(MONGO_URI)
  .then(() => {
    server.keepAliveTimeout = 65000; // avoid premature close behind proxies
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
