/**
 * TTN Controller
 * Handles API requests for TTN integration
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import { TTNApplication } from '../models/TTNApplication';
import { TTNDevice } from '../models/TTNDevice';
import { TTNUplink } from '../models/TTNUplink';
import { TTNDownlink } from '../models/TTNDownlink';
import { TTNGateway } from '../models/TTNGateway';
import { ttnService, TTNConfig } from '../services/ttnService';

/**
 * Get all TTN applications for the current user
 */
export const getApplications = async (req: Request, res: Response) => {
  try {
    const applications = await TTNApplication.find({ owner: req.user._id })
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    console.error('Error fetching TTN applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

/**
 * Get a specific TTN application
 */
export const getApplication = async (req: Request, res: Response) => {
  try {
    const application = await TTNApplication.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(application);
  } catch (error) {
    console.error('Error fetching TTN application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
};

/**
 * Create/register a TTN application
 */
export const createApplication = async (req: Request, res: Response) => {
  try {
    const { applicationId, name, description, ttnRegion, apiKey } = req.body;

    // Check if application already exists
    const existing = await TTNApplication.findOne({ applicationId });
    if (existing) {
      return res.status(400).json({ error: 'Application already registered' });
    }

    // Verify connection to TTN
    const config: TTNConfig = {
      region: ttnRegion || 'eu1',
      applicationId,
      apiKey,
    };

    ttnService.initialize(config);

    try {
      const ttnApp = await ttnService.getApplication();
      if (!ttnApp) {
        return res.status(400).json({ error: 'Could not verify TTN application. Check your API key and application ID.' });
      }
    } catch (ttnError: unknown) {
      const errorMessage = ttnError instanceof Error ? ttnError.message : 'Unknown error';
      return res.status(400).json({ error: `TTN connection failed: ${errorMessage}` });
    }

    // Generate webhook secret
    const webhookSecret = ttnService.generateWebhookSecret();

    // Create application in database
    const application = new TTNApplication({
      applicationId,
      name: name || applicationId,
      description,
      owner: req.user._id,
      ttnRegion: ttnRegion || 'eu1',
      webhookSecret,
      isActive: true,
    });

    await application.save();

    // Store API key securely (in production, use a secrets manager)
    // For now, we'll re-initialize on each request using stored config

    res.status(201).json({
      success: true,
      application,
      webhookUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/ttn/webhook/${applicationId}`,
      webhookSecret,
      message: 'Application registered. Configure the webhook URL in TTN Console.',
    });
  } catch (error) {
    console.error('Error creating TTN application:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
};

/**
 * Update a TTN application
 */
export const updateApplication = async (req: Request, res: Response) => {
  try {
    const { name, description, isActive } = req.body;

    const application = await TTNApplication.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: { name, description, isActive } },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(application);
  } catch (error) {
    console.error('Error updating TTN application:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
};

/**
 * Delete a TTN application
 */
export const deleteApplication = async (req: Request, res: Response) => {
  try {
    // First find the application to get applicationId
    const application = await TTNApplication.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const appId = application.applicationId;

    // Delete the application
    await TTNApplication.deleteOne({ _id: req.params.id });

    // Also delete associated devices, uplinks, downlinks, and gateways
    await Promise.all([
      TTNDevice.deleteMany({ applicationId: appId, owner: req.user._id }),
      TTNUplink.deleteMany({ applicationId: appId, owner: req.user._id }),
      TTNDownlink.deleteMany({ applicationId: appId, owner: req.user._id }),
      TTNGateway.deleteMany({ applicationId: appId, owner: req.user._id }),
    ]);

    res.json({ success: true, message: 'Application and associated data deleted' });
  } catch (error) {
    console.error('Error deleting TTN application:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
};

/**
 * Sync devices from TTN
 */
export const syncDevices = async (req: Request, res: Response) => {
  try {
    const { applicationId, apiKey } = req.body;

    const application = await TTNApplication.findOne({
      applicationId,
      owner: req.user._id,
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Initialize TTN service
    const config: TTNConfig = {
      region: application.ttnRegion,
      applicationId,
      apiKey,
    };

    ttnService.initialize(config);

    // Fetch devices from TTN
    const ttnDevices = await ttnService.getDevices();

    // Sync devices to database
    const syncedDevices = [];
    for (const ttnDevice of ttnDevices) {
      const deviceData = {
        deviceId: ttnDevice.ids.device_id,
        applicationId,
        owner: req.user._id,
        name: ttnDevice.name || ttnDevice.ids.device_id,
        description: ttnDevice.description,
        devEui: ttnDevice.ids.dev_eui,
        joinEui: ttnDevice.ids.join_eui,
        devAddr: ttnDevice.ids.dev_addr,
        attributes: ttnDevice.attributes,
      };

      const device = await TTNDevice.findOneAndUpdate(
        { deviceId: ttnDevice.ids.device_id, applicationId },
        { $set: deviceData },
        { upsert: true, new: true }
      );

      syncedDevices.push(device);
    }

    // Update last sync time
    application.lastSync = new Date();
    await application.save();

    res.json({
      success: true,
      syncedCount: syncedDevices.length,
      devices: syncedDevices,
    });
  } catch (error) {
    console.error('Error syncing TTN devices:', error);
    res.status(500).json({ error: 'Failed to sync devices' });
  }
};

/**
 * Get all devices for an application
 */
export const getDevices = async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;

    const devices = await TTNDevice.find({
      applicationId,
      owner: req.user._id,
    }).sort({ lastSeen: -1 });

    res.json(devices);
  } catch (error) {
    console.error('Error fetching TTN devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
};

/**
 * Get a specific device
 */
export const getDevice = async (req: Request, res: Response) => {
  try {
    const { applicationId, deviceId } = req.params;

    const device = await TTNDevice.findOne({
      deviceId,
      applicationId,
      owner: req.user._id,
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(device);
  } catch (error) {
    console.error('Error fetching TTN device:', error);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
};

/**
 * Get uplinks for a device
 */
export const getUplinks = async (req: Request, res: Response) => {
  try {
    const { applicationId, deviceId } = req.params;
    const { limit = 50, offset = 0, startDate, endDate } = req.query;

    const query: Record<string, unknown> = {
      applicationId,
      owner: req.user._id,
    };

    if (deviceId && deviceId !== 'all') {
      query.deviceId = deviceId;
    }

    if (startDate || endDate) {
      query.receivedAt = {};
      if (startDate) (query.receivedAt as Record<string, unknown>).$gte = new Date(startDate as string);
      if (endDate) (query.receivedAt as Record<string, unknown>).$lte = new Date(endDate as string);
    }

    const uplinks = await TTNUplink.find(query)
      .sort({ receivedAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    const total = await TTNUplink.countDocuments(query);

    res.json({
      uplinks,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Error fetching TTN uplinks:', error);
    res.status(500).json({ error: 'Failed to fetch uplinks' });
  }
};

/**
 * Send a downlink to a device
 */
export const sendDownlink = async (req: Request, res: Response) => {
  try {
    const { applicationId, deviceId } = req.params;
    const { fPort, payload, confirmed, priority, apiKey } = req.body;

    // Verify device exists and belongs to user
    const device = await TTNDevice.findOne({
      deviceId,
      applicationId,
      owner: req.user._id,
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Get application for region
    const application = await TTNApplication.findOne({
      applicationId,
      owner: req.user._id,
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Initialize TTN service
    const config: TTNConfig = {
      region: application.ttnRegion,
      applicationId,
      apiKey,
    };

    ttnService.initialize(config);

    // Generate correlation ID
    const correlationId = `dl-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Create downlink record
    const downlink = new TTNDownlink({
      deviceId,
      applicationId,
      owner: req.user._id,
      fPort: fPort || 1,
      payload, // Should be Base64 encoded
      confirmed: confirmed || false,
      priority: priority || 'NORMAL',
      correlationId,
      status: 'PENDING',
      createdBy: req.user._id,
    });

    await downlink.save();

    // Send to TTN
    try {
      await ttnService.sendDownlink({
        deviceId,
        fPort: fPort || 1,
        payload,
        confirmed: confirmed || false,
        priority: priority || 'NORMAL',
        correlationId,
      });

      // Update status to scheduled
      downlink.status = 'SCHEDULED';
      downlink.scheduledAt = new Date();
      await downlink.save();

      // Emit real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`ttn-${applicationId}`).emit('ttnDownlinkScheduled', {
          deviceId,
          applicationId,
          correlationId,
          timestamp: new Date(),
        });
      }

      res.json({
        success: true,
        downlink,
        message: 'Downlink scheduled successfully',
      });
    } catch (ttnError: unknown) {
      downlink.status = 'FAILED';
      downlink.failedAt = new Date();
      downlink.failureReason = ttnError instanceof Error ? ttnError.message : 'Unknown error';
      await downlink.save();

      const errorMessage = ttnError instanceof Error ? ttnError.message : 'Unknown error';
      res.status(500).json({ error: `Failed to send downlink: ${errorMessage}` });
    }
  } catch (error) {
    console.error('Error sending TTN downlink:', error);
    res.status(500).json({ error: 'Failed to send downlink' });
  }
};

/**
 * Get downlink history for a device
 */
export const getDownlinks = async (req: Request, res: Response) => {
  try {
    const { applicationId, deviceId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const query: Record<string, unknown> = {
      applicationId,
      owner: req.user._id,
    };

    if (deviceId && deviceId !== 'all') {
      query.deviceId = deviceId;
    }

    const downlinks = await TTNDownlink.find(query)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    const total = await TTNDownlink.countDocuments(query);

    res.json({
      downlinks,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Error fetching TTN downlinks:', error);
    res.status(500).json({ error: 'Failed to fetch downlinks' });
  }
};

/**
 * Get TTN statistics for dashboard
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const { period = '24h' } = req.query;

    // Calculate time range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const baseQuery = {
      applicationId,
      owner: req.user._id,
    };

    // Get counts
    const [
      totalDevices,
      onlineDevices,
      totalUplinks,
      recentUplinks,
      totalDownlinks,
      pendingDownlinks,
      totalGateways,
      onlineGateways,
    ] = await Promise.all([
      TTNDevice.countDocuments(baseQuery),
      TTNDevice.countDocuments({ ...baseQuery, isOnline: true }),
      TTNUplink.countDocuments(baseQuery),
      TTNUplink.countDocuments({ ...baseQuery, receivedAt: { $gte: startDate } }),
      TTNDownlink.countDocuments(baseQuery),
      TTNDownlink.countDocuments({ ...baseQuery, status: { $in: ['PENDING', 'SCHEDULED'] } }),
      TTNGateway.countDocuments(baseQuery),
      TTNGateway.countDocuments({ ...baseQuery, isOnline: true }),
    ]);

    // Get uplink time series for chart
    const uplinkTimeSeries = await TTNUplink.aggregate([
      {
        $match: {
          applicationId,
          receivedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === '1h' ? '%Y-%m-%d %H:%M' : '%Y-%m-%d %H:00',
              date: '$receivedAt',
            },
          },
          count: { $sum: 1 },
          avgRssi: { $avg: '$rssi' },
          avgSnr: { $avg: '$snr' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get top devices by uplink count
    const topDevices = await TTNUplink.aggregate([
      {
        $match: {
          applicationId,
          receivedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$deviceId',
          uplinkCount: { $sum: 1 },
          lastSeen: { $max: '$receivedAt' },
          avgRssi: { $avg: '$rssi' },
        },
      },
      { $sort: { uplinkCount: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      summary: {
        totalDevices,
        onlineDevices,
        offlineDevices: totalDevices - onlineDevices,
        totalUplinks,
        recentUplinks,
        totalDownlinks,
        pendingDownlinks,
        totalGateways,
        onlineGateways,
      },
      uplinkTimeSeries,
      topDevices,
      period,
    });
  } catch (error) {
    console.error('Error fetching TTN stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

/**
 * Get all gateways for an application
 */
export const getGateways = async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;

    const gateways = await TTNGateway.find({
      applicationId,
      owner: req.user._id,
    }).sort({ lastSeen: -1 });

    res.json(gateways);
  } catch (error) {
    console.error('Error fetching TTN gateways:', error);
    res.status(500).json({ error: 'Failed to fetch gateways' });
  }
};

/**
 * Get a specific gateway
 */
export const getGateway = async (req: Request, res: Response) => {
  try {
    const { applicationId, gatewayId } = req.params;

    const gateway = await TTNGateway.findOne({
      gatewayId,
      applicationId,
      owner: req.user._id,
    });

    if (!gateway) {
      return res.status(404).json({ error: 'Gateway not found' });
    }

    res.json(gateway);
  } catch (error) {
    console.error('Error fetching TTN gateway:', error);
    res.status(500).json({ error: 'Failed to fetch gateway' });
  }
};

/**
 * Get aggregated gateway statistics
 */
export const getGatewayStats = async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;

    const baseQuery = {
      applicationId,
      owner: req.user._id,
    };

    const gateways = await TTNGateway.find(baseQuery).sort({ 'metrics.totalUplinksSeen': -1 });

    const totalGateways = gateways.length;
    const onlineGateways = gateways.filter((gw) => gw.isOnline).length;
    const avgSignalQuality = gateways.length > 0
      ? {
          avgRssi: Math.round(gateways.reduce((sum, gw) => sum + gw.metrics.avgRssi, 0) / gateways.length * 10) / 10,
          avgSnr: Math.round(gateways.reduce((sum, gw) => sum + gw.metrics.avgSnr, 0) / gateways.length * 10) / 10,
        }
      : { avgRssi: 0, avgSnr: 0 };

    res.json({
      totalGateways,
      onlineGateways,
      avgSignalQuality,
      gateways,
    });
  } catch (error) {
    console.error('Error fetching TTN gateway stats:', error);
    res.status(500).json({ error: 'Failed to fetch gateway stats' });
  }
};
