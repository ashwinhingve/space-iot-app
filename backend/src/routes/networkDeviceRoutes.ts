import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  getNetworkDevices,
  getNetworkDeviceStats,
  getNetworkDevice,
  createNetworkDevice,
  updateNetworkDevice,
  deleteNetworkDevice,
  updateNetworkDeviceStatus,
} from '../controllers/networkDeviceController';

const router = Router();

// All routes require authentication
router.use(auth);

// Static routes MUST come before dynamic /:id routes
router.get('/stats', getNetworkDeviceStats);
router.get('/', getNetworkDevices);
router.post('/', createNetworkDevice);
router.get('/:id', getNetworkDevice);
router.put('/:id', updateNetworkDevice);
router.delete('/:id', deleteNetworkDevice);
router.patch('/:id/status', updateNetworkDeviceStatus);

export default router;
