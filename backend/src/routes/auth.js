// backend/src/routes/auth.js
import express from 'express';
import rateLimit from 'express-rate-limit';

import {
  // REGISTER must now be "staged":
  // - create TempSignup + email OTP + return { otpRequired, tempToken }
  // - DO NOT create User here
  register,
  login,
  refresh,
  registerValidation,
  loginValidation,
  me,
  updateProfile,
  switchRole,
  // Email OTP handlers for staged signup:
  // - sendOtp({ tempToken })
  // - verifyOtp({ tempToken, code }) -> create User, delete TempSignup, return tokens
  sendOtp,
  verifyOtp,
} from '../controllers/authController.js';

import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

/* ---------- light rate limits (optional but recommended) ---------- */

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

/* ------------------------------ routes ------------------------------ */

// STAGED REGISTER: controller must store in TempSignup, not User
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

export default router;
