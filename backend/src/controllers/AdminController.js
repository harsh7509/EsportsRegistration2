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
    const updates = req.body;

    const promotion = await Promotion.findByIdAndUpdate(
      promoId,
      updates,
      { new: true, runValidators: true }
    )
      .populate('organizationId', 'name organizationInfo avatarUrl')
      .populate('scrimId', 'title date entryFee');

    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

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
