import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import TempSignup from '../models/TempSignup.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  pool: true, maxConnections: 5, maxMessages: 100, rateDelta: 1000, rateLimit: 5
});

const issueTokens = (user) => {
  const accessToken = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: process.env.TOKEN_EXPIRES_IN || '15m' });
  const refreshToken = jwt.sign({ userId: user._id }, JWT_REFRESH_SECRET, { expiresIn: process.env.REFRESH_EXPIRES_IN || '7d' });
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

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));
const signTempToken = (email) => jwt.sign({ email, kind: 'signup_otp' }, JWT_SECRET, { expiresIn: '10m' });

const getEmailFromTempToken = (tempToken) => {
  try {
    const payload = jwt.verify(tempToken, JWT_SECRET);
    if (payload.kind !== 'signup_otp') return null;
    return String(payload.email || '').toLowerCase();
  } catch {
    return null;
  }
};

/* ====================== REGISTER (STAGED) ====================== */
/** POST /api/auth/register */
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    if (!JWT_SECRET || !JWT_REFRESH_SECRET)
      return res.status(500).json({ message: 'Server configuration error' });

    let { name, email, password, role = 'player' } = req.body || {};
    email = String(email || '').trim().toLowerCase();

    const exists = await User.findOne({ email }).lean();
    if (exists) return res.status(409).json({ message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);

    // upsert into staging
    await TempSignup.findOneAndUpdate(
      { email },
      {
        email,
        name: String(name || '').trim(),
        role,
        passwordHash,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        createdAt: new Date()
      },
      { upsert: true, new: true }
    );

    // temp token bound to email
    const tempToken = signTempToken(email);

    // generate OTP and store (do NOT await email send before responding)
    const code = genCode();
    await TempSignup.updateOne(
      { email },
      { $set: { otpHash: sha256(code), otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), otpAttempts: 0 } }
    );

    // respond fast
    res.status(201).json({
      otpRequired: true,
      tempToken,
      message: 'Please check your email for the verification code',
    });

    // send email AFTER response (non-blocking)
    const canSend = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
    setImmediate(async () => {
      try {
        if (canSend) {
          await transporter.sendMail({
            from: process.env.MAIL_FROM || 'no-reply@example.com',
            to: email,
            subject: 'Verify your account',
            text: `Your verification code is ${code}. It expires in 10 minutes.`,
            html: `<p>Your verification code is <b>${code}</b>. It expires in 10 minutes.</p>`,
          });
        } else {
          console.log('[DEV][OTP]', email, 'code =', code);
        }
      } catch (e) {
        console.error('sendMail error (register):', e);
      }
    });
  } catch (e) {
    console.error('register error:', e);
    return res.status(500).json({ message: 'Registration failed' });
  }
};


/* ====================== LOGIN ====================== */
/** POST /api/auth/login */
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');

    // Fast lookup: ensure email is indexed unique in your User schema
    const user = await User.findOne({ email })
      .select('_id name email role password avatarUrl organizationInfo reputation createdAt emailVerified')
      .lean();

    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    // Optional “auto-admin” rule (keep if you need it; done without an extra read)
    if (email === 'harsh.2201301022@geetauniversity.edu.in' && user.role !== 'admin') {
      await User.updateOne({ _id: user._id }, { $set: { role: 'admin' } });
      user.role = 'admin';
    }

    // Small JWT payloads = faster sign & smaller headers
    const accessToken = jwt.sign({ uid: user._id, r: user.role }, JWT_SECRET, {
      expiresIn: process.env.TOKEN_EXPIRES_IN || '15m',
    });
    const refreshToken = jwt.sign({ uid: user._id }, JWT_REFRESH_SECRET, {
      expiresIn: process.env.REFRESH_EXPIRES_IN || '7d',
    });

    const { password: _pw, ...safeUser } = user;
    return res.json({ user: { ...safeUser, id: safeUser._id }, accessToken, refreshToken });
  } catch (e) {
    console.error('login error:', e);
    res.status(500).json({ message: 'Server error during login' });
  }
};

