import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireOrgRole } from '../middleware/requireOrgRole.js';
import { globalSearch } from '../controllers/search.controller.js';

const router = Router({ mergeParams: true });

// Global search requires valid session authentication and organization workspace membership
router.use(requireAuth);
router.use(requireOrgRole());

router.get('/', globalSearch);

export default router;
