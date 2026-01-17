import express from 'express';
import { auth } from '../middleware/auth';
import { valveCommandLimiter } from '../middleware/rateLimiter';
import * as valveController from '../controllers/valveController';

const router = express.Router();

// All routes require authentication
router.use(auth);

// CRUD Operations
router.post('/', valveController.createValve);
router.get('/:id', valveController.getValve);
router.put('/:id', valveController.updateValve);
router.delete('/:id', valveController.deleteValve);

// Control Operations (with rate limiting to prevent hardware damage)
router.post('/:id/command', valveCommandLimiter, valveController.sendValveCommand);
router.get('/:id/status', valveController.getValveStatus);
router.get('/:id/history', valveController.getValveHistory);

// Alarm Operations
router.get('/:id/alarms', valveController.getValveAlarms);
router.post('/:id/alarms/:alarmId/acknowledge', valveController.acknowledgeAlarm);

// Schedule Operations
router.post('/:id/schedules', valveController.createSchedule);
router.put('/:id/schedules/:scheduleId', valveController.updateSchedule);
router.delete('/:id/schedules/:scheduleId', valveController.deleteSchedule);

// Bulk Operations
router.get('/manifold/:manifoldId', valveController.getManifoldValves);

export default router;
