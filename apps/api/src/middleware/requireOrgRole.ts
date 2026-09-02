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

    const orgId =
      (req.headers['x-organization-id'] as string) ||
      req.params.organizationId ||
      req.body?.organizationId ||
      (req.query?.organizationId as string);

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
