import { Request, Response, NextFunction } from 'express';
import { ProjectRole } from '@taskflow/shared';
import { organizationRepository } from '../repositories/organization.repository.js';
import { sendError } from '../utils/response.js';

const PROJECT_ROLE_RANK: Record<ProjectRole, number> = {
  [ProjectRole.LEAD]: 4,
  [ProjectRole.ADMIN]: 3,
  [ProjectRole.MEMBER]: 2,
  [ProjectRole.VIEWER]: 1,
};

/**
 * Middleware ensuring the authenticated user is an authorized member of the project
 * within the proper tenant boundary, meeting role requirements.
 */
export const requireProjectRole = (...allowedRoles: ProjectRole[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    if (!req.user) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }

    const projectId =
      req.params.projectId || req.body?.projectId || (req.query?.projectId as string);

    if (!projectId) {
      return sendError(
        res,
        'MISSING_PROJECT_CONTEXT',
        'Project context required via parameters',
        400
      );
    }

    const membership = await organizationRepository.findProjectMember(projectId, req.user.id);
    if (!membership) {
      return sendError(res, 'FORBIDDEN', 'You do not have access to this project', 403);
    }

    // Tenant boundary check: if organization context is present, ensure project belongs to it
    const orgId = req.params.organizationId || (req.headers['x-organization-id'] as string);
    if (orgId && membership.project.organizationId !== orgId) {
      return sendError(
        res,
        'CROSS_TENANT_FORBIDDEN',
        'Project does not belong to the active organization',
        403
      );
    }

    const userRole = membership.role as ProjectRole;

    if (allowedRoles.length > 0) {
      const minRank = Math.min(...allowedRoles.map(r => PROJECT_ROLE_RANK[r]));
      const userRank = PROJECT_ROLE_RANK[userRole];

      if (userRank < minRank) {
        return sendError(
          res,
          'INSUFFICIENT_PERMISSIONS',
          `Project access requires one of the following roles: ${allowedRoles.join(', ')}`,
          403
        );
      }
    }

    req.projectMember = {
      id: membership.id,
      projectId: membership.projectId,
      userId: membership.userId,
      role: membership.role as ProjectRole,
    };

    return next();
  };
};
