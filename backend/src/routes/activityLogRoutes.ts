import { Router } from 'express';
import { auth } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { getLogs } from '../controllers/activityLogController';

const router = Router();

router.get('/', auth, authorize('admin'), getLogs);

export default router;
