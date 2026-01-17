import { Request, Response } from 'express';
import { Valve } from '../models/Valve';
import { Manifold } from '../models/Manifold';
import { ValveCommand } from '../models/ValveCommand';
import { v4 as uuidv4 } from 'uuid';
import mqtt from 'mqtt';

// MQTT client (will be initialized in server.ts and passed via context)
// For now, we'll import from server or use dependency injection
// Temporary: We'll publish via global MQTT client

/**
 * Create a new valve
 *
 * @route POST /api/valves
 * @access Private
 */
export const createValve = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      manifoldId,
      esp32PinNumber,
      valveNumber,
      specifications,
      position
    } = req.body;

    // Validation
    if (!manifoldId || !esp32PinNumber || !valveNumber) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Manifold ID, GPIO pin, and valve number are required'
      });
      return;
    }

    // Check if manifold exists and belongs to user
    const manifold = await Manifold.findOne({
      _id: manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(404).json({
        error: 'MANIFOLD_NOT_FOUND',
        message: 'Manifold not found or you do not have access'
      });
      return;
    }

    // Check if valve number already exists for this manifold
    const existingValve = await Valve.findOne({ manifoldId, valveNumber });
    if (existingValve) {
      res.status(409).json({
        error: 'VALVE_EXISTS',
        message: `Valve ${valveNumber} already exists for this manifold`
      });
      return;
    }

    const valve = new Valve({
      valveId: `${manifold.manifoldId}-V${valveNumber}`,
      manifoldId,
      esp32PinNumber,
      valveNumber,
      specifications: specifications || {},
      position: position || { flowOrder: valveNumber }
    });

    await valve.save();

    res.status(201).json({
      success: true,
      message: 'Valve created successfully',
      valve
    });
  } catch (error: any) {
    console.error('Error creating valve:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error creating valve'
    });
  }
};

/**
 * Get single valve
 *
 * @route GET /api/valves/:id
 * @access Private
 */
export const getValve = async (req: Request, res: Response): Promise<void> => {
  try {
    const valve = await Valve.findById(req.params.id).populate('manifoldId', 'name manifoldId');

    if (!valve) {
      res.status(404).json({
        error: 'VALVE_NOT_FOUND',
        message: 'Valve not found'
      });
      return;
    }

    // Verify ownership via manifold
    const manifold = await Manifold.findOne({
      _id: valve.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this valve'
      });
      return;
    }

    res.json({
      success: true,
      valve
    });
  } catch (error: any) {
    console.error('Error fetching valve:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error fetching valve'
    });
  }
};

/**
 * Update valve
 *
 * @route PUT /api/valves/:id
 * @access Private
 */
export const updateValve = async (req: Request, res: Response): Promise<void> => {
  try {
    const valve = await Valve.findById(req.params.id);

    if (!valve) {
      res.status(404).json({
        error: 'VALVE_NOT_FOUND',
        message: 'Valve not found'
      });
      return;
    }

    // Verify ownership via manifold
    const manifold = await Manifold.findOne({
      _id: valve.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this valve'
      });
      return;
    }

    const {
      esp32PinNumber,
      specifications,
      position,
      operationalData
    } = req.body;

    // Update fields
    if (esp32PinNumber !== undefined) valve.esp32PinNumber = esp32PinNumber;
    if (specifications) {
      valve.specifications = { ...valve.specifications, ...specifications };
    }
    if (position) {
      valve.position = { ...valve.position, ...position };
    }
    if (operationalData && operationalData.mode) {
      valve.operationalData.mode = operationalData.mode;
    }

    await valve.save();

    res.json({
      success: true,
      message: 'Valve updated successfully',
      valve
    });
  } catch (error: any) {
    console.error('Error updating valve:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error updating valve'
    });
  }
};

/**
 * Delete valve
 *
 * @route DELETE /api/valves/:id
 * @access Private
 */
export const deleteValve = async (req: Request, res: Response): Promise<void> => {
  try {
    const valve = await Valve.findById(req.params.id);

    if (!valve) {
      res.status(404).json({
        error: 'VALVE_NOT_FOUND',
        message: 'Valve not found'
      });
      return;
    }

    // Verify ownership via manifold
    const manifold = await Manifold.findOne({
      _id: valve.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this valve'
      });
      return;
    }

    await Valve.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Valve deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting valve:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error deleting valve'
    });
  }
};

/**
 * Send valve command (ON/OFF)
 * Creates command in queue, publishes to MQTT
 *
 * @route POST /api/valves/:id/command
 * @access Private (Rate limited: 10 commands/min per manifold)
 */
