import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;

// SMTP mailer (email-only OTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const issueTokens = (user) => {
  const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.TOKEN_EXPIRES_IN || '15m' });
  const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.REFRESH_EXPIRES_IN || '7d' });
  return { accessToken, refreshToken };
};

export const registerValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['player', 'organization']).withMessage('Invalid role'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

const hash = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const genCode = () => String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
const issueTempToken = (userId, kind = 'signup_otp') =>
  jwt.sign({ userId, kind }, JWT_SECRET, { expiresIn: '10m' });

/** POST /api/auth/register */

export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    // ✅ ENV sanity check FIRST (prevents partial user creation)
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      return res.status(500).json({ message: 'Server misconfigured: JWT secrets missing' });
    }

    // normalize email
    let { name, email, phone = '', password, role = 'player' } = req.body || {};
    email = String(email).trim().toLowerCase();

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already in use' });

    // ✅ Create user
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role,
      emailVerified: false,
      phoneVerified: false,
      loginOtp: null,
    });

    // ✅ Issue temp token (will not fail now because secrets checked)
    const tempToken = jwt.sign({ userId: user._id, kind: 'signup_otp' }, process.env.JWT_SECRET, { expiresIn: '10m' });

    return res.status(201).json({
      otpRequired: true,
      tempToken,
      channels: { email: true },
    });
  } catch (e) {
    console.error('register error:', e);
    return res.status(500).json({ message: 'Registration failed' });
  }
};


/** POST /api/auth/login  (NO OTP HERE) */
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const { email, password } = req.body || {};
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    // Optional: you can require emailVerified === true before login
    // if (!user.emailVerified) return res.status(403).json({ message: 'Please verify your email first' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    // Admin auto-assign (keep your original special-case if needed)
    if (email === 'harsh.2201301022@geetauniversity.edu.in' && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    const tokens = issueTokens(user);
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationInfo: user.organizationInfo,
      avatarUrl: user.avatarUrl,
      reputation: user.reputation,
      createdAt: user.createdAt,
    };
    return res.json({ user: userData, ...tokens });
  } catch (e) {
    console.error('login error:', e);
    res.status(500).json({ message: 'Server error during login' });
  }
};

/** POST /api/auth/refresh */
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' });

    const { accessToken } = issueTokens(user);
    res.json({ accessToken });
  } catch (e) {
    console.error('refresh error:', e);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

/** GET /api/auth/me */
export const me = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('name email role avatarUrl organizationInfo createdAt phone emailVerified phoneVerified')
      .lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ user: { ...user, id: String(user._id) } });
  } catch (e) {
    console.error('me error:', e);
    res.status(500).json({ message: 'Server error' });
  }
};

/** PUT /api/auth/profile */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { name, avatarUrl, imageUrl, avatar, organizationInfo } = req.body;
    const payload = {};

    if (typeof name === 'string' && name.trim()) payload.name = name.trim();

    const resolvedAvatar =
      (typeof avatarUrl === 'string' && avatarUrl.trim()) ||
      (typeof imageUrl === 'string' && imageUrl.trim()) ||
      (typeof avatar === 'string' && avatar.trim());
    if (resolvedAvatar) payload.avatarUrl = resolvedAvatar;

    if (organizationInfo && typeof organizationInfo === 'object') {
      const current = await User.findById(userId);
      const currOrg = current.organizationInfo || {};
      payload.organizationInfo = {
        orgName: typeof organizationInfo.orgName === 'string' ? organizationInfo.orgName : currOrg.orgName || '',
        location: typeof organizationInfo.location === 'string' ? organizationInfo.location : currOrg.location || '',
        verified: typeof organizationInfo.verified === 'boolean'
          ? organizationInfo.verified
          : typeof currOrg.verified === 'boolean'
          ? currOrg.verified
          : false,
      };
    }

    const user = await User.findByIdAndUpdate(userId, { $set: payload }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        organizationInfo: user.organizationInfo,
        reputation: user.reputation,
        createdAt: user.createdAt,
      },
    });
  } catch (e) {
    console.error('updateProfile error:', e);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

/** POST /api/auth/switch-role (kept as you had it) */
export const switchRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.user._id);
    if (!user || user.email !== 'harsh.2201301022@geetauniversity.edu.in') {
      return res.status(403).json({ message: 'Access denied - Admin only' });
    }
    if (!['admin', 'player', 'organization'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    user.role = role;
    await user.save();
    res.json({
      message: 'Role switched successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationInfo: user.organizationInfo,
        avatarUrl: user.avatarUrl,
        reputation: user.reputation,
        createdAt: user.createdAt,
      },
    });
  } catch (e) {
    console.error('switchRole error:', e);
    res.status(500).json({ message: 'Server error switching role' });
  }
};

