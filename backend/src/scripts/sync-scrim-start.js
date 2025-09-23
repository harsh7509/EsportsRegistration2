// scripts/syncScrimStart.js
import mongoose from 'mongoose';
import Scrim from '../models/Scrim.js';

await mongoose.connect(process.env.MONGO_URI);

const cursor = Scrim.find({}).cursor();
for await (const s of cursor) {
  const start = s?.timeSlot?.start || s?.date || null;
  if (!start) continue;
  let changed = false;
  if (!s.date || +new Date(s.date) !== +new Date(start)) {
    s.date = start; changed = true;
  }
  if (!s.timeSlot || !s.timeSlot.start || +new Date(s.timeSlot.start) !== +new Date(start)) {
    s.timeSlot = { ...(s.timeSlot?.toObject?.() || s.timeSlot || {}), start };
    changed = true;
  }
  if (changed) await s.save();
}

console.log('Done syncing');
process.exit(0);
