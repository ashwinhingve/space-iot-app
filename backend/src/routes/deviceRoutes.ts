import express from 'express';
import { auth } from '../middleware/auth';
import {
  createDevice,
  getDevices,
  getDevice,
  updateDevice,
  deleteDevice,
  controlDevice
} from '../controllers/deviceController';

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

router.post('/', createDevice);
router.get('/', getDevices);
router.get('/:id', getDevice);
router.put('/:id', updateDevice);
router.delete('/:id', deleteDevice);
router.post('/:id/control', controlDevice);

export default router; 