import { Request, Response } from 'express';
import { auditEventsQuerySchema } from '@taskflow/validation';
import { auditService } from '../services/audit.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getAuditEvents = async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
  }

  const organizationId = req.params.organizationId as string;
  if (!organizationId) {
    return sendError(res, 'BAD_REQUEST', 'organizationId parameter is required', 400);
  }

  const parseResult = auditEventsQuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    return sendError(
      res,
      'VALIDATION_ERROR',
      parseResult.error.errors[0]?.message || 'Invalid query parameters',
      400,
      parseResult.error.errors
    );
  }

  try {
    const result = await auditService.list(organizationId, parseResult.data, req.user.id);
    return sendSuccess(res, result.items, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    if (err.statusCode && err.code) {
      return sendError(res, err.code, err.message, err.statusCode);
    }
    throw err;
  }
};
