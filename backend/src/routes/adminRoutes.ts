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

// All admin routes require authentication + admin or super_admin role
router.use(auth, authorize('admin', 'super_admin'));

// System config changes are super_admin only
router.patch('/config',                    authorize('super_admin'), updateSystemConfig);
router.get('/users',                       getUsers);
router.post('/users',                      createUser);
router.patch('/users/:id/role',            updateUserRole);
router.patch('/users/:id/permissions',     updateUserPermissions);
router.patch('/users/:id/profile',         updateUserProfile);
router.patch('/users/:id/active',          toggleUserActive);
router.delete('/users/:id',               deleteUser);
router.get('/stats',                       getStats);

export default router;
