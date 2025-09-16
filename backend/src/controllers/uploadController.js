// backend/src/controllers/uploadController.js
import path from 'path';
import fs from 'fs';
import cloudinary from '../utils/cloudinary.js';

// This controller assumes you've wired a route like:
// router.post('/image', authenticate, upload.single('image'), uploadImage);

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // If Cloudinary is configured, use it
    if (cloudinary?.config && cloudinary.config().api_key) {
      const streamifier = (await import('streamifier')).default;
      const uploadStream = (buffer) =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'esports_avatars', resource_type: 'image' },
            (error, result) => (error ? reject(error) : resolve(result))
          );
          streamifier.createReadStream(buffer).pipe(stream);
        });

      const result = await uploadStream(req.file.buffer);
      return res.json({ imageUrl: result.secure_url });
    }

    // Local fallback
    const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const ext = (req.file.mimetype && req.file.mimetype.split('/')[1]) || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filepath, req.file.buffer);

    const base = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${base}/uploads/images/${filename}`;
    return res.json({ imageUrl });
  } catch (err) {
    console.error('uploadImage error:', err);
    res.status(500).json({ message: 'Failed to upload image' });
  }
};
