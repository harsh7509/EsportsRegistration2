import express from 'express';
import { authenticate, roleGuard } from '../middlewares/auth.js';
import {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  deleteUser,
  createPromotion,
  getPromotions,
  updatePromotion,
  deletePromotion,
  trackPromoClick,
  updateUserProfileAdmin
} from '../controllers/AdminController.js';

const router = express.Router();

// All routes require admin role
router.use(authenticate, roleGuard(['admin']));

// Dashboard
router.get('/stats', getDashboardStats);

// User management
router.get('/users', getAllUsers);
router.put('/users/:userId/role', updateUserRole);
router.delete('/users/:userId', deleteUser);
router.put('/users/:userId', updateUserProfileAdmin);

// Promotion management
router.get('/promotions', getPromotions);
router.post('/promotions', createPromotion);
router.put('/promotions/:promoId', updatePromotion);
router.delete('/promotions/:promoId', deletePromotion);
router.post('/promotions/:promoId/click', trackPromoClick);

export default router;