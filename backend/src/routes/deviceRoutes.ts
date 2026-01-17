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

// All routes require authentication
router.get('/', auth, getDevices);
router.get('/:id', auth, getDevice);
router.post('/', auth, createDevice);
router.put('/:id', auth, updateDevice);
router.delete('/:id', auth, deleteDevice);
router.post('/:id/control', auth, controlDevice);

export default router; 