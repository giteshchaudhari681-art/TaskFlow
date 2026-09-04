import { Router } from 'express';
import { UserRole } from '@taskflow/shared';
import * as orgController from '../controllers/organization.controller.js';
import * as auditController from '../controllers/audit.controller.js';
import * as jobController from '../controllers/job.controller.js';
import * as usageController from '../controllers/usage.controller.js';
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

// Audit events query endpoint (Tenant and RBAC enforced in service)
organizationRoutes.get(
  '/:organizationId/audit-events',
  requireOrgRole(),
  auditController.getAuditEvents
);

// Operational background jobs summary endpoint (OWNER and ADMIN only)
organizationRoutes.get(
  '/:organizationId/jobs/summary',
  requireOrgRole(UserRole.OWNER, UserRole.ADMIN),
  jobController.getJobSummary
);

// SaaS Entitlements and Usage controls (OWNER and ADMIN only)
organizationRoutes.get(
  '/:organizationId/usage',
  requireOrgRole(UserRole.OWNER, UserRole.ADMIN),
  usageController.getOrganizationUsage
);

// Subscription plan administration (OWNER only)
organizationRoutes.patch(
  '/:organizationId/plan',
  requireOrgRole(UserRole.OWNER),
  usageController.updateOrganizationPlan
);
