import express from 'express';
import { getOrgRankings, getOrgDetails, rateOrganization } from '../controllers/OrgController.js';
import { authenticate } from '../middlewares/auth.js';
// import upload from '../utils/multerConfig.js'; // aapke repo me `upload.js` hai
import { submitOrgKyc, myOrgKyc } from '../controllers/OrgKycController.js';
import upload from '../utils/multerconfig.js';





const router = express.Router();


// Public: rankings + details
router.get('/rankings', getOrgRankings);

// Org verification (KYC)
router.post(
  '/verify/submit',
  authenticate,
  upload.fields([
    { name: 'aadhaarImage', maxCount: 1 },
    { name: 'selfieImage', maxCount: 1 },
  ]),
  submitOrgKyc
);

router.get('/verify/me', authenticate, myOrgKyc);
router.get('/:orgId', getOrgDetails);

// Auth required: players rate organizations
router.post('/:orgId/rate', authenticate, rateOrganization);






export default router;
