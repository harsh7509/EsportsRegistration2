import mongoose from 'mongoose';
import User from '../models/User.js';
import Scrim from '../models/Scrim.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Promotion from '../models/Promotion.js';
import OrgRating from '../models/OrgRating.js';

const { isValidObjectId } = mongoose; // <-- ADD THIS


/**
 * Normalize organizationInfo so we can accept both
 * { orgName, location, verified } and { name, description, logo, ranking } shapes.
 */
function buildOrgInfoPatch(input = {}) {
  const out = {};

  // New/old keys supported:
  if (typeof input.name === 'string') out.name = input.name;
  if (typeof input.orgName === 'string') out.name = input.orgName; // map UI "orgName" -> schema "name"

  if (typeof input.description === 'string') out.description = input.description;
  if (typeof input.location === 'string') out.location = input.location; // if your schema doesn't yet have it, consider adding it
  if (typeof input.logo === 'string') out.logo = input.logo;

  // numeric
  if (typeof input.ranking === 'number') out.ranking = input.ranking;

  // boolean (some UIs use verified)
  if (typeof input.verified === 'boolean') out.verified = input.verified;

  return out;
}

export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();

    const [
      totalPlayers,
      totalOrgs,
      totalScrims,
      // If your Booking schema doesn't have status, fall back to counting all
      totalBookingsRaw,
      totalRevenueAgg,
      activePromotionsCount,
      totalRatings
    ] = await Promise.all([
      User.countDocuments({ role: 'player' }),
      User.countDocuments({ role: 'organization' }),
      Scrim.countDocuments(),
      Booking.countDocuments(), // if you do have a status: { status: 'active' }
      Payment.aggregate([
        { $match: { status: { $in: ['completed', 'succeeded', 'paid'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Promotion.countDocuments({
        $or: [
          { isActive: true },
          { endDate: { $gte: now } },
          { endDate: { $exists: false } }
        ]
      }),
      OrgRating.countDocuments()
    ]);

    const revenue = Array.isArray(totalRevenueAgg) && totalRevenueAgg[0]?.total ? totalRevenueAgg[0].total : 0;

    res.json({
      totalUsers: totalPlayers,       // keep original name in your UI
      totalOrgs,
      totalScrims,
      totalBookings: totalBookingsRaw,
      revenue,
      activePromotions: activePromotionsCount,
      totalRatings
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard stats' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const filter = {};
    if (role && role !== 'all') filter.role = role;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      User.countDocuments(filter)
    ]);

    res.json({
      users,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['player', 'organization', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Optional: prevent self-demotion (comment out if you want to allow)
    if (String(req.user._id) === String(userId) && req.user.role === 'admin' && role !== 'admin') {
      return res.status(400).json({ message: 'Admins cannot change their own role out of admin' });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ user, message: 'User role updated successfully' });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Server error updating user role' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin users' });
    }

    // ⚠️ Consider soft-delete or cascades (scrims, bookings, ratings, promotions)
    await User.findByIdAndDelete(userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
};

export const updateUserProfileAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, avatarUrl, organizationInfo, playerInfo } = req.body;

    const update = {};
    if (typeof name === 'string' && name.trim()) update.name = name.trim();
    if (typeof avatarUrl === 'string' && avatarUrl.trim()) update.avatarUrl = avatarUrl.trim();

    if (organizationInfo && typeof organizationInfo === 'object') {
      update.organizationInfo = {
        ...((await User.findById(userId))?.organizationInfo?.toObject?.() || {}),
        ...buildOrgInfoPatch(organizationInfo)
      };
    }

    if (playerInfo && typeof playerInfo === 'object') {
      update.playerInfo = {
        ...((await User.findById(userId))?.playerInfo?.toObject?.() || {}),
        ...playerInfo
      };
    }

    const user = await User.findByIdAndUpdate(
      userId,
      update,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ user, message: 'User updated successfully' });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ message: 'Server error updating user' });
  }
};



