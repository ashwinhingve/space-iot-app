import express from 'express';
import { register, login, getMe, googleAuth, logout } from '../controllers/authController';
import { auth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Public routes with rate limiting
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);

// Protected routes (require authentication)
router.get('/me', auth, getMe);
router.post('/logout', auth, logout);

export default router; 