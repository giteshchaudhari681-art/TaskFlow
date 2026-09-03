import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { workController } from '../controllers/work.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/my-work', (req, res, next) => workController.getMyWork(req, res, next));

export default router;
