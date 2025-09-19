// backend/src/utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';


export async function uploadToCloud(localPath, folder = 'org-kyc') {
  // TEMP: just return a local URL. Replace with Cloudinary/S3 later.
  const file = path.basename(localPath);
  return { secure_url: `/uploads/${file}` };
}

const CLOUDINARY_KEY = process.env.CLOUDINARY_KEY;
const CLOUDINARY_SECRET = process.env.CLOUDINARY_SECRET;
const CLOUDINARY_NAME =
  process.env.CLOUDINARY_NAME ||
  process.env.CLOUDINARY_CLOUD_NAME ||
  (() => {
    if (process.env.CLOUDINARY_URL) {
      const m = process.env.CLOUDINARY_URL.match(/@([^/]+)/);
      if (m) return m[1];
    }
    return null;
  })();

if (CLOUDINARY_KEY && CLOUDINARY_SECRET && CLOUDINARY_NAME) {
  cloudinary.config({
    cloud_name: CLOUDINARY_NAME,
    api_key: CLOUDINARY_KEY,
    api_secret: CLOUDINARY_SECRET,
  });
}

export default cloudinary;
