/**
 * TTN API Routes
 * RESTful API for TTN integration management
 */

import express from 'express';
import { auth } from '../middleware/auth';
import {
  getApplications,
  getApplication,
  createApplication,
  updateApplication,
  updateApiKey,
  deleteApplication,
  syncDevices,
  getDevices,
  getDevice,
  updateDevice,
  getUplinks,
  sendDownlink,
  getDownlinks,
  getLogs,
  exportLogs,
  getStats,
  getGateways,
  getGateway,
  getGatewayStats,
} from '../controllers/ttnController';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Application routes
router.get('/applications', getApplications);
router.get('/applications/:id', getApplication);
router.post('/applications', createApplication);
router.put('/applications/:id', updateApplication);
router.put('/applications/:id/api-key', updateApiKey);
router.delete('/applications/:id', deleteApplication);

// Device sync
router.post('/applications/:applicationId/sync', syncDevices);

// Device routes
router.get('/applications/:applicationId/devices', getDevices);
router.get('/applications/:applicationId/devices/:deviceId', getDevice);
router.put('/applications/:applicationId/devices/:deviceId', updateDevice);

// Uplink routes
router.get('/applications/:applicationId/uplinks', getUplinks);
router.get('/applications/:applicationId/devices/:deviceId/uplinks', getUplinks);

// Downlink routes
router.post('/applications/:applicationId/devices/:deviceId/downlink', sendDownlink);
router.get('/applications/:applicationId/downlinks', getDownlinks);
router.get('/applications/:applicationId/devices/:deviceId/downlinks', getDownlinks);

// Logs routes (unified uplink + downlink)
router.get('/applications/:applicationId/logs', getLogs);
router.get('/applications/:applicationId/logs/export', exportLogs);

// Gateway routes
router.get('/applications/:applicationId/gateways', getGateways);
router.get('/applications/:applicationId/gateways/:gatewayId', getGateway);
router.get('/applications/:applicationId/gateway-stats', getGatewayStats);

// Stats route
router.get('/applications/:applicationId/stats', getStats);

export default router;
