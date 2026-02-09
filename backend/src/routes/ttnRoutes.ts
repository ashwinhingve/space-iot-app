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
  deleteApplication,
  syncDevices,
  getDevices,
  getDevice,
  getUplinks,
  sendDownlink,
  getDownlinks,
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
router.delete('/applications/:id', deleteApplication);

// Device sync
router.post('/applications/:applicationId/sync', syncDevices);

// Device routes
router.get('/applications/:applicationId/devices', getDevices);
router.get('/applications/:applicationId/devices/:deviceId', getDevice);

// Uplink routes
router.get('/applications/:applicationId/uplinks', getUplinks);
router.get('/applications/:applicationId/devices/:deviceId/uplinks', getUplinks);

// Downlink routes
router.post('/applications/:applicationId/devices/:deviceId/downlink', sendDownlink);
router.get('/applications/:applicationId/downlinks', getDownlinks);
router.get('/applications/:applicationId/devices/:deviceId/downlinks', getDownlinks);

// Gateway routes
router.get('/applications/:applicationId/gateways', getGateways);
router.get('/applications/:applicationId/gateways/:gatewayId', getGateway);
router.get('/applications/:applicationId/gateway-stats', getGatewayStats);

// Stats route
router.get('/applications/:applicationId/stats', getStats);

export default router;
