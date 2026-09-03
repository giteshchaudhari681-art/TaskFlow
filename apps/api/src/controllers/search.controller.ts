import { Request, Response, NextFunction } from 'express';
import { searchQuerySchema } from '@taskflow/validation';
import { searchService } from '../services/search.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const globalSearch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const parseResult = searchQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || 'Invalid search query parameters';
      return sendError(res, 'VALIDATION_ERROR', firstError, 400);
    }

    const rawHeader = req.headers['x-organization-id'];
    const headerOrgId =
      typeof rawHeader === 'string'
        ? rawHeader
        : Array.isArray(rawHeader)
          ? rawHeader[0]
          : undefined;
    const queryOrgId =
      typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
    const paramOrgId =
      typeof req.params.organizationId === 'string' ? req.params.organizationId : undefined;
    const organizationId: string | undefined = headerOrgId || queryOrgId || paramOrgId;

    if (!organizationId) {
      return sendError(
        res,
        'MISSING_ORGANIZATION_CONTEXT',
        'Organization context required via x-organization-id header or organizationId parameter',
        400
      );
    }

    const results = await searchService.search(organizationId, req.user!.id, parseResult.data);

    return sendSuccess(res, results);
  } catch (error) {
    next(error);
  }
};
