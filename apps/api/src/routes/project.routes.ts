import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  archiveProject,
  unarchiveProject,
  listMembers,
  addMember,
  updateMemberRole,
  removeMember,
} from '../controllers/project.controller.js';
import { taskRoutes } from './task.routes.js';
import { labelRoutes } from './label.routes.js';
import { milestoneRoutes } from './milestone.routes.js';
import { getProjectDependencyGraph } from '../controllers/dependency.controller.js';
import { getProjectTimeline } from '../controllers/milestone.controller.js';

export const projectRoutes = Router({ mergeParams: true });

// All project routes require active authenticated session
projectRoutes.use(requireAuth);

// Project CRUD endpoints
projectRoutes.get('/', listProjects);
projectRoutes.post('/', createProject);
projectRoutes.get('/:projectId', getProject);
projectRoutes.patch('/:projectId', updateProject);
projectRoutes.post('/:projectId/archive', archiveProject);
projectRoutes.post('/:projectId/unarchive', unarchiveProject);

// Project Member Management endpoints
projectRoutes.get('/:projectId/members', listMembers);
projectRoutes.post('/:projectId/members', addMember);
projectRoutes.patch('/:projectId/members/:userId', updateMemberRole);
projectRoutes.delete('/:projectId/members/:userId', removeMember);

// Mount Label routes under /:projectId/labels
projectRoutes.use('/:projectId/labels', labelRoutes);

// Mount project dependency graph endpoint
projectRoutes.get('/:projectId/dependencies/graph', getProjectDependencyGraph);

// Mount Milestone routes under /:projectId/milestones
projectRoutes.use('/:projectId/milestones', milestoneRoutes);

// Timeline data endpoint
projectRoutes.get('/:projectId/timeline', getProjectTimeline);

// Mount Task routes under /:projectId/tasks
projectRoutes.use('/:projectId/tasks', taskRoutes);
