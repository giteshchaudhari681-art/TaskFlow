import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const userRoutes = Router();

// All user profile endpoints require valid authentication
userRoutes.use(requireAuth);

userRoutes.get('/me', userController.getProfile);
userRoutes.patch('/me', userController.updateProfile);
userRoutes.patch('/me/password', userController.changePassword);
