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

    const paramProjectId = req.params.projectId as string | undefined;
    const bodyProjectId = req.body?.projectId as string | undefined;
    const queryProjectId = req.query?.projectId as string | undefined;

    // Parameter precedence and context integrity validation:
    // If route specifies projectId in params, that target is authoritative.
    // Conflicting context from body or query is rejected to prevent context-spoofing attacks.
    if (paramProjectId) {
      if (bodyProjectId && bodyProjectId !== paramProjectId) {
        return sendError(
          res,
          'CONFLICTING_PROJECT_CONTEXT',
          'Route project parameter does not match body projectId',
          400
        );
      }
      if (queryProjectId && queryProjectId !== paramProjectId) {
        return sendError(
          res,
          'CONFLICTING_PROJECT_CONTEXT',
          'Route project parameter does not match query projectId',
          400
        );
      }
    }

    const projectId = paramProjectId || bodyProjectId || queryProjectId;

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
    const paramOrgId = req.params.organizationId as string | undefined;
    const rawHeader = req.headers['x-organization-id'];
    const headerOrgId =
      typeof rawHeader === 'string'
        ? rawHeader
        : Array.isArray(rawHeader)
          ? rawHeader[0]
          : undefined;

    if (paramOrgId && headerOrgId && paramOrgId !== headerOrgId) {
      return sendError(
        res,
        'CONFLICTING_ORGANIZATION_CONTEXT',
        'Route organization parameter does not match x-organization-id header',
        400
      );
    }

    const orgId = paramOrgId || headerOrgId;
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
