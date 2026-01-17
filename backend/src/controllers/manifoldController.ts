import { Request, Response } from 'express';
import { Manifold } from '../models/Manifold';
import { Valve } from '../models/Valve';
import { Component } from '../models/Component';
import { Device } from '../models/Device';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new manifold
 * Automatically creates 4 valves with default GPIO pin mappings
 *
 * @route POST /api/manifolds
 * @access Private
 */
export const createManifold = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      esp32DeviceId,
      specifications,
      installationDetails,
      gpioPins
    } = req.body;

    // Validation
    if (!name || !esp32DeviceId) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Name and ESP32 device ID are required'
      });
      return;
    }

    // Check if device exists and belongs to user
    const device = await Device.findOne({
      _id: esp32DeviceId,
      owner: req.user._id
    });

    if (!device) {
      res.status(404).json({
        error: 'DEVICE_NOT_FOUND',
        message: 'ESP32 device not found or you do not have access'
      });
      return;
    }

    // Check if device is already linked to a manifold
    const existingManifold = await Manifold.findOne({ esp32DeviceId });
    if (existingManifold) {
      res.status(409).json({
        error: 'DEVICE_ALREADY_LINKED',
        message: 'This ESP32 device is already linked to a manifold'
      });
      return;
    }

    // Generate unique manifold ID
    const manifoldId = `MANIFOLD-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Create manifold
    const manifold = new Manifold({
      manifoldId,
      name,
      esp32DeviceId,
      owner: req.user._id,
      specifications: specifications || {},
      installationDetails: installationDetails || {}
    });

    await manifold.save();

    // Default GPIO pins (user can override)
    const defaultPins = gpioPins || [12, 13, 14, 15];

    // Create 4 valves automatically
    const valves = [];
    for (let i = 1; i <= 4; i++) {
      const valve = new Valve({
        valveId: `${manifoldId}-V${i}`,
        manifoldId: manifold._id,
        esp32PinNumber: defaultPins[i - 1],
        valveNumber: i,
        position: {
          flowOrder: i,
          zone: `Zone ${i}`
        }
      });
      await valve.save();
      valves.push(valve);
    }

    res.status(201).json({
      success: true,
      message: 'Manifold created successfully with 4 valves',
      manifold,
      valves
    });
  } catch (error: any) {
    console.error('Error creating manifold:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error creating manifold'
    });
  }
};

/**
 * Get all manifolds for the authenticated user
 *
 * @route GET /api/manifolds
 * @access Private
 */
export const getManifolds = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query: any = { owner: req.user._id };

    // Filter by status if provided
    if (status && ['Active', 'Maintenance', 'Offline', 'Fault'].includes(status as string)) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const manifolds = await Manifold.find(query)
      .populate('esp32DeviceId', 'name mqttTopic status lastSeen')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Manifold.countDocuments(query);

    res.json({
      success: true,
      manifolds,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Error fetching manifolds:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error fetching manifolds'
    });
  }
};

/**
 * Get single manifold with valves and components
 *
 * @route GET /api/manifolds/:id
 * @access Private
 */
export const getManifold = async (req: Request, res: Response): Promise<void> => {
  try {
    const manifold = await Manifold.findOne({
      _id: req.params.id,
      owner: req.user._id
    }).populate('esp32DeviceId', 'name mqttTopic status lastSeen');

    if (!manifold) {
      res.status(404).json({
        error: 'MANIFOLD_NOT_FOUND',
        message: 'Manifold not found'
      });
      return;
    }

    // Get associated valves
    const valves = await Valve.find({ manifoldId: manifold._id })
      .sort({ valveNumber: 1 });

    // Get associated components
    const components = await Component.find({ manifoldId: manifold._id })
      .sort({ 'position.flowOrder': 1 });

    res.json({
      success: true,
      manifold,
      valves,
      components
    });
  } catch (error: any) {
    console.error('Error fetching manifold:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error fetching manifold'
    });
  }
};

/**
 * Update manifold
 *
 * @route PUT /api/manifolds/:id
 * @access Private
 */
export const updateManifold = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      specifications,
      installationDetails,
      status,
      metadata
    } = req.body;

    const manifold = await Manifold.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(404).json({
        error: 'MANIFOLD_NOT_FOUND',
        message: 'Manifold not found'
      });
      return;
    }

    // Update fields
    if (name) manifold.name = name;
    if (specifications) {
      manifold.specifications = { ...manifold.specifications, ...specifications };
    }
    if (installationDetails) {
      manifold.installationDetails = { ...manifold.installationDetails, ...installationDetails };
    }
    if (status) manifold.status = status;
    if (metadata) {
      manifold.metadata = { ...manifold.metadata, ...metadata };
    }

    await manifold.save();

    res.json({
      success: true,
      message: 'Manifold updated successfully',
      manifold
    });
  } catch (error: any) {
    console.error('Error updating manifold:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error updating manifold'
    });
  }
};

/**
 * Delete manifold (cascade deletes valves and components)
 *
 * @route DELETE /api/manifolds/:id
 * @access Private
 */
export const deleteManifold = async (req: Request, res: Response): Promise<void> => {
  try {
    const manifold = await Manifold.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(404).json({
        error: 'MANIFOLD_NOT_FOUND',
        message: 'Manifold not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Manifold and associated valves/components deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting manifold:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error deleting manifold'
    });
  }
};

/**
 * Get real-time manifold status
 *
 * @route GET /api/manifolds/:id/status
 * @access Private
 */
export const getManifoldStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const manifold = await Manifold.findOne({
      _id: req.params.id,
      owner: req.user._id
    }).populate('esp32DeviceId', 'name status lastSeen');

    if (!manifold) {
      res.status(404).json({
        error: 'MANIFOLD_NOT_FOUND',
        message: 'Manifold not found'
      });
      return;
    }

    const valves = await Valve.find({ manifoldId: manifold._id })
      .select('valveId valveNumber operationalData.currentStatus operationalData.mode')
      .sort({ valveNumber: 1 });

    // Get active alarms
    const alarmsAggregation = await Valve.aggregate([
      { $match: { manifoldId: manifold._id } },
      { $unwind: '$alarms' },
      { $match: { 'alarms.acknowledged': false } },
      { $project: {
        valveNumber: 1,
        alarm: '$alarms'
      }},
      { $sort: { 'alarm.severity': -1, 'alarm.timestamp': -1 } }
    ]);

    res.json({
      success: true,
      manifold: {
        _id: manifold._id,
        manifoldId: manifold.manifoldId,
        name: manifold.name,
        status: manifold.status
      },
      device: manifold.esp32DeviceId,
      valves: valves.map(v => ({
        valveId: v.valveId,
        valveNumber: v.valveNumber,
        status: v.operationalData.currentStatus,
        mode: v.operationalData.mode
      })),
      alarms: alarmsAggregation,
      lastUpdate: new Date()
    });
  } catch (error: any) {
    console.error('Error fetching manifold status:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error fetching manifold status'
    });
  }
};

/**
 * Get manifold configuration for ESP32
 * Returns GPIO pin mappings for all valves
 *
 * @route GET /api/manifolds/:id/config
 * @access Private
 */
export const getManifoldConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const manifold = await Manifold.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(404).json({
        error: 'MANIFOLD_NOT_FOUND',
        message: 'Manifold not found'
      });
      return;
    }

    const valves = await Valve.find({ manifoldId: manifold._id })
      .select('valveNumber esp32PinNumber')
      .sort({ valveNumber: 1 });

    res.json({
      success: true,
      manifoldId: manifold.manifoldId,
      valves: valves.map(v => ({
        valveNumber: v.valveNumber,
        pinNumber: v.esp32PinNumber
      }))
    });
  } catch (error: any) {
    console.error('Error fetching manifold config:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error fetching manifold configuration'
    });
  }
};

/**
 * Get manifold by ESP32 device ID
 *
 * @route GET /api/manifolds/device/:deviceId
 * @access Private
 */
export const getManifoldByDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const manifold = await Manifold.findOne({
      esp32DeviceId: req.params.deviceId,
      owner: req.user._id
    }).populate('esp32DeviceId', 'name mqttTopic status lastSeen');

    if (!manifold) {
      res.status(404).json({
        error: 'MANIFOLD_NOT_FOUND',
        message: 'No manifold found for this device'
      });
      return;
    }

    const valves = await Valve.find({ manifoldId: manifold._id })
      .sort({ valveNumber: 1 });

    res.json({
      success: true,
      manifold,
      valves
    });
  } catch (error: any) {
    console.error('Error fetching manifold by device:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error fetching manifold'
    });
  }
};