export const createPromotion = async (req, res) => {
  try {
    const {
      title,
      description,
      imageUrl,
      organizationId,
      scrimId,
      tournamentId,
      type,
      priority,
      endDate,
    } = req.body;

    if (!organizationId || !mongoose.isValidObjectId(organizationId)) {
      return res.status(400).json({ message: 'Invalid or missing organizationId' });
    }

    const payload = {
      title,
      description,
      imageUrl,
      organizationId,
      type: type || 'scrim',
      priority: Number.isFinite(+priority) ? +priority : 1,
      createdBy: req.user?._id,
      isActive: true,
    };

    if (scrimId && typeof scrimId === 'string' && mongoose.isValidObjectId(scrimId)) {
      payload.scrimId = scrimId;
    }
    if (tournamentId && typeof tournamentId === 'string' && mongoose.isValidObjectId(tournamentId)) {
      payload.tournamentId = tournamentId;
    }

    if (endDate) {
      const d = new Date(endDate);
      if (!isNaN(d.getTime())) payload.endDate = d;
    }

    const promotion = await Promotion.create(payload);

    await promotion.populate('organizationId', 'name organizationInfo avatarUrl');
    await promotion.populate('scrimId', 'title date entryFee');
    await promotion.populate('tournamentId', 'title startAt entryFee');
    await promotion.populate('createdBy', 'name');

    res.status(201).json({ promotion });
  } catch (error) {
    console.error('Create promotion error:', error?.message || error);
    if (error?.name === 'CastError') {
      return res.status(400).json({ message: `Invalid ${error.path}: ${error.value}` });
    }
    res.status(500).json({ message: 'Server error creating promotion' });
  }
};


export const getPromotions = async (req, res) => {
  try {
    const { page = 1, limit = 10, active } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const now = new Date();
    const filter = {};
    if (active === 'true') {
      filter.$or = [
        { isActive: true },
        { endDate: { $gte: now } },
        { endDate: { $exists: false } }
      ];
    }

    const [promotions, total] = await Promise.all([
      Promotion.find(filter)
        .populate('organizationId', 'name organizationInfo avatarUrl') // name + organizationInfo.location/verified + avatarUrl
        .populate('scrimId', 'title date timeSlot capacity entryFee participants') // include timeSlot too
        .populate('tournamentId', 'title startAt entryFee capacity')

        .populate('createdBy', 'name')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Promotion.countDocuments(filter)
    ]);

    res.json({
      promotions,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    });
  } catch (error) {
    console.error('Get promotions error:', error);
    res.status(500).json({ message: 'Server error fetching promotions' });
  }
};


export const updatePromotion = async (req, res) => {
  try {
    const { promoId } = req.params;
    const u = { ...req.body };

    if (u.type === 'tournament') {
      u.scrimId = undefined;
    } else if (u.type === 'scrim') {
      u.tournamentId = undefined;
    }

    // Coerce endDate if sent
    if (u.endDate) {
      const d = new Date(u.endDate);
      if (isNaN(d)) return res.status(400).json({ message: 'Invalid endDate' });
      u.endDate = d;
    }

    const promotion = await Promotion.findByIdAndUpdate(promoId, u, { new: true, runValidators: true })
      .populate('organizationId', 'name organizationInfo avatarUrl')
      .populate('scrimId', 'title date entryFee')
      .populate('tournamentId', 'title startAt entryFee');

    if (!promotion) return res.status(404).json({ message: 'Promotion not found' });
    res.json({ promotion });
  } catch (error) {
    console.error('Update promotion error:', error);
    res.status(500).json({ message: 'Server error updating promotion' });
  }
};


export const deletePromotion = async (req, res) => {
  try {
    const { promoId } = req.params;
    await Promotion.findByIdAndDelete(promoId);
    res.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    console.error('Delete promotion error:', error);
    res.status(500).json({ message: 'Server error deleting promotion' });
  }
};

export const trackPromoClick = async (req, res) => {
  try {
    const { promoId } = req.params;
    await Promotion.findByIdAndUpdate(promoId, { $inc: { clickCount: 1 } });
    res.json({ message: 'Click tracked' });
  } catch (error) {
    console.error('Track promo click error:', error);
    res.status(500).json({ message: 'Server error tracking click' });
  }
};


