import { Request, Response } from 'express';
import { Valve } from '../models/Valve';
import { Manifold } from '../models/Manifold';
import { ValveCommand } from '../models/ValveCommand';
import { v4 as uuidv4 } from 'uuid';

const publishValveCommand = async (
  req: Request,
  manifold: any,
  valve: any,
  action: 'ON' | 'OFF',
  duration?: number
) => {
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

  const topic = `manifolds/${manifold.manifoldId}/command`;
  const mqttMessage = {
    commandId,
    valveNumber: valve.valveNumber,
    action,
    duration: duration || 0,
    timestamp: Date.now()
  };

  if (req.app.get('io')) {
    req.app.get('io').to(`manifold-${manifold.manifoldId}`).emit('valveCommand', {
      manifoldId: manifold.manifoldId,
      valveId: valve._id,
      valveNumber: valve.valveNumber,
      action,
      duration: duration || 0,
      commandId
    });
  }

  if (req.app.get('mqttClient')) {
    const mqttClient = req.app.get('mqttClient');
    mqttClient.publish(topic, JSON.stringify(mqttMessage));
    command.status = 'SENT';
    command.sentAt = new Date();
    await command.save();
  }

  return { commandId, command };
};

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
 * Update valve operating mode
 *
 * @route PATCH /api/valves/:id/mode
 * @access Private
 */
export const updateValveMode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mode } = req.body;
    if (!mode || !['AUTO', 'MANUAL'].includes(mode)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Mode must be AUTO or MANUAL'
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

    valve.operationalData.mode = mode;
    await valve.save();

    if (req.app.get('mqttClient')) {
      const mqttClient = req.app.get('mqttClient');
      mqttClient.publish(
        `manifolds/${manifold.manifoldId}/config`,
        JSON.stringify({
          type: 'MODE',
          valveNumber: valve.valveNumber,
          mode,
          timestamp: Date.now()
        })
      );
    }

    if (req.app.get('io')) {
      req.app.get('io').to(`manifold-${manifold.manifoldId}`).emit('valveModeUpdated', {
        manifoldId: manifold.manifoldId,
        valveId: valve._id,
        valveNumber: valve.valveNumber,
        mode
      });
    }

    res.json({
      success: true,
      message: 'Valve mode updated successfully',
      valveId: valve._id,
      mode
    });
  } catch (error: any) {
    console.error('Error updating valve mode:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error updating valve mode'
    });
  }
};

/**
 * Configure valve alarm rule
 *
 * @route PATCH /api/valves/:id/alarm-config
 * @access Private
 */
export const configureValveAlarm = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      enabled,
      ruleType,
      metric,
      operator,
      threshold,
      triggerStatus,
      notify
    } = req.body;

    const valve = await Valve.findById(req.params.id);
    if (!valve) {
      res.status(404).json({
        error: 'VALVE_NOT_FOUND',
        message: 'Valve not found'
      });
      return;
    }

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

    valve.alarmConfig = {
      enabled: enabled !== undefined ? Boolean(enabled) : valve.alarmConfig?.enabled || false,
      ruleType: ruleType || valve.alarmConfig?.ruleType || 'STATUS',
      metric: metric || valve.alarmConfig?.metric || 'status',
      operator: operator || valve.alarmConfig?.operator || '==',
      threshold: threshold !== undefined ? Number(threshold) : valve.alarmConfig?.threshold,
      triggerStatus: triggerStatus || valve.alarmConfig?.triggerStatus || 'FAULT',
      notify: notify !== undefined ? Boolean(notify) : valve.alarmConfig?.notify || true
    };

    await valve.save();

    if (req.app.get('mqttClient')) {
      const mqttClient = req.app.get('mqttClient');
      mqttClient.publish(
        `manifolds/${manifold.manifoldId}/config`,
        JSON.stringify({
          type: 'ALARM_CONFIG',
          valveNumber: valve.valveNumber,
          alarmConfig: valve.alarmConfig,
          timestamp: Date.now()
        })
      );
    }

    res.json({
      success: true,
      message: 'Valve alarm configuration updated',
      alarmConfig: valve.alarmConfig
    });
  } catch (error: any) {
    console.error('Error configuring valve alarm:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error configuring valve alarm'
    });
  }
};

/**
 * Configure valve auto-off timer
 *
 * @route PATCH /api/valves/:id/timer
 * @access Private
 */
