import Scrim from "../models/Scrim.js";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import Payment from "../models/Payment.js";
import Promotion from "../models/Promotion.js";

const CLEANUP_EVERY_HOURS = Number(process.env.CLEANUP_EVERY_HOURS || 24);

export async function purgeOldScrims() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    const oldScrims = await Scrim.find({ "timeSlot.end": { $lt: sevenDaysAgo } }).select("_id");
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
  } catch (err) {
    console.error("❌ Error during scrim cleanup:", err.message);
  }
}

export function scheduleScrimCleanup() {
  // Run once on startup
  purgeOldScrims().catch(console.error);

  // Schedule cleanup every X hours
  setInterval(() => purgeOldScrims().catch(console.error), CLEANUP_EVERY_HOURS * 3600 * 1000);
}
