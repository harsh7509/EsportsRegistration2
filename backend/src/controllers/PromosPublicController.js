import Promotion from '../models/Promotion.js';

export const listActivePromos = async (_req, res) => {
  try {
    const now = new Date();

    const promotions = await Promotion.find({
      $or: [
        { isActive: true },
        { endDate: { $gte: now } },
        { endDate: { $exists: false } },
      ],
    })
      .populate('organizationId', 'name organizationInfo avatarUrl')
      .populate('scrimId', 'title date timeSlot capacity entryFee participants')
      .populate('tournamentId', 'title startAt entryFee bannerUrl') // ← add
      .sort({ priority: -1, createdAt: -1 });

    res.json({ promotions });
  } catch (error) {
    console.error('Public promos fetch error:', error?.message || error);
    res.status(500).json({ message: 'Server error fetching promotions' });
  }
};
