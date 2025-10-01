// backend/src/routes/upload.js
import express from 'express';
import multer from 'multer';
import { uploadImage } from '../controllers/uploadController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });
router.post('/image', authenticate, upload.single('image'), uploadImage);

export default router;
