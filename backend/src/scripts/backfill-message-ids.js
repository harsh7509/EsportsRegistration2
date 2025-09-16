// scripts/backfill-message-ids.js
import mongoose from 'mongoose';
import Room from '../src/models/Room.js'; // <-- path अपने प्रोजेक्ट के हिसाब से

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/yourdb';

(async () => {
  await mongoose.connect(MONGO);
  const rooms = await Room.find({}, { messages: 1 }).lean();

  let changed = 0;
  for (const r of rooms) {
    const msgs = Array.isArray(r.messages) ? r.messages : [];
    if (!msgs.some(m => !m || !m._id)) continue;

    const updated = msgs.map(m => {
      if (!m) return m;
      return m._id ? m : { ...m, _id: new mongoose.Types.ObjectId() };
    });

    await Room.updateOne({ _id: r._id }, { $set: { messages: updated } });
    changed++;
  }

  console.log(`Backfilled rooms: ${changed}`);
  await mongoose.disconnect();
  process.exit(0);
})();
