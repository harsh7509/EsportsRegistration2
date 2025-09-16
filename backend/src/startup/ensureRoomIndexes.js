import mongoose from 'mongoose';

export default async function ensureRoomIndexes() {
  const coll = mongoose.connection.db.collection('rooms');

  try {
    const idx = await coll.indexExists('scrimId_1');
    if (idx) {
      // Try to read index info to see if it's unique
      const infos = await coll.indexes();
      const scrimIdx = infos.find(i => i.name === 'scrimId_1');
      if (scrimIdx?.unique) {
        await coll.dropIndex('scrimId_1');
        await coll.createIndex({ scrimId: 1 }, { sparse: true }); // non-unique
        console.log('[ensureRoomIndexes] dropped unique scrimId_1 and recreated sparse non-unique');
      }
    }
  } catch (e) {
    console.warn('[ensureRoomIndexes] index tweak skipped:', e.message);
  }

  // make sure these exist too (safe even if they already exist)
  try { await coll.createIndex({ tournamentId: 1 }); } catch {}
  try { await coll.createIndex({ 'participants.userId': 1 }); } catch {}
}
