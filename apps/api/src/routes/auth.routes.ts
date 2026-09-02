import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { authLimiter } from '../middleware/rateLimiters.js';

export const authRoutes = Router();

// Public authentication endpoints
authRoutes.post('/register', authLimiter, authController.register);
authRoutes.post('/login', authLimiter, authController.login);
authRoutes.post('/refresh', authController.refresh);
authRoutes.post('/logout', authController.logout);

// Protected session context endpoint
authRoutes.get('/me', requireAuth, authController.getMe);
