// backend/src/utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';

const CLOUDINARY_NAME =
  process.env.CLOUDINARY_NAME ||
  process.env.CLOUDINARY_CLOUD_NAME ||
  (() => {
    // allow CLOUDINARY_URL form
    if (process.env.CLOUDINARY_URL) {
      const m = process.env.CLOUDINARY_URL.match(/@([^/]+)/);
      if (m) return m[1];
    }
    return null;
  })();

const CLOUDINARY_KEY = process.env.CLOUDINARY_KEY || process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_SECRET = process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET;

export const cloudinaryEnabled = !!(CLOUDINARY_NAME && CLOUDINARY_KEY && CLOUDINARY_SECRET);

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: CLOUDINARY_NAME,
    api_key: CLOUDINARY_KEY,
    api_secret: CLOUDINARY_SECRET,
    secure: true,
  });
}

// Upload a raw buffer (multer memory) to Cloudinary
export async function uploadBufferToCloudinary(buffer, opts = {}) {
  if (!cloudinaryEnabled) throw new Error('Cloudinary not configured');

  const { folder = 'esports/uploads', public_id, resource_type = 'image' } = opts;

  const streamifier = (await import('streamifier')).default;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id, resource_type, use_filename: true, unique_filename: true, overwrite: false },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

export default cloudinary;
