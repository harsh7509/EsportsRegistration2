// backend/src/routes/upload.js
import express from 'express';
import upload from '../utils/multer.config.js';
import { uploadImage } from '../controllers/uploadController.js';
import { updateProfileImage } from '../controllers/profileController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// Upload an image (returns URL). Use this before sending an image chat message.
router.post('/image', authenticate, upload.single('image'), uploadImage);

// Update current user's avatar
router.post('/avatar', authenticate, upload.single('image'), updateProfileImage);
export async function uploadToCloud(localPath, folder = 'org-kyc') {
  // TEMP: just return a local URL. Replace with Cloudinary/S3 later.
  const file = path.basename(localPath);
  return { secure_url: `/uploads/${file}` };
}

export default router;
