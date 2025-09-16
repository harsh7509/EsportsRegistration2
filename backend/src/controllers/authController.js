import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.TOKEN_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

export const registerValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['player', 'organization']).withMessage('Invalid role')
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
];

export const register = async (req, res) => {
  try {
    console.log('📝 Registration attempt:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { name, email, password, role = 'player' } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create user
    const user = new User({ name, email, password, role });
    await user.save();
    console.log('✅ User created successfully:', user.email);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationInfo: user.organizationInfo,
      avatarUrl: user.avatarUrl,
      reputation: user.reputation,
      createdAt: user.createdAt
    };

    console.log('✅ Registration successful for:', email);

    res.status(201).json({
      user: userData,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const login = async (req, res) => {
  try {
    console.log('🔐 Login attempt for:', req.body.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Auto-assign admin role for specific email
    if (email === 'harsh.2201301022@geetauniversity.edu.in' && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
      console.log('🔑 Admin role assigned to:', email);
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Invalid password for:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationInfo: user.organizationInfo,
      avatarUrl: user.avatarUrl,
      reputation: user.reputation,
      createdAt: user.createdAt
    };

    console.log('✅ Login successful for:', email, 'Role:', user.role);

    res.json({
      user: userData,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const { accessToken } = generateTokens(user._id);

    res.json({ accessToken });
  } catch (error) {
    console.error('❌ Refresh token error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const me = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('name email role avatarUrl organizationInfo createdAt')
      .lean();

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      user: {
        id: String(user._id),
        _id: user._id,           // some UI paths use _id
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,         // <- IMPORTANT
        organizationInfo: user.organizationInfo,
        reputation: user.reputation || 0,
        createdAt: user.createdAt,
      }
    });
  } catch (err) {
    console.error('❌ Get user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { name, avatarUrl, imageUrl, avatar, organizationInfo } = req.body;

    console.log('📝 Updating profile for user:', userId);
    console.log('📝 Update data:', { name, avatarUrl, imageUrl, avatar, organizationInfo });

    // Build safe update payload (do not overwrite with undefined/empty)
    const payload = {};

    if (typeof name !== 'undefined' && name !== '') {
      payload.name = name;
    }

    const resolvedAvatar =
      (typeof avatarUrl === 'string' && avatarUrl.trim()) ||
      (typeof imageUrl === 'string' && imageUrl.trim()) ||
      (typeof avatar === 'string' && avatar.trim());

    if (resolvedAvatar) {
      payload.avatarUrl = resolvedAvatar;
    }

    if (organizationInfo && typeof organizationInfo === 'object') {
      // Merge with existing
      const current = (await User.findById(userId)) || {};
      const currOrg = current.organizationInfo || {};
      payload.organizationInfo = {
        orgName: typeof organizationInfo.orgName === 'string' ? organizationInfo.orgName : currOrg.orgName || '',
        location: typeof organizationInfo.location === 'string' ? organizationInfo.location : currOrg.location || '',
        verified:
          typeof organizationInfo.verified === 'boolean'
            ? organizationInfo.verified
            : typeof currOrg.verified === 'boolean'
            ? currOrg.verified
            : false,
      };
    }

    const user = await User.findByIdAndUpdate(userId, { $set: payload }, { new: true, runValidators: true }).select(
      '-password'
    );

    if (!user) return res.status(404).json({ message: 'User not found' });

    console.log('✅ Profile updated successfully');

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        _id: user._id, // some parts of your UI use _id
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        organizationInfo: user.organizationInfo,
        reputation: user.reputation,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

export const switchRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.user._id;

    console.log('🔄 Role switch request for user:', userId, 'to role:', role);

    // Verify user is admin email
    const user = await User.findById(userId);
    if (!user || user.email !== 'harsh.2201301022@geetauniversity.edu.in') {
      return res.status(403).json({ message: 'Access denied - Admin only' });
    }

    if (!['admin', 'player', 'organization'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    user.role = role;
    await user.save();

    console.log('✅ Role switched successfully to:', role);

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationInfo: user.organizationInfo,
      avatarUrl: user.avatarUrl,
      reputation: user.reputation,
      createdAt: user.createdAt
    };

    res.json({
      message: 'Role switched successfully',
      user: userData
    });
  } catch (error) {
    console.error('❌ Role switch error:', error);
    res.status(500).json({ message: 'Server error switching role' });
  }
};