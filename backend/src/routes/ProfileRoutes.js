import express from 'express';
import upload from '../utils/multer.config.js';

import { updateProfileImage, getMyBookings } from '../controllers/profileController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.get('/bookings', authenticate, getMyBookings);
router.post('/avatar', authenticate, upload.single('image'), updateProfileImage);

export default router;
