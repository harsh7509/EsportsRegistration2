// backend/src/controllers/profileController.js
import User from '../models/User.js';
import cloudinary from '../utils/cloudinary.js';
import fs from 'fs';
import path from 'path';

// Bookings/Scrims (for "My Bookings")
import Booking from '../models/Booking.js';
import Scrim from '../models/Scrim.js';

/**
 * POST /api/profile/avatar
 * Upload a new avatar from device storage (multipart) or Cloudinary if configured.
 * Responds with: { avatarUrl }
 */
export const updateProfileImage = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // If Cloudinary is configured, stream upload there
    if (cloudinary?.config && cloudinary.config().api_key) {
      const streamifier = (await import('streamifier')).default;
      const uploadStream = (buffer) =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'esports_avatars' },
            (error, result) => (error ? reject(error) : resolve(result))
          );
          streamifier.createReadStream(buffer).pipe(stream);
        });

      const result = await uploadStream(req.file.buffer);
      const avatarUrl = result.secure_url;
      await User.findByIdAndUpdate(userId, { avatarUrl }, { new: true });
      return res.json({ avatarUrl });
    }

    // Local fallback: save under backend /uploads/avatars and serve from BACKEND origin
    const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const ext = (req.file.mimetype && req.file.mimetype.split('/')[1]) || 'jpg';
    const filename = `${userId}-${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filepath, req.file.buffer);

    // Build public URL from backend host (e.g. http://localhost:4000)
    const base = `${req.protocol}://${req.get('host')}`;
    const avatarUrl = `${base}/uploads/avatars/${filename}`;

    await User.findByIdAndUpdate(userId, { avatarUrl }, { new: true });
    return res.json({ avatarUrl });
  } catch (error) {
    console.error('Update profile image error:', error);
    res.status(500).json({ message: 'Failed to update profile image' });
  }
};

/**
 * GET /api/profile/bookings
 * List bookings for the authenticated player, with populated scrim + org.
 * Responds with: { items: [{ _id, paid, createdAt, playerInfo, scrim }] }
 */
export const getMyBookings = async (req, res) => {
  try {
    const playerId = req.user?._id;
    if (!playerId) return res.status(401).json({ message: 'Unauthorized' });

    const bookings = await Booking.find({ playerId })
      .populate({
        path: 'scrimId',
        select: 'title game date timeSlot capacity entryFee participants createdBy',
        populate: { path: 'createdBy', select: 'name role avatarUrl' }
      })
      .sort({ createdAt: -1 });

    const items = bookings.map((b) => ({
      _id: b._id,
      paid: b.paid,
      createdAt: b.createdAt,
      playerInfo: b.playerInfo,
      scrim: b.scrimId, // populated scrim document
    }));

    return res.json({ items });
  } catch (err) {
    console.error('getMyBookings error:', err);
    return res.status(500).json({ message: 'Failed to load bookings' });
  }
};
