import { Request, Response, NextFunction } from 'express';
import { myWorkQuerySchema } from '@taskflow/validation';
import { workService } from '../services/work.service.js';

export class WorkController {
  async getMyWork(req: Request, res: Response, next: NextFunction) {
    try {
      const query = myWorkQuerySchema.parse(req.query);
      const result = await workService.getMyWork(req.user!.id, {
        filter: query.filter,
        projectId: query.projectId,
        search: query.search,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const workController = new WorkController();
