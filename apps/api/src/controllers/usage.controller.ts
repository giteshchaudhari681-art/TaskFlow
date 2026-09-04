import { Request, Response, NextFunction } from 'express';
import { updatePlanSchema } from '@taskflow/validation';
import { usageService } from '../services/usage.service.js';
import { entitlementService } from '../services/entitlement.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * GET /api/v1/organizations/:organizationId/usage
 * Retrieves current resource utilization and limits for an organization.
 * Restricted to organization OWNER and ADMIN roles.
 */
export const getOrganizationUsage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const usage = await usageService.getOrganizationUsage(organizationId);
    return sendSuccess(res, usage);
  } catch (err: unknown) {
    return next(err);
  }
};

/**
 * PATCH /api/v1/organizations/:organizationId/plan
 * Internal administration endpoint to update subscription plan.
 * Strictly restricted to organization OWNER.
 */
export const updateOrganizationPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const parseResult = updatePlanSchema.safeParse(req.body);

    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid plan update data',
        400,
        parseResult.error.format()
      );
    }

    const updated = await entitlementService.updateOrganizationPlan(
      organizationId,
      parseResult.data.plan,
      undefined,
      req.user?.id,
      req.id
    );

    return sendSuccess(res, updated);
  } catch (err: unknown) {
    return next(err);
  }
};
