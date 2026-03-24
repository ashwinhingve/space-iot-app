import { Router } from 'express';
import { auth } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import {
  getUsers,
  createUser,
  updateUserRole,
  updateUserPermissions,
  updateUserProfile,
  toggleUserActive,
  deleteUser,
  getStats,
  getSystemConfig,
  updateSystemConfig,
} from '../controllers/adminController';

const router = Router();

// Public config endpoint (mode check for frontend)
router.get('/config', getSystemConfig);

// All other admin routes require authentication + admin role
router.use(auth, authorize('admin'));

router.patch('/config',                    updateSystemConfig);
router.get('/users',                       getUsers);
router.post('/users',                      createUser);
router.patch('/users/:id/role',            updateUserRole);
router.patch('/users/:id/permissions',     updateUserPermissions);
router.patch('/users/:id/profile',         updateUserProfile);
router.patch('/users/:id/active',          toggleUserActive);
router.delete('/users/:id',               deleteUser);
router.get('/stats',                       getStats);

export default router;
