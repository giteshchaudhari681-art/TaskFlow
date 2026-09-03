import { Router } from 'express';
import { UserRole } from '@taskflow/shared';
import * as orgController from '../controllers/organization.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireOrgRole } from '../middleware/requireOrgRole.js';

import { projectRoutes } from './project.routes.js';
import searchRoutes from './search.routes.js';

export const organizationRoutes = Router();

// Base authentication required on all organization operations
organizationRoutes.use(requireAuth);

// List all user organizations
organizationRoutes.get('/', orgController.getOrganizations);

// Nested project management routes
organizationRoutes.use('/:organizationId/projects', projectRoutes);

// Organization-scoped search
organizationRoutes.use('/:organizationId/search', searchRoutes);

// Workspace details & metadata update
organizationRoutes.get('/:organizationId', requireOrgRole(), orgController.getWorkspace);
organizationRoutes.patch(
  '/:organizationId',
  requireOrgRole(UserRole.OWNER, UserRole.ADMIN),
  orgController.updateWorkspace
);

// Workspace members
organizationRoutes.get('/:organizationId/members', requireOrgRole(), orgController.getMembers);
organizationRoutes.post(
  '/:organizationId/members',
  requireOrgRole(UserRole.OWNER, UserRole.ADMIN),
  orgController.addMember
);
organizationRoutes.patch(
  '/:organizationId/members/:userId',
  requireOrgRole(UserRole.OWNER, UserRole.ADMIN),
  orgController.updateMemberRole
);
organizationRoutes.delete(
  '/:organizationId/members/:userId',
  requireOrgRole(UserRole.OWNER, UserRole.ADMIN),
  orgController.removeMember
);
