// backend/src/routes/promos.js
import express from 'express';
import { listActivePromos } from '../controllers/PromosPublicController.js';

const router = express.Router();

// Public: get active promotions (used by homepage / client)
router.get('/', listActivePromos);

export default router;
