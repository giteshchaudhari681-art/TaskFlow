import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  listLabels,
  createLabel,
  updateLabel,
  deleteLabel,
} from '../controllers/label.controller.js';

export const labelRoutes = Router({ mergeParams: true });

// All label endpoints require authenticated session
labelRoutes.use(requireAuth);

// Label CRUD
labelRoutes.get('/', listLabels);
labelRoutes.post('/', createLabel);
labelRoutes.patch('/:labelId', updateLabel);
labelRoutes.delete('/:labelId', deleteLabel);
