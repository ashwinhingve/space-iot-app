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
import { ttnService, TTNConfig, TTNAuthError, TTNRateLimitError, TTNNetworkError } from '../services/ttnService';
import { ttnMqttService } from '../services/ttnMqttService';

/**
 * Map TTN service errors to appropriate HTTP responses
 */
function handleTTNError(res: Response, error: unknown, fallbackMessage: string) {
  if (error instanceof TTNAuthError) {
    return res.status(401).json({ error: error.message });
  }
  if (error instanceof TTNRateLimitError) {
    return res.status(429).json({ error: error.message });
  }
  if (error instanceof TTNNetworkError) {
    return res.status(502).json({ error: error.message });
  }
  const message = error instanceof Error ? error.message : fallbackMessage;
  return res.status(500).json({ error: message });
}

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
      return handleTTNError(res, ttnError, 'TTN connection failed');
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

    // Encrypt and store the API key
    application.setApiKey(apiKey);
    await application.save();

    // Connect MQTT for this app immediately
    try {
      await ttnMqttService.connect({
        region: ttnRegion || 'eu1',
        applicationId,
        apiKey,
      });
      console.log(`[TTN] MQTT connected for new application: ${applicationId}`);
    } catch (mqttErr) {
      console.warn(`[TTN] MQTT connection failed for ${applicationId}:`, mqttErr);
    }

    res.status(201).json({
      success: true,
      application,
      webhookUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/ttn/webhook/${applicationId}`,
      webhookSecret,
      message: 'Application registered. API key saved securely.',
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
 * Update the API key for a TTN application
 */
export const updateApiKey = async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const application = await TTNApplication.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).select('+apiKeyEncrypted');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Verify the new key with TTN
    const config: TTNConfig = {
      region: application.ttnRegion,
      applicationId: application.applicationId,
      apiKey,
    };

    ttnService.initialize(config);

    try {
      const ttnApp = await ttnService.getApplication();
      if (!ttnApp) {
        return res.status(400).json({ error: 'Could not verify TTN application with new API key.' });
      }
    } catch (ttnError: unknown) {
      return handleTTNError(res, ttnError, 'TTN verification failed with new key');
    }

    // Store the new key
    application.setApiKey(apiKey);
    await application.save();

    // Reconnect MQTT with new key
    ttnMqttService.disconnect(application.applicationId);
    try {
      await ttnMqttService.connect({
        region: application.ttnRegion,
        applicationId: application.applicationId,
        apiKey,
      });
    } catch (mqttErr) {
      console.warn(`[TTN] MQTT reconnect failed for ${application.applicationId}:`, mqttErr);
    }

    res.json({ success: true, message: 'API key updated successfully' });
  } catch (error) {
    console.error('Error updating TTN API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
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

    // Disconnect MQTT for this app
    ttnMqttService.disconnect(appId);

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
    const { applicationId } = req.body;

    const application = await TTNApplication.findOne({
      applicationId,
      owner: req.user._id,
    }).select('+apiKeyEncrypted');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Use stored key; fall back to request body for backward compat
    const apiKey = application.getApiKey() || req.body.apiKey;
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key available. Please update the API key for this application.' });
    }

    // Initialize TTN service
    const config: TTNConfig = {
      region: application.ttnRegion,
      applicationId,
      apiKey,
    };

    ttnService.initialize(config);

    // Fetch devices from TTN
    let ttnDevices;
    try {
      ttnDevices = await ttnService.getDevices();
    } catch (ttnError: unknown) {
      return handleTTNError(res, ttnError, 'Failed to fetch devices from TTN');
    }

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
    const { fPort, payload, confirmed, priority } = req.body;

    // Verify device exists and belongs to user
    const device = await TTNDevice.findOne({
      deviceId,
      applicationId,
      owner: req.user._id,
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Get application for region + stored key
    const application = await TTNApplication.findOne({
      applicationId,
      owner: req.user._id,
    }).select('+apiKeyEncrypted');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Use stored key; fall back to request body for backward compat
    const apiKey = application.getApiKey() || req.body.apiKey;
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key available. Please update the API key for this application.' });
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

      return handleTTNError(res, ttnError, 'Failed to send downlink');
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
    const { limit = 50, offset = 0, startDate, endDate } = req.query;

    const query: Record<string, unknown> = {
      applicationId,
      owner: req.user._id,
    };

    if (deviceId && deviceId !== 'all') {
      query.deviceId = deviceId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) (query.createdAt as Record<string, unknown>).$gte = new Date(startDate as string);
      if (endDate) (query.createdAt as Record<string, unknown>).$lte = new Date(endDate as string);
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
 * Get unified logs (uplinks + downlinks merged by timestamp)
 */
export const getLogs = async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const {
      startDate,
      endDate,
      deviceId,
      gatewayId,
      eventType = 'all',
      limit = 100,
      offset = 0,
    } = req.query;

    const maxLimit = Math.min(Number(limit), 500);
    const skip = Number(offset);

    // Default to last 24 hours if no dates provided
    const now = new Date();
    const start = startDate ? new Date(startDate as string) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : now;

    const baseQuery: Record<string, unknown> = {
      applicationId,
      owner: req.user._id,
    };

    if (deviceId && deviceId !== 'all') {
      baseQuery.deviceId = deviceId as string;
    }

    let uplinkResults: Array<Record<string, unknown>> = [];
    let downlinkResults: Array<Record<string, unknown>> = [];
    let uplinkTotal = 0;
    let downlinkTotal = 0;

    if (eventType === 'all' || eventType === 'uplink') {
      const uplinkQuery = {
        ...baseQuery,
        receivedAt: { $gte: start, $lte: end },
      };
      if (gatewayId) {
        (uplinkQuery as Record<string, unknown>).gatewayId = gatewayId as string;
      }
      [uplinkResults, uplinkTotal] = await Promise.all([
        TTNUplink.find(uplinkQuery).sort({ receivedAt: -1 }).lean(),
        TTNUplink.countDocuments(uplinkQuery),
      ]);
    }

    if (eventType === 'all' || eventType === 'downlink') {
      const downlinkQuery = {
        ...baseQuery,
        createdAt: { $gte: start, $lte: end },
      };
      [downlinkResults, downlinkTotal] = await Promise.all([
        TTNDownlink.find(downlinkQuery).sort({ createdAt: -1 }).lean(),
        TTNDownlink.countDocuments(downlinkQuery),
      ]);
    }

    // Merge and sort by timestamp
    const merged = [
      ...uplinkResults.map((u) => ({
        ...u,
        _type: 'uplink' as const,
        _timestamp: (u.receivedAt as Date).toISOString(),
      })),
      ...downlinkResults.map((d) => ({
        ...d,
        _type: 'downlink' as const,
        _timestamp: (d.createdAt as Date).toISOString(),
      })),
    ].sort((a, b) => new Date(b._timestamp).getTime() - new Date(a._timestamp).getTime());

    const total = uplinkTotal + downlinkTotal;
    const paginated = merged.slice(skip, skip + maxLimit);

    res.json({
      logs: paginated,
      total,
      limit: maxLimit,
      offset: skip,
    });
  } catch (error) {
    console.error('Error fetching TTN logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

/**
 * Export logs as CSV or JSON
 */
export const exportLogs = async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const {
      startDate,
      endDate,
      deviceId,
      gatewayId,
      eventType = 'all',
      format = 'json',
    } = req.query;

    const MAX_EXPORT = 10000;

    const now = new Date();
    const start = startDate ? new Date(startDate as string) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : now;

    const baseQuery: Record<string, unknown> = {
      applicationId,
      owner: req.user._id,
    };

    if (deviceId && deviceId !== 'all') {
      baseQuery.deviceId = deviceId as string;
    }

    let uplinkResults: Array<Record<string, unknown>> = [];
    let downlinkResults: Array<Record<string, unknown>> = [];

    if (eventType === 'all' || eventType === 'uplink') {
      const uplinkQuery = {
        ...baseQuery,
        receivedAt: { $gte: start, $lte: end },
      };
      if (gatewayId) {
        (uplinkQuery as Record<string, unknown>).gatewayId = gatewayId as string;
      }
      uplinkResults = await TTNUplink.find(uplinkQuery)
        .sort({ receivedAt: -1 })
        .limit(MAX_EXPORT)
        .lean();
    }

    if (eventType === 'all' || eventType === 'downlink') {
      const downlinkQuery = {
        ...baseQuery,
        createdAt: { $gte: start, $lte: end },
      };
      downlinkResults = await TTNDownlink.find(downlinkQuery)
        .sort({ createdAt: -1 })
        .limit(MAX_EXPORT)
        .lean();
    }

    if (format === 'csv') {
      const csvEscape = (val: unknown): string => {
        const str = val == null ? '' : String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const header = 'Type,Timestamp,Device ID,fPort,Payload,RSSI,SNR,SF,Frequency,Gateway,Status';
      const rows: string[] = [];

      for (const u of uplinkResults) {
        rows.push([
          'uplink',
          csvEscape((u.receivedAt as Date)?.toISOString()),
          csvEscape(u.deviceId),
          csvEscape(u.fPort),
          csvEscape(u.rawPayload),
          csvEscape(u.rssi),
          csvEscape(u.snr),
          csvEscape(u.spreadingFactor),
          csvEscape(u.frequency),
          csvEscape(u.gatewayId),
          '',
        ].join(','));
      }

      for (const d of downlinkResults) {
        rows.push([
          'downlink',
          csvEscape((d.createdAt as Date)?.toISOString()),
          csvEscape(d.deviceId),
          csvEscape(d.fPort),
          csvEscape(d.payload),
          '',
          '',
          '',
          '',
          '',
          csvEscape(d.status),
        ].join(','));
      }

      // Sort by timestamp descending
      const csv = header + '\n' + rows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="ttn-logs-${applicationId}-${Date.now()}.csv"`);
      return res.send(csv);
    }

    // JSON format
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="ttn-logs-${applicationId}-${Date.now()}.json"`);
    res.json({
      uplinks: uplinkResults,
      downlinks: downlinkResults,
      exportedAt: new Date().toISOString(),
      applicationId,
    });
  } catch (error) {
    console.error('Error exporting TTN logs:', error);
    res.status(500).json({ error: 'Failed to export logs' });
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
