import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const raw = req.header('Authorization') || '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.userId || decoded.uid; // backward compat
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

export const roleGuard = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }

    next();
  };
};

export const verifyToken = (req, res, next) => {
  try {
    const raw = req.headers.authorization || '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';
    if (!token) return res.status(401).json({ message: 'No token' });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid/expired token' });
  }
};  

// export const authenticate = async (req, res, next) => {
//   try {
//     const raw = req.header('Authorization') || '';
//     const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';
//     if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.userId);
//     if (!user) return res.status(401).json({ message: 'Invalid token.' });

//     req.user = user; // full user document
//     next();
//   } catch (error) {
//     res.status(401).json({ message: 'Invalid token.' });
//   }
// };

// export const roleGuard = (roles) => {
//   return (req, res, next) => {
//     if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
//     if (!roles.includes(req.user.role)) {
//       return res.status(403).json({ message: 'Insufficient permissions.' });
//     }
//     next();
//   };
// };

// --- add these tiny compositors ---
// Use when you want "auth + role" in one import.
export const requireRole = (...roles) => [
  authenticate,
  roleGuard(roles),
];

// Drop-in guards for your routes:
export const requireAdmin   = [authenticate, roleGuard(['admin'])];
export const requireOrg     = [authenticate, roleGuard(['organization'])];
export const requirePlayer  = [authenticate, roleGuard(['player'])];

// If you ever need "admin OR org", etc.:
export const requireAdminOrOrg = [authenticate, roleGuard(['admin', 'organization'])];

// Keep verifyToken if you still use it elsewhere, but prefer `authenticate` above
// since it loads the user document.
// export const verifyToken = (req, res, next) => {
//   try {
//     const raw = req.headers.authorization || '';
//     const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';
//     if (!token) return res.status(401).json({ message: 'No token' });
//     req.user = jwt.verify(token, process.env.JWT_SECRET);
//     next();
//   } catch (e) {
//     return res.status(401).json({ message: 'Invalid/expired token' });
//   }
// };


export const optionalAuth = async (req, res, next) => {
  const raw = req.header('Authorization') || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';
  if (!token) return next(); // truly guest
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.userId || decoded.uid;
    const user = await User.findById(id);
    if (user) req.user = user;
    return next();
  } catch {
    // IMPORTANT: signal the client to refresh tokens
    return res.status(401).json({ message: 'Invalid/expired token' });
  }
};