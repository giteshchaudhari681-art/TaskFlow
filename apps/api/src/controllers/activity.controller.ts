import { Request, Response, NextFunction } from 'express';
import { activityService } from '../services/activity.service.js';
import { sendSuccess } from '../utils/response.js';

export const getTaskActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const activities = await activityService.getTaskActivities(
      organizationId,
      projectId,
      taskId,
      req.user!.id,
      { limit }
    );

    return sendSuccess(res, activities);
  } catch (err) {
    return next(err);
  }
};

export const getProjectActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const projectId = req.params.projectId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const filterType = req.query.filterType as string | undefined;

    const activities = await activityService.getProjectActivities(
      organizationId,
      projectId,
      req.user!.id,
      { limit, filterType }
    );

    return sendSuccess(res, activities);
  } catch (err) {
    return next(err);
  }
};
