// backend/src/controllers/OrgController.js
import mongoose from 'mongoose';
import User from '../models/User.js';
import Scrim from '../models/Scrim.js';
import OrgRating from '../models/OrgRating.js';
import cloudinary from "../utils/cloudinary.js";

/**
 * GET /api/organizations/rankings
 */
// controllers/OrgController.js
export const getOrgRankings = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: { role: 'organization' } },

      // Ratings aggregate per org
      {
        $lookup: {
          from: 'orgratings',
          let: { orgId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$organizationId', '$$orgId'] } } },
            {
              $group: {
                _id: '$organizationId',
                averageRating: { $avg: '$rating' },
                totalRatings: { $sum: 1 },
                orgAvg: { $avg: '$categories.organization' },
                commAvg: { $avg: '$categories.communication' },
                fairAvg: { $avg: '$categories.fairness' },
                expAvg: { $avg: '$categories.experience' },
              }
            }
          ],
          as: 'ratingAgg'
        }
      },

      // Scrim count for each org
      {
        $lookup: {
          from: 'scrims',
          localField: '_id',
          foreignField: 'createdBy',
          as: 'scrims'
        }
      },

      // Flatten + default zeros
      {
        $addFields: {
          averageRating: { $ifNull: [{ $arrayElemAt: ['$ratingAgg.averageRating', 0] }, 0] },
          totalRatings: { $ifNull: [{ $arrayElemAt: ['$ratingAgg.totalRatings', 0] }, 0] },
          categoryAverages: {
            organization: { $ifNull: [{ $arrayElemAt: ['$ratingAgg.orgAvg', 0] }, 0] },
            communication: { $ifNull: [{ $arrayElemAt: ['$ratingAgg.commAvg', 0] }, 0] },
            fairness: { $ifNull: [{ $arrayElemAt: ['$ratingAgg.fairAvg', 0] }, 0] },
            experience: { $ifNull: [{ $arrayElemAt: ['$ratingAgg.expAvg', 0] }, 0] },
          },
          scrimCount: { $size: { $ifNull: ['$scrims', []] } }
        }
      },

      // Keep only needed fields
      {
        $project: {
          _id: 1,
          name: 1,
          avatarUrl: 1,
          organizationInfo: 1,
          createdAt: 1,
          averageRating: 1,
          totalRatings: 1,
          categoryAverages: 1,
          scrimCount: 1,
        }
      },

      // True "ranking" sort
      {
        $sort: {
          averageRating: -1,
          totalRatings: -1,
          scrimCount: -1,
          createdAt: -1
        }
      },

      // Pagination + total count in one go
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'count' }]
        }
      }
    ];

    const result = await mongoose.model('User').aggregate(pipeline);
    const items = result?.[0]?.items || [];
    const totalCount = result?.[0]?.total?.[0]?.count || 0;

    return res.json({
      items,
      totalPages: Math.max(1, Math.ceil(totalCount / limit))
    });
  } catch (e) {
    console.error('getOrgRankings error:', e);
    res.status(500).json({ message: 'Failed to load rankings' });
  }
};


/**
 * GET /api/organizations/:orgId
 * Org profile + scrims + ratings summary
 */
export const getOrgDetails = async (req, res) => {
  try {
    const { orgId } = req.params;
    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ message: 'Invalid org id' });
    }

    const organization = await User.findById(orgId)
      .select('name email role avatarUrl organizationInfo createdAt')
      .lean();
    if (!organization || organization.role !== 'organization') {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const scrims = await Scrim.find({ createdBy: orgId })
      .select('_id title game entryFee status date timeSlot capacity participants createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Ratings summary (lightweight)
    const [summary] = await OrgRating.aggregate([
      { $match: { organizationId: new mongoose.Types.ObjectId(orgId) } },
      {
        $group: {
          _id: '$organizationId',
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          orgAvg: { $avg: '$categories.organization' },
          commAvg: { $avg: '$categories.communication' },
          fairAvg: { $avg: '$categories.fairness' },
          expAvg: { $avg: '$categories.experience' },
        }
      }
    ]);

    const averageRating = summary?.averageRating || 0;
    const totalRatings = summary?.totalRatings || 0;
    const categoryAverages = {
      organization: summary?.orgAvg || 0,
      communication: summary?.commAvg || 0,
      fairness: summary?.fairAvg || 0,
      experience: summary?.expAvg || 0,
    };

    return res.json({
      organization: {
        _id: organization._id,
        name: organization.name,
        email: organization.email,
        role: organization.role,
        avatarUrl: organization.avatarUrl,
        organizationInfo: organization.organizationInfo,
        createdAt: organization.createdAt,
      },
      scrims,
      ratings: [], // (optional) चाहें तो latest ratings populate कर सकते हैं
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
 * Body: { rating, comment, categories, scrimId }
 * Requires: player participated in that scrim (of that org).
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
    if (!mongoose.isValidObjectId(scrimId)) {
      return res.status(400).json({ message: 'scrimId is required' });
    }

    const org = await User.findById(orgId).select('_id role');
    if (!org || org.role !== 'organization') {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Verify scrim belongs to org & player participated
    const scrim = await Scrim.findOne({ _id: scrimId, createdBy: orgId })
      .select('_id participants status')
      .lean();
    if (!scrim) {
      return res.status(404).json({ message: 'Scrim not found for this organization' });
    }
    const played = (scrim.participants || []).some(p => p.toString() === playerId.toString());
    if (!played) {
      return res.status(403).json({ message: 'Only participants can rate organizations' });
    }

    // (Optional) gate by completion:
    // if (scrim.status !== 'completed') {
    //   return res.status(400).json({ message: 'Can only rate after scrim completion' });
    // }

    // Upsert so user can edit their rating instead of duplicate error
    const doc = await OrgRating.findOneAndUpdate(
      { organizationId: org._id, playerId, scrimId },
      {
        $set: {
          organizationId: org._id,
          playerId,
          scrimId,
          rating: Math.max(1, Math.min(5, Number(rating) || 0)),
          comment: comment || '',
          categories: {
            organization: Math.max(1, Math.min(5, Number(categories?.organization) || 0)),
            communication: Math.max(1, Math.min(5, Number(categories?.communication) || 0)),
            fairness: Math.max(1, Math.min(5, Number(categories?.fairness) || 0)),
            experience: Math.max(1, Math.min(5, Number(categories?.experience) || 0)),
          },
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ message: 'Rating saved', rating: doc });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'You already rated this scrim for this organization' });
    }
    console.error('rateOrganization error:', err);
    return res.status(500).json({ message: 'Failed to rate organization' });
  }
};
