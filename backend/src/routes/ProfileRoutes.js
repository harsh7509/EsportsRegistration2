import express from 'express';

// ✅ Use the actual filename/casing for your multer config
//    (make sure the file exists at: backend/src/utils/multerConfig.js)
import upload from '../utils/MulterConfig.js';

import { updateProfileImage, getMyBookings } from '../controllers/profileController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

/**
 * GET /api/profile/bookings
 * Returns the authenticated player's bookings with populated scrim + org
 */
router.get('/bookings', authenticate, getMyBookings);

/**
 * POST /api/profile/avatar
 * Update profile avatar for the authenticated user.
 * Body: multipart/form-data with field "image"
 */
router.post('/avatar', authenticate, upload.single('image'), updateProfileImage);

export default router;
