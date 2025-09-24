// backend/src/services/cascadeDelete.js
import mongoose from 'mongoose';

const safe = (name) => {
  try { return mongoose.model(name); }
  catch { return null; }
};

const Room       = safe('Room');
const Booking    = safe('Booking');
const Payment    = safe('Payment');
const Promotion  = safe('Promotion') || safe('Promo');
const OrgRating  = safe('OrgRating');
const Scrim      = safe('Scrim');
const Tournament = safe('Tournament');
const User       = safe('User');

// Helpers
const removeRoomsFor = async (filter, session) => {
  if (Room) await Room.deleteMany(filter).session(session ?? null);
};

const removeBookingsFor = async (filter, session) => {
  if (Booking) await Booking.deleteMany(filter).session(session ?? null);
};

const removePaymentsFor = async (filter, session) => {
  if (Payment) await Payment.deleteMany(filter).session(session ?? null);
};

const removePromotionsFor = async (filter, session) => {
  if (Promotion) await Promotion.deleteMany(filter).session(session ?? null);
};

const pullUserEverywhere = async (userId, session) => {
  const uid = new mongoose.Types.ObjectId(userId);

  // from Tournament participants + registeredCount fix
  if (Tournament) {
    const tList = await Tournament.find({ 'participants.userId': uid })
      .select('_id participants registeredCount').session(session ?? null);

    for (const t of tList) {
      const was = t.participants.length;
      await Tournament.updateOne(
        { _id: t._id },
        { $pull: { participants: { userId: uid } } },
        { runValidators: false }
      ).session(session ?? null);

      if (was > 0) {
        await Tournament.updateOne(
          { _id: t._id, registeredCount: { $gt: 0 } },
          { $inc: { registeredCount: -1 } },
          { runValidators: false }
        ).session(session ?? null);
      }

      // also pull from any groups
      await Tournament.updateOne(
        { _id: t._id },
        { $pull: { 'groups.$[].memberIds': uid } },
        { runValidators: false }
      ).session(session ?? null);

      // and room participants for that tournament
      if (Room) {
        await Room.updateMany(
          { tournamentId: t._id },
          { $pull: { participants: { userId: uid } } }
        ).session(session ?? null);
      }
    }
  }

  // from Scrim participants/bookings/rooms
  if (Scrim) {
    // If your Scrim has participants array:
    await Scrim.updateMany(
      { 'participants.userId': uid },
      { $pull: { participants: { userId: uid } } },
      { runValidators: false }
    ).session(session ?? null);
  }

  if (Booking) await Booking.deleteMany({ userId: uid }).session(session ?? null);
  if (Payment) await Payment.deleteMany({ userId: uid }).session(session ?? null);
  if (OrgRating) await OrgRating.deleteMany({ userId: uid }).session(session ?? null);
};

// ---------- PUBLIC API ----------

// Delete a Tournament + all linked data
export const deleteTournamentCascade = async (tournamentId, session) => {
  const tid = new mongoose.Types.ObjectId(tournamentId);

  // Rooms (group chats), Bookings, Payments, Promotions linked to tournament
  await removeRoomsFor({ tournamentId: tid }, session);
  await removeBookingsFor({ tournamentId: tid }, session);
  await removePaymentsFor({ tournamentId: tid }, session);
  await removePromotionsFor({ tournamentId: tid }, session);

  if (Tournament) await Tournament.deleteOne({ _id: tid }).session(session ?? null);
};

// Delete a Scrim + all linked data
export const deleteScrimCascade = async (scrimId, session) => {
  const sid = new mongoose.Types.ObjectId(scrimId);

  await removeRoomsFor({ scrimId: sid }, session);
  await removeBookingsFor({ scrimId: sid }, session);
  await removePaymentsFor({ scrimId: sid }, session);
  await removePromotionsFor({ scrimId: sid }, session);

  if (Scrim) await Scrim.deleteOne({ _id: sid }).session(session ?? null);
};

// Delete a User (player or organizer) + all linked data
export const deleteUserCascade = async (userId, session) => {
  const uid = new mongoose.Types.ObjectId(userId);

  // If user is an organizer, delete their tournaments & scrims too
  if (Tournament) {
    const ts = await Tournament.find({ organizationId: uid }).select('_id').session(session ?? null);
    for (const t of ts) {
      await deleteTournamentCascade(t._id, session);
    }
  }
  if (Scrim) {
    const ss = await Scrim.find({ organizationId: uid }).select('_id').session(session ?? null);
    for (const s of ss) {
      await deleteScrimCascade(s._id, session);
    }
  }

  // Remove their participation/ratings/bookings/payments etc.
  await pullUserEverywhere(uid, session);

  // Finally, delete the user
  if (User) await User.deleteOne({ _id: uid }).session(session ?? null);
};

// Optional: wrap in transaction if available
export const withTransaction = async (fn) => {
  const conn = mongoose.connection;
  if (!conn?.client?.topology?.s?.options?.replicaSet) {
    // Not a replica set → transactions unsupported. Run directly.
    return fn(null);
  }
  const session = await mongoose.startSession();
  let result;
  await session.withTransaction(async () => {
    result = await fn(session);
  });
  session.endSession();
  return result;
};
