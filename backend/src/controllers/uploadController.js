// backend/src/controllers/uploadController.js
import fs from 'fs';
import path from 'path';
import { cloudinaryEnabled, uploadBufferToCloudinary } from '../utils/cloudinary.js';

// Builds an absolute URL for local fallback (dev only)
function localFileUrl(req, relPath) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}${relPath.startsWith('/') ? relPath : `/${relPath}`}`;
}

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Prefer Cloudinary when configured (typical for production)
    if (cloudinaryEnabled) {
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'esports/images',
        // optional: public_id derived from filename (without extension)
        public_id: req.file.originalname?.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, ''),
      });
      return res.json({ imageUrl: result.secure_url, publicId: result.public_id });
    }

    // --- DEV ONLY FALLBACK (local disk) ---
    const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    // sanitize filename
    const original = req.file.originalname?.split(/[/\\]/).pop() || `image-${Date.now()}`;
    const ext = (req.file.mimetype && req.file.mimetype.split('/')[1]) || 'jpg';
    const safeName = `${Date.now()}-${original.replace(/[^\w.\-]+/g, '_')}.${ext}`;
    const fullPath = path.join(uploadsDir, safeName);

    await fs.promises.writeFile(fullPath, req.file.buffer);
    const publicPath = `/uploads/images/${safeName}`;

    return res.json({ imageUrl: localFileUrl(req, publicPath) });
  } catch (err) {
    console.error('uploadImage error:', err);
    res.status(500).json({ message: 'Failed to upload image' });
  }
};
