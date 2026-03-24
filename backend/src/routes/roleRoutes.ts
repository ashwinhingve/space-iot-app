import { Router } from 'express';
import { auth } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { getRoles, getRole, createRole, updateRole, deleteRole } from '../controllers/roleController';

const router = Router();

// Public read (any authenticated user needs to know available roles)
router.get('/', auth, getRoles);
router.get('/:slug', auth, getRole);

// Admin-only writes
router.post('/', auth, authorize('admin'), createRole);
router.patch('/:slug', auth, authorize('admin'), updateRole);
router.delete('/:slug', auth, authorize('admin'), deleteRole);

export default router;
