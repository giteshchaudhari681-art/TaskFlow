import { Request, Response } from 'express';
import { jobService } from '../services/job.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getJobSummary = async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
  }

  const organizationId = req.params.organizationId as string;
  if (!organizationId) {
    return sendError(res, 'BAD_REQUEST', 'organizationId parameter is required', 400);
  }

  try {
    const summary = await jobService.getSummary(organizationId);
    return sendSuccess(res, summary, 200);
  } catch (err: unknown) {
    const error = err as { statusCode?: number; code?: string; message?: string };
    if (error.statusCode && error.code) {
      return sendError(
        res,
        error.code,
        error.message || 'Error fetching job summary',
        error.statusCode
      );
    }
    throw err;
  }
};