export const sendValveCommand = async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, duration } = req.body;

    // Validation
    if (!action || !['ON', 'OFF'].includes(action)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Action must be ON or OFF'
      });
      return;
    }

    const valve = await Valve.findById(req.params.id).populate('manifoldId');

    if (!valve) {
      res.status(404).json({
        error: 'VALVE_NOT_FOUND',
        message: 'Valve not found'
      });
      return;
    }

    // Verify ownership via manifold
    const manifold = await Manifold.findOne({
      _id: valve.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this valve'
      });
      return;
    }

    // Check if valve is in MANUAL mode (AUTO mode uses schedules)
    if (valve.operationalData.mode === 'AUTO') {
      res.status(400).json({
        error: 'INVALID_MODE',
        message: 'Cannot send manual commands when valve is in AUTO mode'
      });
      return;
    }

    // Create command in queue
    const commandId = uuidv4();
    const command = new ValveCommand({
      commandId,
      manifoldId: manifold._id,
      valveId: valve._id,
      valveNumber: valve.valveNumber,
      action,
      issuedBy: req.user._id
    });

    await command.save();

    // Prepare MQTT message
    const mqttMessage = {
      commandId,
      valveNumber: valve.valveNumber,
      action,
      timestamp: Date.now()
    };

    // Publish to MQTT topic (manifolds/{manifoldId}/command)
    const topic = `manifolds/${manifold.manifoldId}/command`;

    // Note: In actual implementation, we'd get MQTT client from server context
    // For now, we'll mark command as SENT and emit event
    // The MQTT publishing will be handled in server.ts

    // Emit Socket.io event for frontend (will be handled in server.ts)
    if (req.app.get('io')) {
      req.app.get('io').to(`manifold-${manifold.manifoldId}`).emit('valveCommand', {
        valve: valve._id,
        action,
        commandId
      });
    }

    // Publish MQTT message (via global client)
    if (req.app.get('mqttClient')) {
      const mqttClient = req.app.get('mqttClient');
      mqttClient.publish(topic, JSON.stringify(mqttMessage));

      // Mark command as sent
      command.status = 'SENT';
      command.sentAt = new Date();
      await command.save();
    }

    // Update valve's last command
    valve.operationalData.lastCommand = {
      action,
      timestamp: new Date(),
      issuedBy: req.user._id
    };
    await valve.save();

    // Get queue position
    const queuePosition = await ValveCommand.countDocuments({
      manifoldId: manifold._id,
      status: 'PENDING',
      createdAt: { $lt: command.createdAt }
    });

    res.json({
      success: true,
      message: `Valve command ${action} sent successfully`,
      commandId,
      status: command.status,
      queuePosition,
      estimatedExecutionTime: new Date(Date.now() + (queuePosition * 500)) // 500ms per command
    });
  } catch (error: any) {
    console.error('Error sending valve command:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error sending valve command'
    });
  }
};

/**
 * Get valve status
 *
 * @route GET /api/valves/:id/status
 * @access Private
 */
export const getValveStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const valve = await Valve.findById(req.params.id).populate('manifoldId', 'name status');

    if (!valve) {
      res.status(404).json({
        error: 'VALVE_NOT_FOUND',
        message: 'Valve not found'
      });
      return;
    }

    // Verify ownership
    const manifold = await Manifold.findOne({
      _id: valve.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this valve'
      });
      return;
    }

    res.json({
      success: true,
      status: {
        valveId: valve.valveId,
        valveNumber: valve.valveNumber,
        currentStatus: valve.operationalData.currentStatus,
        mode: valve.operationalData.mode,
        cycleCount: valve.operationalData.cycleCount,
        totalRuntime: valve.operationalData.totalRuntime,
        lastCommand: valve.operationalData.lastCommand
      }
    });
  } catch (error: any) {
    console.error('Error fetching valve status:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error fetching valve status'
    });
  }
};

/**
 * Get valve command history
 *
 * @route GET /api/valves/:id/history
 * @access Private
 */
export const getValveHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 50 } = req.query;

    const valve = await Valve.findById(req.params.id);

    if (!valve) {
      res.status(404).json({
        error: 'VALVE_NOT_FOUND',
        message: 'Valve not found'
      });
      return;
    }

    // Verify ownership
    const manifold = await Manifold.findOne({
      _id: valve.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this valve'
      });
      return;
    }

    const commands = await ValveCommand.find({ valveId: valve._id })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('issuedBy', 'name email');

    res.json({
      success: true,
      history: commands
    });
  } catch (error: any) {
    console.error('Error fetching valve history:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error fetching valve history'
    });
  }
};

/**
 * Get valve alarms
 *
 * @route GET /api/valves/:id/alarms
 * @access Private
 */
export const getValveAlarms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { acknowledged } = req.query;

    const valve = await Valve.findById(req.params.id);

    if (!valve) {
      res.status(404).json({
        error: 'VALVE_NOT_FOUND',
        message: 'Valve not found'
      });
      return;
    }

    // Verify ownership
    const manifold = await Manifold.findOne({
      _id: valve.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this valve'
      });
      return;
    }

    let alarms = valve.alarms;

    // Filter by acknowledged status if provided
    if (acknowledged !== undefined) {
      const isAcknowledged = acknowledged === 'true';
      alarms = alarms.filter(alarm => alarm.acknowledged === isAcknowledged);
    }

    res.json({
      success: true,
      alarms
    });
  } catch (error: any) {
    console.error('Error fetching valve alarms:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error fetching valve alarms'
    });
  }
};