/* ====================== REFRESH ====================== */
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' });

    const { accessToken } = issueTokens(user);
    res.json({ accessToken });
  } catch (e) {
    console.error('refresh error:', e);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

/* ====================== ME / PROFILE / ROLE ====================== */
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

export const switchRole = async (req, res) => {
  try {
    const { role } = req.body || {};
    const user = await User.findById(req.user._id);
    if (!user || user.email !== 'harsh.2201301022@geetauniversity.edu.in')
      return res.status(403).json({ message: 'Access denied - Admin only' });

    if (!['admin', 'player', 'organization'].includes(role))
      return res.status(400).json({ message: 'Invalid role' });

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

/* ====================== OTP (TempSignup) ====================== */
/** POST /api/auth/otp/send   body: { tempToken } */
/** POST /api/auth/otp/send   body: { tempToken } */
export const sendOtp = async (req, res) => {
  try {
    const { tempToken } = req.body || {};
    const email = getEmailFromTempToken(tempToken);
    if (!email) return res.status(400).json({ message: 'Invalid token' });

    const t = await TempSignup.findOne({ email }).lean();
    if (!t) return res.status(400).json({ message: 'No signup session for this token' });

    const code = genCode();
    await TempSignup.updateOne(
      { email },
      { $set: { otpHash: sha256(code), otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), otpAttempts: 0 } }
    );

    // respond immediately
    res.status(202).json({ ok: true });

    // send email AFTER responding
    setImmediate(async () => {
      try {
        await transporter.sendMail({
          from: process.env.MAIL_FROM || 'no-reply@example.com',
          to: email,
          subject: 'Your verification code',
          text: `Your code is ${code}. It expires in 10 minutes.`,
          html: `<p>Your code is <b>${code}</b>. It expires in 10 minutes.</p>`,
        });
      } catch (e) {
        console.error('sendMail error (sendOtp):', e);
      }
    });
  } catch (e) {
    console.error('sendOtp error:', e);
    res.status(500).json({ message: 'Server error' });
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

    if (payload.kind !== 'signup_otp') return res.status(400).json({ message: 'Invalid OTP purpose' });

    const email = String(payload.email || '').toLowerCase();
    const t = await TempSignup.findOne({ email });
    if (!t || !t.otpHash) return res.status(400).json({ message: 'No OTP pending' });

    if (t.otpExpiresAt < new Date()) {
      await TempSignup.updateOne({ email }, { $set: { otpHash: null, otpExpiresAt: null, otpAttempts: 0 } });
      return res.status(400).json({ message: 'Code expired' });
    }
    if (t.otpAttempts >= 5) {
      await TempSignup.updateOne({ email }, { $set: { otpHash: null, otpExpiresAt: null, otpAttempts: 0 } });
      return res.status(429).json({ message: 'Too many attempts' });
    }

    const ok = t.otpHash === sha256(code);
    t.otpAttempts += 1;
    await t.save();
    if (!ok) return res.status(400).json({ message: 'Invalid code' });

    // Create real user NOW, with pre-hashed password injected
    const alreadyUser = await User.findOne({ email }).lean();
    if (alreadyUser) {
      await TempSignup.deleteOne({ email });
      const tokens = issueTokens(alreadyUser);
      return res.json(tokens);
    }

    const user = await User.create({
      name: t.name,
      email: t.email,
      role: t.role,
      password: t.passwordHash,      // already hashed
      isPasswordHashed: true,        // tells pre-save hook to not re-hash
      emailVerified: true,
      phoneVerified: false,
    });

    await TempSignup.deleteOne({ email });

    const tokens = issueTokens(user);
    return res.json(tokens);
  } catch (e) {
    console.error('verifyOtp error:', e);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};
