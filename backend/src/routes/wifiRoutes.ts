import express from 'express';
import { auth } from '../middleware/auth';
import { deviceAuth } from '../middleware/deviceAuth';
import {
  saveWiFiConfig,
  getWiFiConfig,
  listWiFiConfigs,
  deleteWiFiConfig
} from '../controllers/wifiController';

const router = express.Router();

// User routes (require user authentication)
router.post('/wifi', auth, saveWiFiConfig);
router.get('/wifi/list', auth, listWiFiConfigs);
router.delete('/wifi/:deviceId', auth, deleteWiFiConfig);

// Device routes (require device API key authentication)
router.get('/:deviceId/wifi', deviceAuth, getWiFiConfig);

export default router;