// --- NEW: deep lists with pagination & quick filters ---
export const listScrims = async (req, res) => {
  try {
    const { page=1, limit=20, search, creatorId } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const q = {};
    if (search) q.title = new RegExp(search, 'i');
    if (creatorId && isValidObjectId(creatorId)) q.createdBy = creatorId;

    const [rawItems, total] = await Promise.all([
  Scrim.find(q)
    .populate('createdBy','name avatarUrl organizationInfo')
    .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
  Scrim.countDocuments(q)
]);
const items = rawItems.map(s => ({
  ...s,
  startAt: s?.timeSlot?.start || s?.date || null, // single canonical field for UI
}));

    res.json({ items, total, page: +page, totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (e) {
    console.error('listScrims error:', e);
    res.status(500).json({ message: 'Server error fetching scrims' });
  }
};

export const listTournaments = async (req, res) => {
  try {
    const { page=1, limit=20, search, orgId } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const q = {};
    if (search) q.title = new RegExp(search, 'i');
    if (orgId && isValidObjectId(orgId)) q.organizationId = orgId;

    const Tournament = (await import('../models/Tournament.js')).default;
    const [items, total] = await Promise.all([
      Tournament.find(q)
        .populate('organizationId','name avatarUrl organizationInfo')
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Tournament.countDocuments(q)
    ]);

    res.json({ items, total, page: +page, totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (e) {
    console.error('listTournaments error:', e);
    res.status(500).json({ message: 'Server error fetching tournaments' });
  }
};

export const listBookings = async (req, res) => {
  try {
    const { page=1, limit=20, userId, scrimId } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const q = {};
    if (userId && isValidObjectId(userId)) q.userId = userId;
    if (scrimId && isValidObjectId(scrimId)) q.scrimId = scrimId;

    const [items, total] = await Promise.all([
      Booking.find(q)
        .populate('userId','name email')
        .populate('scrimId','title date timeSlot')
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Booking.countDocuments(q)
    ]);

    res.json({ items, total, page:+page, totalPages: Math.ceil(total/parseInt(limit)) });
  } catch (e) {
    console.error('listBookings error:', e);
    res.status(500).json({ message: 'Server error fetching bookings' });
  }
};

export const listPayments = async (req, res) => {
  try {
    const { page=1, limit=20, status } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const q = {};
    if (status) q.status = status;

    const [items, total] = await Promise.all([
      Payment.find(q)
        .populate('userId','name email')
        .populate('scrimId','title')
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Payment.countDocuments(q)
    ]);

    res.json({ items, total, page:+page, totalPages: Math.ceil(total/parseInt(limit)) });
  } catch (e) {
    console.error('listPayments error:', e);
    res.status(500).json({ message: 'Server error fetching payments' });
  }
};

export const listOrgRatings = async (req, res) => {
  try {
    const { page=1, limit=20, orgId } = req.query;
    const skip = (parseInt(page)-1)*parseInt(limit);
    const q = {};
    if (orgId && isValidObjectId(orgId)) q.organizationId = orgId;

    const [items, total] = await Promise.all([
      OrgRating.find(q)
        .populate('organizationId','name')
        .populate('playerId','name email')
        .populate('scrimId','title')
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      OrgRating.countDocuments(q)
    ]);

    res.json({ items, total, page:+page, totalPages: Math.ceil(total/parseInt(limit)) });
  } catch (e) {
    console.error('listOrgRatings error:', e);
    res.status(500).json({ message: 'Server error fetching ratings' });
  }
};

// --- quick org verify toggle & ranking update ---
export const setOrgVerified = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) return res.status(400).json({ message: 'Invalid userId' });

    const { verified } = req.body;
    const user = await User.findById(userId);
    if (!user || user.role !== 'organization') return res.status(404).json({ message: 'Org not found' });

    user.organizationInfo = {
      ...(user.organizationInfo?.toObject?.() || user.organizationInfo || {}),
      verified: Boolean(verified)
    };
    await user.save();
    res.json({ message: 'Verification updated', user: { _id: user._id, organizationInfo: user.organizationInfo } });
  } catch (e) {
    console.error('setOrgVerified error:', e);
    res.status(500).json({ message: 'Failed to update verification' });
  }
};

export const setOrgRanking = async (req, res) => {
  try {
    const { userId } = req.params;
    const { ranking } = req.body;
    if (!isValidObjectId(userId)) return res.status(400).json({ message: 'Invalid userId' });

    const user = await User.findById(userId);
    if (!user || user.role !== 'organization') return res.status(404).json({ message: 'Org not found' });

    const r = Number(ranking);
    user.organizationInfo = {
      ...(user.organizationInfo?.toObject?.() || user.organizationInfo || {}),
      ranking: Number.isFinite(r) ? r : 1000
    };
    await user.save();
    res.json({ message: 'Ranking updated', user: { _id: user._id, organizationInfo: user.organizationInfo } });
  } catch (e) {
    console.error('setOrgRanking error:', e);
    res.status(500).json({ message: 'Failed to update ranking' });
  }
};

// --- ADMIN SCRIM CONTROLLERS ---

// backend/src/controllers/AdminController.js
export const adminUpdateScrim = async (req, res) => {
  try {
    const { scrimId } = req.params;
    if (!isValidObjectId(scrimId)) return res.status(400).json({ message: 'Invalid scrimId' });

    const curr = await Scrim.findById(scrimId);
    if (!curr) return res.status(404).json({ message: 'Scrim not found' });

    const {
      title, description, platform, game, entryFee, capacity, status, bannerUrl,
      date, startAt, timeSlot
    } = req.body || {};

    const set = {};
    if (typeof title === 'string') set.title = title.trim();
    if (typeof description === 'string') set.description = description.trim();
    if (typeof platform === 'string') set.platform = platform.trim();
    if (typeof game === 'string') set.game = game.trim();
    if (entryFee != null) set.entryFee = Number(entryFee) || 0;
    if (capacity != null) set.capacity = Math.max(0, Number(capacity) || 0);
    if (typeof status === 'string') set.status = status;
    if (typeof bannerUrl === 'string') set.bannerUrl = bannerUrl.trim();

    // figure out new start/end while keeping current values as default
    let newStart = curr.timeSlot?.start || curr.date || null;
    let newEnd   = curr.timeSlot?.end   || null;

    if (startAt) {
      const s = new Date(startAt);
      if (isNaN(s)) return res.status(400).json({ message: 'Invalid startAt' });
      newStart = s;
    }
    if (date) {
      const d = new Date(date);
      if (isNaN(d)) return res.status(400).json({ message: 'Invalid date' });
      newStart = d;
    }
    if (timeSlot && typeof timeSlot === 'object') {
      if (timeSlot.start) {
        const s = new Date(timeSlot.start);
        if (isNaN(s)) return res.status(400).json({ message: 'Invalid timeSlot.start' });
        newStart = s;
      }
      if (timeSlot.end) {
        const e = new Date(timeSlot.end);
        if (isNaN(e)) return res.status(400).json({ message: 'Invalid timeSlot.end' });
        newEnd = e;
      }
    }

    if (newEnd && newStart && newEnd <= newStart) {
      return res.status(400).json({ message: 'timeSlot.end must be after start' });
    }

    // set each field separately so we don’t wipe the subdocument
    if (newStart) {
      set.date = newStart;                // keep legacy field in sync
      set['timeSlot.start'] = newStart;
    }
    if (newEnd) {
      set['timeSlot.end'] = newEnd;
    }

    const updated = await Scrim.findByIdAndUpdate(
      scrimId,
      { $set: set },
      { new: true, runValidators: true, context: 'query' }
    ).populate('createdBy', 'name organizationInfo avatarUrl').lean();

    if (set.capacity != null) {
      const cnt = Array.isArray(updated.participants) ? updated.participants.length : 0;
      if (set.capacity < cnt) {
        return res.status(200).json({
          scrim: updated,
          warning: `Capacity (${set.capacity}) is below current participants (${cnt}).`
        });
      }
    }

    res.json({ scrim: updated });
  } catch (e) {
    console.error('adminUpdateScrim error:', e);
    res.status(500).json({ message: 'Server error updating scrim' });
  }
};



export const adminAddPlayerToScrim = async (req, res) => {
  try {
    const { scrimId } = req.params;
    if (!isValidObjectId(scrimId)) return res.status(400).json({ message: 'Invalid scrimId' });

    // Accept either an ID or an email, plus optional meta
    const {
      playerId: bodyPlayerId,
      userId, // allow either name
      email,
      ign,
      phone,
      teamName,
    } = req.body || {};

    let player = null;

    // 1) Resolve player
    if (bodyPlayerId || userId) {
      const pid = bodyPlayerId || userId;
      if (!isValidObjectId(pid)) return res.status(400).json({ message: 'Invalid playerId' });
      player = await User.findById(pid);
    } else if (email) {
      player = await User.findOne({ email: String(email).trim().toLowerCase() });
    } else {
      return res.status(400).json({ message: 'Provide playerId or email' });
    }

    if (!player) return res.status(404).json({ message: 'Player not found' });
    if (player.role !== 'player') return res.status(400).json({ message: 'User is not a player' });

    // 2) Fetch scrim
    const scrim = await Scrim.findById(scrimId);
    if (!scrim) return res.status(404).json({ message: 'Scrim not found' });

    // 3) capacity & duplicate check
    const participants = (scrim.participants || []).map(String);
    if (participants.includes(String(player._id))) {
      // Upsert meta even if player already in
      const metaIdx = (scrim.participantsMeta || []).findIndex(m => String(m.playerId) === String(player._id));
      const newMeta = { playerId: player._id, ign, phone, teamName };
      if (metaIdx >= 0) {
        scrim.participantsMeta[metaIdx] = { ...scrim.participantsMeta[metaIdx].toObject?.() || scrim.participantsMeta[metaIdx], ...newMeta };
      } else {
        scrim.participantsMeta = [...(scrim.participantsMeta || []), newMeta];
      }
      await scrim.save();
      const populated = await Scrim.findById(scrimId).populate('participants', 'name email avatarUrl').lean();
      return res.status(200).json({ message: 'Player already in scrim (meta updated)', scrim: populated });
    }

    const cap = Number(scrim.capacity || 0);
    if (cap > 0 && participants.length >= cap) {
      return res.status(400).json({ message: 'Scrim is full' });
    }

    // 4) Add participant + meta
    scrim.participants = [...participants, player._id];
    const newMeta = { playerId: player._id, ign, phone, teamName };
    scrim.participantsMeta = [...(scrim.participantsMeta || []), newMeta];
    await scrim.save();

    // 5) Create a booking record (optional)
    await Booking.create({
      userId: player._id,
      scrimId: scrim._id,
      status: 'confirmed',
      createdAt: new Date(),
    });

    const populated = await Scrim.findById(scrimId)
      .populate('participants', 'name email avatarUrl')
      .lean();

    return res.status(201).json({ message: 'Player added', scrim: populated });
  } catch (e) {
    console.error('adminAddPlayerToScrim error:', e);
    return res.status(500).json({ message: 'Server error adding player' });
  }
};


export const adminRemovePlayerFromScrim = async (req, res) => {
  try {
    const { scrimId, playerId } = req.params;
    if (!isValidObjectId(scrimId)) return res.status(400).json({ message: 'Invalid scrimId' });
    if (!isValidObjectId(playerId)) return res.status(400).json({ message: 'Invalid playerId' });

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) return res.status(404).json({ message: 'Scrim not found' });

    const before = scrim.participants?.length || 0;
    scrim.participants = (scrim.participants || []).filter(id => String(id) !== String(playerId));
    scrim.participantsMeta = (scrim.participantsMeta || []).filter(m => String(m.playerId) !== String(playerId));
    await scrim.save();

    await Booking.deleteMany({ userId: playerId, scrimId });

    const populated = await Scrim.findById(scrimId)
      .populate('participants', 'name email avatarUrl')
      .lean();

    return res.json({
      message: before === (populated.participants?.length || 0) ? 'Player was not in scrim' : 'Player removed',
      scrim: populated
    });
  } catch (e) {
    console.error('adminRemovePlayerFromScrim error:', e);
    return res.status(500).json({ message: 'Server error removing player' });
  }
};

export const adminDeleteScrim = async (req, res) => {
  try {
    const { scrimId } = req.params;
    if (!isValidObjectId(scrimId)) return res.status(400).json({ message: 'Invalid scrimId' });

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) return res.status(404).json({ message: 'Scrim not found' });

    // Cascade: delete bookings + promotions that reference this scrim
    await Promise.all([
      Booking.deleteMany({ scrimId }),
      Promotion.deleteMany({ scrimId }),
      // Optional: cancel pending payments only (keep completed for audit)
      Payment.updateMany(
        { scrimId, status: { $in: ['pending', 'created'] } },
        { $set: { status: 'cancelled' } }
      ),
    ]);

    await Scrim.findByIdAndDelete(scrimId);

    return res.json({ message: 'Scrim deleted' });
  } catch (e) {
    console.error('adminDeleteScrim error:', e);
    return res.status(500).json({ message: 'Server error deleting scrim' });
  }
};

// (Optional) List participants for a scrim
export const adminListScrimParticipants = async (req, res) => {
  try {
    const { scrimId } = req.params;
    if (!isValidObjectId(scrimId)) return res.status(400).json({ message: 'Invalid scrimId' });

    const scrim = await Scrim.findById(scrimId)
      .populate('participants', 'name email avatarUrl')
      .lean();

    if (!scrim) return res.status(404).json({ message: 'Scrim not found' });

    res.json({ participants: scrim.participants || [] });
  } catch (e) {
    console.error('adminListScrimParticipants error:', e);
    res.status(500).json({ message: 'Server error listing participants' });
  }
};
