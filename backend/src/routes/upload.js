// backend/src/routes/upload.js
import express from 'express';
import multer from 'multer';
import { uploadImage } from '../controllers/uploadController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// IMPORTANT: use memory storage so req.file.buffer is available for Cloudinary
const upload = multer({ storage: multer.memoryStorage() });

// If you want uploads to be allowed only for authenticated users, keep `authenticate`.
// If you want public uploads (not recommended), remove it.
router.post('/image', authenticate, upload.single('image'), uploadImage);

// Example: update avatar could reuse uploadImage + then save URL on profile controller,
// but if you already have a specific avatar route elsewhere, keep it there.

export default router;
