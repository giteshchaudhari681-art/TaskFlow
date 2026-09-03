import { Request, Response, NextFunction } from 'express';
import { notificationQuerySchema, updateNotificationPreferencesSchema } from '@taskflow/validation';
import { notificationService } from '../services/notification.service.js';

export class NotificationController {
  async listNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const query = notificationQuerySchema.parse(req.query);
      const result = await notificationService.listNotifications(req.user!.id, {
        limit: query.limit,
        unreadOnly: query.unreadOnly,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const unreadCount = await notificationService.getUnreadCount(req.user!.id);
      res.status(200).json({
        success: true,
        data: { unreadCount },
      });
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await notificationService.markAsRead(req.user!.id, id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.markAllAsRead(req.user!.id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const preferences = await notificationService.getUserPreferences(req.user!.id);

      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (err) {
      next(err);
    }
  }

  async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = updateNotificationPreferencesSchema.parse(req.body);
      const preferences = await notificationService.updateUserPreferences(req.user!.id, validated);

      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();
