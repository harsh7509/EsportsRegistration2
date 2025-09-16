import express from 'express';
import { getOrgRankings, getOrgDetails, rateOrganization } from '../controllers/OrgController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// Public: rankings + details
router.get('/rankings', getOrgRankings);
router.get('/:orgId', getOrgDetails);

// Auth required: players rate organizations
router.post('/:orgId/rate', authenticate, rateOrganization);

export default router;
