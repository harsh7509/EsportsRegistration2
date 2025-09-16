// backend/src/controllers/OrgController.js
import mongoose from 'mongoose';
import User from '../models/User.js';
import Scrim from '../models/Scrim.js';
import OrgRating from '../models/OrgRating.js';

/**
 * GET /api/organizations/rankings
 * Returns paginated org rankings with avatarUrl and scrimCount included.
 * Response shape kept compatible with your Rankings page.
 */
export const getOrgRankings = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      User.find({ role: 'organization' })
        .select('name avatarUrl organizationInfo createdAt')
        .sort({ 'organizationInfo.ranking': -1 }) // or whatever rank metric
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({ role: 'organization' })
    ]);

    // Attach scrimCount for each org
    const orgIds = items.map(o => o._id);
    const counts = await Scrim.aggregate([
      { $match: { createdBy: { $in: orgIds } } },
      { $group: { _id: '$createdBy', count: { $sum: 1 } } }
    ]);

    const mapCounts = counts.reduce((m, c) => (m[c._id.toString()] = c.count, m), {});
    const organizations = items.map(o => ({
      _id: o._id,
      name: o.name,
      avatarUrl: o.avatarUrl,                       // <- IMPORTANT
      organizationInfo: o.organizationInfo || {},
      scrimCount: mapCounts[o._id.toString()] || 0,
      // placeholders so the UI renders stars:
      averageRating: 0,
      totalRatings: 0,
      categoryAverages: { organization: 0, communication: 0, fairness: 0, experience: 0 },
    }));

    res.json({ items: organizations, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    console.error('getOrgRankings error:', e);
    res.status(500).json({ message: 'Failed to load rankings' });
  }
};


/**
 * GET /api/organizations/:orgId
 * Returns organization profile with avatarUrl + scrims + ratings
 * Response kept compatible with your OrganizationProfile.jsx:
 * {
 *   organization,
 *   averageRating, totalRatings, categoryAverages,
 *   ratings: [...], scrims: [...]
 * }
 */
export const getOrgDetails = async (req, res) => {
  try {
    const { orgId } = req.params;

    const organization = await User.findById(orgId)
      .select('name email role avatarUrl organizationInfo createdAt')
      .lean();

    if (!organization || organization.role !== 'organization') {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // scrims created by this organization
    const scrims = await Scrim.find({ createdBy: orgId })
      .select('_id title game entryFee status date timeSlot capacity participants createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // If you store org ratings in a separate collection, fetch & compute.
    // Placeholders below so your UI still renders:
    const ratings = []; // or await OrgRating.find({ orgId }).populate('playerId scrimId').lean();
    const averageRating = 0;
    const totalRatings = 0;
    const categoryAverages = {
      organization: 0,
      communication: 0,
      fairness: 0,
      experience: 0,
    };

    return res.json({
      organization: {
        _id: organization._id,
        name: organization.name,
        email: organization.email,
        role: organization.role,
        avatarUrl: organization.avatarUrl,          // <- IMPORTANT
        organizationInfo: organization.organizationInfo,
        createdAt: organization.createdAt,
      },
      scrims,
      ratings,
      averageRating,
      totalRatings,
      categoryAverages,
    });
  } catch (e) {
    console.error('getOrgDetails error:', e);
    res.status(500).json({ message: 'Failed to load organization' });
  }
};

/**
 * POST /api/organizations/:orgId/rate
 * Body: { rating, comment, categories, scrimId? }
 * Player only.
 */
export const rateOrganization = async (req, res) => {
  try {
    const orgId = req.params.orgId;
    const playerId = req.user?._id;
    const { rating, comment, categories, scrimId } = req.body;

    if (!playerId) return res.status(401).json({ message: 'Unauthorized' });
    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ message: 'Invalid org id' });
    }
    const org = await User.findById(orgId).select('_id role');
    if (!org || org.role !== 'organization') {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const doc = await OrgRating.create({
      orgId: org._id,
      playerId,
      rating: Math.max(1, Math.min(5, Number(rating) || 0)),
      comment: comment || '',
      categories: {
        organization: Math.max(1, Math.min(5, Number(categories?.organization) || 0)),
        communication: Math.max(1, Math.min(5, Number(categories?.communication) || 0)),
        fairness: Math.max(1, Math.min(5, Number(categories?.fairness) || 0)),
        experience: Math.max(1, Math.min(5, Number(categories?.experience) || 0)),
      },
      scrimId: mongoose.isValidObjectId(scrimId) ? scrimId : undefined,
    });

    return res.json({ message: 'Rating saved', rating: doc });
  } catch (err) {
    console.error('rateOrganization error:', err);
    return res.status(500).json({ message: 'Failed to rate organization' });
  }
};
