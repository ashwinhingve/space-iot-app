import express from 'express';
import { auth } from '../middleware/auth';
import * as manifoldController from '../controllers/manifoldController';

const router = express.Router();

// All routes require authentication
router.use(auth);

// CRUD Operations
router.post('/', manifoldController.createManifold);
router.get('/', manifoldController.getManifolds);
router.get('/device/:deviceId', manifoldController.getManifoldByDevice);
router.get('/:id', manifoldController.getManifold);
router.put('/:id', manifoldController.updateManifold);
router.delete('/:id', manifoldController.deleteManifold);

// Real-time & Status
router.get('/:id/status', manifoldController.getManifoldStatus);
router.get('/:id/config', manifoldController.getManifoldConfig);

// Query Operations
// Keep device query route above dynamic :id route.

export default router;
