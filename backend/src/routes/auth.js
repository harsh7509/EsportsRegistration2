import express from 'express';
import { register, login, refresh, registerValidation, loginValidation, me, updateProfile, switchRole } from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/refresh', refresh);
router.get('/me', authenticate, me);
router.put('/profile', authenticate, updateProfile);
router.post('/switch-role', authenticate, switchRole);

export default router;