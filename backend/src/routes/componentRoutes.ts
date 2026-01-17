import express from 'express';
import { auth } from '../middleware/auth';
import * as componentController from '../controllers/componentController';

const router = express.Router();

// All routes require authentication
router.use(auth);

// CRUD Operations
router.post('/', componentController.createComponent);
router.get('/:id', componentController.getComponent);
router.put('/:id', componentController.updateComponent);
router.delete('/:id', componentController.deleteComponent);

// Maintenance Operations
router.post('/:id/maintenance', componentController.addMaintenanceRecord);
router.get('/:id/maintenance', componentController.getMaintenanceHistory);

// Bulk Operations
router.get('/manifold/:manifoldId', componentController.getManifoldComponents);

export default router;