export const configureValveTimer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { autoOffDurationSec } = req.body;
    if (autoOffDurationSec === undefined || autoOffDurationSec < 0) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'autoOffDurationSec must be a non-negative number'
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

    valve.operationalData.autoOffDurationSec = Number(autoOffDurationSec);
    await valve.save();

    if (req.app.get('mqttClient')) {
      const mqttClient = req.app.get('mqttClient');
      mqttClient.publish(
        `manifolds/${manifold.manifoldId}/config`,
        JSON.stringify({
          type: 'AUTO_OFF_TIMER',
          valveNumber: valve.valveNumber,
          autoOffDurationSec: valve.operationalData.autoOffDurationSec,
          timestamp: Date.now()
        })
      );
    }

    res.json({
      success: true,
      message: 'Valve timer updated successfully',
      valveId: valve._id,
      autoOffDurationSec: valve.operationalData.autoOffDurationSec
    });
  } catch (error: any) {
    console.error('Error configuring valve timer:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error configuring valve timer'
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

    const { commandId, command } = await publishValveCommand(
      req,
      manifold,
      valve,
      action,
      duration
    );

    // Update valve's last command
    valve.operationalData.lastCommand = {
      action,
      timestamp: new Date(),
      issuedBy: req.user._id
    };
    valve.operationalData.currentStatus = action;
    valve.operationalData.cycleCount += 1;
    if (duration !== undefined && duration >= 0) {
      valve.operationalData.autoOffDurationSec = Number(duration);
    }
    await valve.save();

    if (action === 'ON' && duration && duration > 0) {
      setTimeout(async () => {
        try {
          const liveValve = await Valve.findById(valve._id);
          const liveManifold = await Manifold.findById(manifold._id);
          if (!liveValve || !liveManifold) return;
          if (liveValve.operationalData.mode !== 'AUTO' && liveValve.operationalData.currentStatus === 'ON') {
            await publishValveCommand(
              req,
              liveManifold,
              liveValve,
              'OFF'
            );
            liveValve.operationalData.currentStatus = 'OFF';
            liveValve.operationalData.lastCommand = {
              action: 'OFF',
              timestamp: new Date(),
              issuedBy: req.user._id
            };
            await liveValve.save();
          }
        } catch (error) {
          console.error('Error in auto-off timer:', error);
        }
      }, Number(duration) * 1000);
    }

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
    const { cronExpression, action, duration, enabled, startAt, endAt } = req.body;

    // Validation
    if (!action) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Action is required'
      });
      return;
    }

    const hasCron = Boolean(cronExpression);
    const hasStartEnd = Boolean(startAt && endAt);

    if (!hasCron && !hasStartEnd) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Either cronExpression or startAt/endAt is required'
      });
      return;
    }

    let parsedStartAt: Date | undefined;
    let parsedEndAt: Date | undefined;
    if (hasStartEnd) {
      parsedStartAt = new Date(startAt);
      parsedEndAt = new Date(endAt);
      if (Number.isNaN(parsedStartAt.getTime()) || Number.isNaN(parsedEndAt.getTime())) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid startAt or endAt date'
        });
        return;
      }
      if (parsedEndAt <= parsedStartAt) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'endAt must be later than startAt'
        });
        return;
      }
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
      cronExpression: cronExpression || '',
      action,
      duration: duration || 0,
      startAt: parsedStartAt,
      endAt: parsedEndAt,
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

    const { cronExpression, action, duration, enabled, startAt, endAt } = req.body;

    let parsedStartAt: Date | undefined;
    let parsedEndAt: Date | undefined;
    if (startAt !== undefined || endAt !== undefined) {
      parsedStartAt = startAt ? new Date(startAt) : (schedule.startAt ? new Date(schedule.startAt as any) : undefined);
      parsedEndAt = endAt ? new Date(endAt) : (schedule.endAt ? new Date(schedule.endAt as any) : undefined);

      if (
        (parsedStartAt && Number.isNaN(parsedStartAt.getTime())) ||
        (parsedEndAt && Number.isNaN(parsedEndAt.getTime()))
      ) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid startAt or endAt date'
        });
        return;
      }

      if (parsedStartAt && parsedEndAt && parsedEndAt <= parsedStartAt) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'endAt must be later than startAt'
        });
        return;
      }
    }

    // Update fields
    if (cronExpression !== undefined) schedule.cronExpression = cronExpression;
    if (action) schedule.action = action;
    if (duration !== undefined) schedule.duration = duration;
    if (enabled !== undefined) schedule.enabled = enabled;
    if (startAt !== undefined) schedule.startAt = parsedStartAt as any;
    if (endAt !== undefined) schedule.endAt = parsedEndAt as any;

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
