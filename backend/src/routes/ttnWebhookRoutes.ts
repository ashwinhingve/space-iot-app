/**
 * TTN Webhook Routes
 * Receives events from The Things Network via webhooks
 */

import express, { Request, Response } from 'express';
import { TTNUplink } from '../models/TTNUplink';
import { TTNDownlink } from '../models/TTNDownlink';
import { TTNDevice } from '../models/TTNDevice';
import { TTNApplication } from '../models/TTNApplication';
import { ttnService } from '../services/ttnService';

const router = express.Router();

// Middleware to verify webhook signature (optional but recommended)
const verifyWebhookSignature = async (req: Request, res: Response, next: express.NextFunction) => {
  const signature = req.headers['x-webhook-secret'] as string;
  const applicationId = req.params.applicationId;

  // If no signature provided, skip verification (for development)
  if (!signature) {
    console.warn('TTN Webhook: No signature provided, skipping verification');
    return next();
  }

  try {
    // Find the application to get the webhook secret
    const app = await TTNApplication.findOne({ applicationId });
    if (!app || !app.webhookSecret) {
      console.warn('TTN Webhook: No webhook secret configured for application');
      return next();
    }

    // Verify signature
    if (signature !== app.webhookSecret) {
      console.error('TTN Webhook: Invalid signature');
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    next();
  } catch (error) {
    console.error('TTN Webhook signature verification error:', error);
    return res.status(500).json({ error: 'Signature verification failed' });
  }
};

/**
 * POST /api/ttn/webhook/:applicationId/uplink
 * Receives uplink messages from TTN
 */
router.post('/:applicationId/uplink', verifyWebhookSignature, async (req: Request, res: Response) => {
  const { applicationId } = req.params;

  try {
    console.log(`TTN Uplink received for application: ${applicationId}`);
    console.log('Payload:', JSON.stringify(req.body, null, 2));

    // Parse the uplink message
    const uplinkData = ttnService.parseUplinkMessage(req.body);

    // Find the application to get the owner
    const app = await TTNApplication.findOne({ applicationId });
    if (!app) {
      console.warn(`TTN Application ${applicationId} not found in database`);
      // Still store the uplink with a placeholder owner
      // In production, you might want to reject unknown applications
    }

    // Store the uplink in database
    const uplink = new TTNUplink({
      ...uplinkData,
      owner: app?.owner || null,
    });
    await uplink.save();

    // Update device with latest uplink data
    const existingDevice = await TTNDevice.findOne({ deviceId: uplinkData.deviceId, applicationId });
    const updateFields: Record<string, unknown> = {
      isOnline: true,
      lastSeen: uplinkData.receivedAt,
      devAddr: uplinkData.devAddr,
      lastUplink: {
        timestamp: uplinkData.receivedAt,
        fPort: uplinkData.fPort,
        fCnt: uplinkData.fCnt,
        payload: uplinkData.rawPayload,
        decodedPayload: uplinkData.decodedPayload,
        rssi: uplinkData.rssi,
        snr: uplinkData.snr,
        spreadingFactor: uplinkData.spreadingFactor,
        bandwidth: uplinkData.bandwidth,
        frequency: uplinkData.frequency,
        gatewayId: uplinkData.gatewayId,
      },
    };
    if (!existingDevice?.connectedSince) {
      updateFields.connectedSince = uplinkData.receivedAt;
    }
    await TTNDevice.findOneAndUpdate(
      { deviceId: uplinkData.deviceId, applicationId },
      {
        $set: updateFields,
        $inc: {
          'metrics.totalUplinks': 1,
        },
      },
      { upsert: false }
    );

    // Emit real-time update via Socket.io (will be connected in server.ts)
    const io = req.app.get('io');
    if (io) {
      io.to(`ttn-${applicationId}`).emit('ttnUplink', {
        deviceId: uplinkData.deviceId,
        applicationId,
        uplink: uplinkData,
        timestamp: new Date(),
      });
    }

    console.log(`Uplink stored for device ${uplinkData.deviceId}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing TTN uplink:', error);
    res.status(500).json({ error: 'Failed to process uplink' });
  }
});

/**
 * POST /api/ttn/webhook/:applicationId/join
 * Receives join accept events from TTN
 */
router.post('/:applicationId/join', verifyWebhookSignature, async (req: Request, res: Response) => {
  const { applicationId } = req.params;

  try {
    console.log(`TTN Join Accept received for application: ${applicationId}`);

    const endDeviceIds = req.body.end_device_ids;
    const deviceId = endDeviceIds.device_id;
    const devAddr = endDeviceIds.dev_addr;

    // Update device with new session info
    const existingDevice = await TTNDevice.findOne({ deviceId, applicationId });
    const joinedAt = new Date();
    const updateFields: Record<string, unknown> = {
      isOnline: true,
      lastSeen: joinedAt,
      devAddr,
    };
    if (!existingDevice?.connectedSince) {
      updateFields.connectedSince = joinedAt;
    }

    await TTNDevice.findOneAndUpdate(
      { deviceId, applicationId },
      {
        $set: updateFields,
      }
    );

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`ttn-${applicationId}`).emit('ttnDeviceJoin', {
        deviceId,
        applicationId,
        devAddr,
        timestamp: new Date(),
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing TTN join:', error);
    res.status(500).json({ error: 'Failed to process join' });
  }
});

/**
 * POST /api/ttn/webhook/:applicationId/downlink/ack
 * Receives downlink acknowledgment events
 */
router.post('/:applicationId/downlink/ack', verifyWebhookSignature, async (req: Request, res: Response) => {
  const { applicationId } = req.params;

  try {
    console.log(`TTN Downlink ACK received for application: ${applicationId}`);

    const event = ttnService.parseDownlinkEvent(req.body, 'ack');

    // Update downlink status
    for (const correlationId of event.correlationIds) {
      await TTNDownlink.findOneAndUpdate(
        { correlationId },
        {
          $set: {
            status: 'ACKNOWLEDGED',
            acknowledgedAt: event.timestamp,
          },
        }
      );
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`ttn-${applicationId}`).emit('ttnDownlinkAck', {
        deviceId: event.deviceId,
        applicationId,
        correlationIds: event.correlationIds,
        timestamp: event.timestamp,
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing TTN downlink ACK:', error);
    res.status(500).json({ error: 'Failed to process downlink ACK' });
  }
});

/**
 * POST /api/ttn/webhook/:applicationId/downlink/sent
 * Receives downlink sent events
 */
router.post('/:applicationId/downlink/sent', verifyWebhookSignature, async (req: Request, res: Response) => {
  const { applicationId } = req.params;

  try {
    console.log(`TTN Downlink Sent received for application: ${applicationId}`);

    const event = ttnService.parseDownlinkEvent(req.body, 'sent');

    // Update downlink status
    for (const correlationId of event.correlationIds) {
      await TTNDownlink.findOneAndUpdate(
        { correlationId },
        {
          $set: {
            status: 'SENT',
            sentAt: event.timestamp,
          },
        }
      );
    }

    // Update device metrics
    await TTNDevice.findOneAndUpdate(
      { deviceId: event.deviceId, applicationId },
      {
        $inc: { 'metrics.totalDownlinks': 1 },
      }
    );

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`ttn-${applicationId}`).emit('ttnDownlinkSent', {
        deviceId: event.deviceId,
        applicationId,
        correlationIds: event.correlationIds,
        timestamp: event.timestamp,
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing TTN downlink sent:', error);
    res.status(500).json({ error: 'Failed to process downlink sent' });
  }
});

/**
 * POST /api/ttn/webhook/:applicationId/downlink/failed
 * Receives downlink failed events
 */
router.post('/:applicationId/downlink/failed', verifyWebhookSignature, async (req: Request, res: Response) => {
  const { applicationId } = req.params;

  try {
    console.log(`TTN Downlink Failed received for application: ${applicationId}`);

    const event = ttnService.parseDownlinkEvent(req.body, 'failed');

    // Update downlink status
    for (const correlationId of event.correlationIds) {
      await TTNDownlink.findOneAndUpdate(
        { correlationId },
        {
          $set: {
            status: 'FAILED',
            failedAt: event.timestamp,
            failureReason: event.failureReason,
          },
        }
      );
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`ttn-${applicationId}`).emit('ttnDownlinkFailed', {
        deviceId: event.deviceId,
        applicationId,
        correlationIds: event.correlationIds,
        failureReason: event.failureReason,
        timestamp: event.timestamp,
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing TTN downlink failed:', error);
    res.status(500).json({ error: 'Failed to process downlink failed' });
  }
});

/**
 * POST /api/ttn/webhook/:applicationId/downlink/queued
 * Receives downlink queued events
 */
router.post('/:applicationId/downlink/queued', verifyWebhookSignature, async (req: Request, res: Response) => {
  const { applicationId } = req.params;

  try {
    console.log(`TTN Downlink Queued received for application: ${applicationId}`);

    const event = ttnService.parseDownlinkEvent(req.body, 'queued');

    // Update downlink status
    for (const correlationId of event.correlationIds) {
      await TTNDownlink.findOneAndUpdate(
        { correlationId },
        {
          $set: {
            status: 'SCHEDULED',
            scheduledAt: event.timestamp,
          },
        }
      );
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`ttn-${applicationId}`).emit('ttnDownlinkQueued', {
        deviceId: event.deviceId,
        applicationId,
        correlationIds: event.correlationIds,
        timestamp: event.timestamp,
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing TTN downlink queued:', error);
    res.status(500).json({ error: 'Failed to process downlink queued' });
  }
});

export default router;
