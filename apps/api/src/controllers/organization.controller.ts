import { Request, Response, NextFunction } from 'express';
import {
  updateOrganizationSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from '@taskflow/validation';
import { organizationService } from '../services/organization.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getOrganizations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const list = await organizationService.getOrganizationsForUser(req.user!.id);
    return sendSuccess(res, list);
  } catch (err: unknown) {
    return next(err);
  }
};

export const getWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const workspace = await organizationService.getWorkspace(organizationId, req.user!.id);
    return sendSuccess(res, workspace);
  } catch (err: unknown) {
    if (err instanceof Error && (err as unknown as { statusCode: number }).statusCode === 403) {
      return sendError(res, 'FORBIDDEN', err.message, 403);
    }
    return next(err);
  }
};

export const updateWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const parseResult = updateOrganizationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid workspace update input data',
        400,
        parseResult.error.format()
      );
    }

    const updated = await organizationService.updateWorkspace(organizationId, parseResult.data);
    return sendSuccess(res, updated);
  } catch (err: unknown) {
    return next(err);
  }
};

export const getMembers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const members = await organizationService.getMembers(organizationId);
    return sendSuccess(res, members);
  } catch (err: unknown) {
    return next(err);
  }
};

export const addMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const parseResult = addMemberSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid member addition input data',
        400,
        parseResult.error.format()
      );
    }

    const member = await organizationService.addMember(
      organizationId,
      req.orgMember!.role,
      parseResult.data
    );

    return sendSuccess(res, member, 201);
  } catch (err: unknown) {
    if (err instanceof Error) {
      const statusCode = (err as unknown as { statusCode?: number }).statusCode || 400;
      const code = (err as unknown as { code?: string }).code || 'BAD_REQUEST';
      return sendError(res, code, err.message, statusCode);
    }
    return next(err);
  }
};

export const updateMemberRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const targetUserId = req.params.userId as string;

    const parseResult = updateMemberRoleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid member role update input data',
        400,
        parseResult.error.format()
      );
    }

    const updated = await organizationService.updateMemberRole(
      organizationId,
      req.user!.id,
      req.orgMember!.role,
      targetUserId,
      parseResult.data.role
    );

    return sendSuccess(res, updated);
  } catch (err: unknown) {
    if (err instanceof Error) {
      const statusCode = (err as unknown as { statusCode?: number }).statusCode || 400;
      const code = (err as unknown as { code?: string }).code || 'BAD_REQUEST';
      return sendError(res, code, err.message, statusCode);
    }
    return next(err);
  }
};

export const removeMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const organizationId = req.params.organizationId as string;
    const targetUserId = req.params.userId as string;

    await organizationService.removeMember(
      organizationId,
      req.user!.id,
      req.orgMember!.role,
      targetUserId
    );

    return sendSuccess(res, { message: 'Member removed successfully from the workspace' });
  } catch (err: unknown) {
    if (err instanceof Error) {
      const statusCode = (err as unknown as { statusCode?: number }).statusCode || 400;
      const code = (err as unknown as { code?: string }).code || 'BAD_REQUEST';
      return sendError(res, code, err.message, statusCode);
    }
    return next(err);
  }
};
