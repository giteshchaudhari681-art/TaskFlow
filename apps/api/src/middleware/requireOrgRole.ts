import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@taskflow/shared';
import { organizationRepository } from '../repositories/organization.repository.js';
import { sendError } from '../utils/response.js';

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.OWNER]: 4,
  [UserRole.ADMIN]: 3,
  [UserRole.MEMBER]: 2,
  [UserRole.GUEST]: 1,
};

/**
 * Middleware requiring authenticated user to belong to an organization
 * and possess at least the specified minimum role (or one of the allowed roles).
 */
export const requireOrgRole = (...allowedRoles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    if (!req.user) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }

    const paramOrgId = req.params.organizationId as string | undefined;
    const rawHeader = req.headers['x-organization-id'];
    const headerOrgId =
      typeof rawHeader === 'string'
        ? rawHeader
        : Array.isArray(rawHeader)
          ? rawHeader[0]
          : undefined;
    const bodyOrgId = req.body?.organizationId as string | undefined;
    const queryOrgId = req.query?.organizationId as string | undefined;

    // Parameter precedence and context integrity validation:
    // If route specifies organizationId in params, that target is authoritative.
    // Conflicting context from header, body, or query is rejected to prevent context-spoofing attacks.
    if (paramOrgId) {
      if (headerOrgId && headerOrgId !== paramOrgId) {
        return sendError(
          res,
          'CONFLICTING_ORGANIZATION_CONTEXT',
          'Route organization parameter does not match x-organization-id header',
          400
        );
      }
      if (bodyOrgId && bodyOrgId !== paramOrgId) {
        return sendError(
          res,
          'CONFLICTING_ORGANIZATION_CONTEXT',
          'Route organization parameter does not match body organizationId',
          400
        );
      }
      if (queryOrgId && queryOrgId !== paramOrgId) {
        return sendError(
          res,
          'CONFLICTING_ORGANIZATION_CONTEXT',
          'Route organization parameter does not match query organizationId',
          400
        );
      }
    }

    const orgId = paramOrgId || headerOrgId || bodyOrgId || queryOrgId;

    if (!orgId) {
      return sendError(
        res,
        'MISSING_ORGANIZATION_CONTEXT',
        'Organization context required via x-organization-id header or route parameters',
        400
      );
    }

    const member = await organizationRepository.findMember(orgId, req.user.id);
    if (!member) {
      return sendError(
        res,
        'FORBIDDEN',
        'You are not a member of this organization workspace',
        403
      );
    }

    const userRole = member.role as UserRole;

    if (allowedRoles.length > 0) {
      const minRank = Math.min(...allowedRoles.map(r => ROLE_RANK[r]));
      const userRank = ROLE_RANK[userRole];

      if (userRank < minRank) {
        return sendError(
          res,
          'INSUFFICIENT_PERMISSIONS',
          `Access requires one of the following roles: ${allowedRoles.join(', ')}`,
          403
        );
      }
    }

    req.orgMember = {
      id: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      role: member.role as UserRole,
    };

    return next();
  };
};