/**
 * Acknowledge alarm
 *
 * @route POST /api/valves/:id/alarms/:alarmId/acknowledge
 * @access Private
 */
export const acknowledgeAlarm = async (req: Request, res: Response): Promise<void> => {
  try {
    const valve = await Valve.findById(req.params.id);

    if (!valve) {
      res.status(404).json({
        error: 'VALVE_NOT_FOUND',
        message: 'Valve not found'
      });
      return;
    }

    // Verify ownership
    const manifold = await Manifold.findOne({
      _id: valve.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this valve'
      });
      return;
    }

    const alarm = valve.alarms.find(a => a.alarmId === req.params.alarmId);

    if (!alarm) {
      res.status(404).json({
        error: 'ALARM_NOT_FOUND',
        message: 'Alarm not found'
      });
      return;
    }

    alarm.acknowledged = true;
    alarm.acknowledgedBy = req.user._id;
    alarm.acknowledgedAt = new Date();

    await valve.save();

    res.json({
      success: true,
      message: 'Alarm acknowledged successfully',
      alarm
    });
  } catch (error: any) {
    console.error('Error acknowledging alarm:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error acknowledging alarm'
    });
  }
};

/**
 * Create irrigation schedule
 *
 * @route POST /api/valves/:id/schedules
 * @access Private
 */
export const createSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cronExpression, action, duration, enabled } = req.body;

    // Validation
    if (!cronExpression || !action) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Cron expression and action are required'
      });
      return;
    }

    const valve = await Valve.findById(req.params.id);

    if (!valve) {
      res.status(404).json({
        error: 'VALVE_NOT_FOUND',
        message: 'Valve not found'
      });
      return;
    }

    // Verify ownership
    const manifold = await Manifold.findOne({
      _id: valve.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this valve'
      });
      return;
    }

    const schedule = {
      scheduleId: uuidv4(),
      enabled: enabled !== undefined ? enabled : true,
      cronExpression,
      action,
      duration: duration || 0,
      createdBy: req.user._id,
      createdAt: new Date()
    };

    valve.schedules.push(schedule);
    await valve.save();

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      schedule
    });
  } catch (error: any) {
    console.error('Error creating schedule:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error creating schedule'
    });
  }
};

/**
 * Update irrigation schedule
 *
 * @route PUT /api/valves/:id/schedules/:scheduleId
 * @access Private
 */
export const updateSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const valve = await Valve.findById(req.params.id);

    if (!valve) {
      res.status(404).json({
        error: 'VALVE_NOT_FOUND',
        message: 'Valve not found'
      });
      return;
    }

    // Verify ownership
    const manifold = await Manifold.findOne({
      _id: valve.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this valve'
      });
      return;
    }

    const schedule = valve.schedules.find(s => s.scheduleId === req.params.scheduleId);

    if (!schedule) {
      res.status(404).json({
        error: 'SCHEDULE_NOT_FOUND',
        message: 'Schedule not found'
      });
      return;
    }

    const { cronExpression, action, duration, enabled } = req.body;

    // Update fields
    if (cronExpression) schedule.cronExpression = cronExpression;
    if (action) schedule.action = action;
    if (duration !== undefined) schedule.duration = duration;
    if (enabled !== undefined) schedule.enabled = enabled;

    await valve.save();

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      schedule
    });
  } catch (error: any) {
    console.error('Error updating schedule:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error updating schedule'
    });
  }
};

/**
 * Delete irrigation schedule
 *
 * @route DELETE /api/valves/:id/schedules/:scheduleId
 * @access Private
 */
export const deleteSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const valve = await Valve.findById(req.params.id);

    if (!valve) {
      res.status(404).json({
        error: 'VALVE_NOT_FOUND',
        message: 'Valve not found'
      });
      return;
    }

    // Verify ownership
    const manifold = await Manifold.findOne({
      _id: valve.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this valve'
      });
      return;
    }

    const scheduleIndex = valve.schedules.findIndex(s => s.scheduleId === req.params.scheduleId);

    if (scheduleIndex === -1) {
      res.status(404).json({
        error: 'SCHEDULE_NOT_FOUND',
        message: 'Schedule not found'
      });
      return;
    }

    valve.schedules.splice(scheduleIndex, 1);
    await valve.save();

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error deleting schedule'
    });
  }
};

/**
 * Get all valves for a manifold
 *
 * @route GET /api/valves/manifold/:manifoldId
 * @access Private
 */
export const getManifoldValves = async (req: Request, res: Response): Promise<void> => {
  try {
    // Verify ownership
    const manifold = await Manifold.findOne({
      _id: req.params.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(404).json({
        error: 'MANIFOLD_NOT_FOUND',
        message: 'Manifold not found or you do not have access'
      });
      return;
    }

    const valves = await Valve.find({ manifoldId: manifold._id })
      .sort({ valveNumber: 1 });

    res.json({
      success: true,
      valves
    });
  } catch (error: any) {
    console.error('Error fetching manifold valves:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error fetching manifold valves'
    });
  }
};
