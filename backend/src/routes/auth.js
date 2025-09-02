import express from 'express';
import { register, login, refresh, registerValidation, loginValidation } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/refresh', refresh);

export default router;