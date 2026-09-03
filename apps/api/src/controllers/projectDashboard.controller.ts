import { Request, Response, NextFunction } from 'express';
import { projectDashboardParamsSchema } from '@taskflow/validation';
import { projectDashboardService } from '../services/projectDashboard.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getProjectDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const parseResult = projectDashboardParamsSchema.safeParse(req.params);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || 'Invalid parameters';
      return sendError(res, 'VALIDATION_ERROR', firstError, 400);
    }

    const { organizationId, projectId } = parseResult.data;
    const dashboard = await projectDashboardService.getDashboard(
      organizationId,
      projectId,
      req.user!.id
    );

    return sendSuccess(res, dashboard);
  } catch (error) {
    next(error);
  }
};
