import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { notificationController } from '../controllers/notification.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => notificationController.listNotifications(req, res, next));
router.get('/unread-count', (req, res, next) =>
  notificationController.getUnreadCount(req, res, next)
);
router.patch('/:id/read', (req, res, next) => notificationController.markAsRead(req, res, next));
router.post('/read-all', (req, res, next) => notificationController.markAllAsRead(req, res, next));
router.get('/preferences', (req, res, next) =>
  notificationController.getPreferences(req, res, next)
);
router.patch('/preferences', (req, res, next) =>
  notificationController.updatePreferences(req, res, next)
);

export default router;
