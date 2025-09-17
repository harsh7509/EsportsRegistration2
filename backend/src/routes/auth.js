import express from 'express';
import {
  register, login, refresh,
  registerValidation, loginValidation,
  me, updateProfile, switchRole,
  sendOtp, verifyOtp
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/refresh', refresh);

// exactly one /me route
router.get('/me', authenticate, me);

router.put('/profile', authenticate, updateProfile);
router.post('/switch-role', authenticate, switchRole);

// Email-only OTP (signup)
router.post('/otp/send', sendOtp);     // body: { tempToken }
router.post('/otp/verify', verifyOtp); // body: { tempToken, code }

export default router;
