// backend/src/routes/auth.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import { testMail } from '../controllers/authController.js';

import {
  register,
  login,
  refresh,
  registerValidation,
  loginValidation,
  me,
  updateProfile,
  switchRole,
  sendOtp,
  verifyOtp,
} from '../controllers/authController.js';

import { authenticate } from '../middlewares/auth.js';

const router = express.Router();


// avoid signup/OTP abuse
const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 20,                  // 20 registers per IP / 10 min
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 30,                  // 30 OTP ops per IP / 10 min
  standardHeaders: true,
  legacyHeaders: false,
});


router.post('/register', registerLimiter, registerValidation, register);

// Normal auth
router.post('/login', loginValidation, login);
router.post('/refresh', refresh);

// exactly one /me route
router.get('/me', authenticate, me);

// profile & role
router.put('/profile', authenticate, updateProfile);
router.post('/switch-role', authenticate, switchRole);

// Email-only OTP (signup)
router.post('/otp/send', otpLimiter, sendOtp);     // body: { tempToken }
router.post('/otp/verify', otpLimiter, verifyOtp); // body: { tempToken, code }
router.post('/test-mail', testMail);

export default router;
