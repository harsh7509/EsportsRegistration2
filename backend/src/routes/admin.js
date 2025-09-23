import express from 'express';
import { authenticate, roleGuard, requireAdmin } from '../middlewares/auth.js';
import { listOrgKyc, reviewOrgKyc } from '../controllers/OrgKycController.js';
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
  updateUserProfileAdmin,
  listScrims, listTournaments, listBookings, listPayments, listOrgRatings,
  setOrgVerified, setOrgRanking,
  adminUpdateScrim,
  adminAddPlayerToScrim,
  adminRemovePlayerFromScrim,
  adminDeleteScrim,
  adminListScrimParticipants,
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


// NEW: master lists
router.get('/scrims', listScrims);
router.get('/tournaments', listTournaments);
router.get('/bookings', listBookings);
router.get('/payments', listPayments);
router.get('/ratings', listOrgRatings);

// NEW: org controls
router.post('/orgs/:userId/verify', setOrgVerified);
router.post('/orgs/:userId/ranking', setOrgRanking);


router.patch('/scrims/:scrimId', requireAdmin, adminUpdateScrim);
router.get('/scrims/:scrimId/participants', requireAdmin, adminListScrimParticipants);
router.post('/scrims/:scrimId/participants', requireAdmin, adminAddPlayerToScrim);           // body: { playerId }
router.delete('/scrims/:scrimId/participants/:playerId', requireAdmin, adminRemovePlayerFromScrim);
router.delete('/scrims/:scrimId', requireAdmin, adminDeleteScrim);



// Org KYC review
router.get('/org-kyc', authenticate, listOrgKyc);
router.post('/org-kyc/:userId/review', authenticate, reviewOrgKyc);

export default router;