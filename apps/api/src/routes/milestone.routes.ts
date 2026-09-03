import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  listMilestones,
  createMilestone,
  getMilestone,
  updateMilestone,
  deleteMilestone,
} from '../controllers/milestone.controller.js';

export const milestoneRoutes = Router({ mergeParams: true });

milestoneRoutes.use(requireAuth);

// Project-scoped milestone CRUD
milestoneRoutes.get('/', listMilestones);
milestoneRoutes.post('/', createMilestone);
milestoneRoutes.get('/:milestoneId', getMilestone);
milestoneRoutes.patch('/:milestoneId', updateMilestone);
milestoneRoutes.delete('/:milestoneId', deleteMilestone);