/** -------- Email-only OTP endpoints (signup flow) -------- */

/** POST /api/auth/otp/send   body: { tempToken } */
export const sendOtp = async (req, res) => {
  try {
    const { tempToken } = req.body || {};
    if (!tempToken) return res.status(400).json({ message: 'Bad request' });

    let payload;
    try { payload = jwt.verify(tempToken, process.env.JWT_SECRET); }
    catch { return res.status(401).json({ message: 'Temp token invalid/expired' }); }

    if (payload.kind !== 'signup_otp') {
      return res.status(400).json({ message: 'Invalid OTP purpose' });
    }

    const user = await User.findById(payload.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const code = genCode();
    user.loginOtp = {
      channel: 'email',
      codeHash: hash(code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
    };
    await user.save();

    // ✅ If SMTP creds missing, don't fail the flow in DEV
    const canSendEmail = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
    if (canSendEmail) {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || 'no-reply@example.com',
        to: user.email,
        subject: 'Verify your account',
        text: `Your verification code is ${code}. It expires in 10 minutes.`,
        html: `<p>Your verification code is <b>${code}</b>. It expires in 10 minutes.</p>`,
      });
    } else {
      // DEV fallback: print to server log so you can copy-paste
      console.log('[DEV][OTP]', user.email, 'code =', code);
    }

    return res.json({ ok: true, devHint: canSendEmail ? undefined : 'OTP logged to server console' });
  } catch (e) {
    console.error('sendOtp error:', e);
    return res.status(500).json({ message: 'Failed to send OTP' });
  }
};


/** POST /api/auth/otp/verify  body: { tempToken, code } */
export const verifyOtp = async (req, res) => {
  try {
    const { tempToken, code } = req.body || {};
    if (!tempToken || !code) return res.status(400).json({ message: 'Bad request' });

    let payload;
    try { payload = jwt.verify(tempToken, JWT_SECRET); }
    catch { return res.status(401).json({ message: 'Temp token invalid/expired' }); }

    if (payload.kind !== 'signup_otp') {
      return res.status(400).json({ message: 'Invalid OTP purpose' });
    }

    const user = await User.findById(payload.userId);
    if (!user?.loginOtp) return res.status(400).json({ message: 'No OTP pending' });

    if (user.loginOtp.expiresAt < new Date()) {
      user.loginOtp = null; await user.save();
      return res.status(400).json({ message: 'Code expired' });
    }
    if (user.loginOtp.attempts >= 5) {
      user.loginOtp = null; await user.save();
      return res.status(429).json({ message: 'Too many attempts' });
    }

    const ok = user.loginOtp.codeHash === hash(code);
    user.loginOtp.attempts += 1;
    if (!ok) { await user.save(); return res.status(400).json({ message: 'Invalid code' }); }

    // success
    user.emailVerified = true;
    user.loginOtp = null;
    await user.save();

    // Auto-login after verification
    const tokens = issueTokens(user);
    return res.json(tokens);
  } catch (e) {
    console.error('verifyOtp error:', e);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};
