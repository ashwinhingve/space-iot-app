/**
 * TTN MQTT Service
 * Connects to TTN's MQTT broker to receive uplinks in real-time
 * Supports multiple application connections simultaneously
 *
 * TTN MQTT docs: https://www.thethingsindustries.com/docs/integrations/mqtt/
 */

import mqtt, { MqttClient } from 'mqtt';
import { Server as SocketIOServer } from 'socket.io';
import { TTNUplink } from '../models/TTNUplink';
import { TTNDevice } from '../models/TTNDevice';
import { TTNApplication } from '../models/TTNApplication';
import { TTNGateway } from '../models/TTNGateway';

interface TTNMqttConfig {
  region: string;        // eu1, nam1, au1
  applicationId: string;
  apiKey: string;
}

class TTNMqttService {
  private clients: Map<string, MqttClient> = new Map();
  private io: SocketIOServer | null = null;

  /**
   * Set the Socket.io server instance for real-time updates
   */
  setSocketIO(io: SocketIOServer): void {
    this.io = io;
  }

  /**
   * Connect to TTN MQTT broker for a specific application
   */
  async connect(config: TTNMqttConfig): Promise<void> {
    // Disconnect existing connection for this app if any
    if (this.clients.has(config.applicationId)) {
      const existing = this.clients.get(config.applicationId)!;
      existing.end(true);
      this.clients.delete(config.applicationId);
    }

    const mqttUrl = `mqtts://${config.region}.cloud.thethings.network:8883`;
    const username = `${config.applicationId}@ttn`;

    console.log(`[TTN MQTT] Connecting to ${mqttUrl} as ${username}...`);

    return new Promise((resolve, reject) => {
      const client = mqtt.connect(mqttUrl, {
        username,
        password: config.apiKey,
        clientId: `iotspace-${config.applicationId}-${Date.now()}`,
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
        rejectUnauthorized: true,
      });

      client.on('connect', () => {
        console.log(`[TTN MQTT] Connected for application: ${config.applicationId}`);

        // Subscribe to uplink messages
        const uplinkTopic = `v3/${config.applicationId}@ttn/devices/+/up`;
        client.subscribe(uplinkTopic, { qos: 0 }, (err) => {
          if (err) {
            console.error(`[TTN MQTT] Subscribe error for ${config.applicationId}:`, err);
          } else {
            console.log(`[TTN MQTT] Subscribed to: ${uplinkTopic}`);
          }
        });

        // Subscribe to downlink events
        const downlinkTopics = [
          `v3/${config.applicationId}@ttn/devices/+/down/sent`,
          `v3/${config.applicationId}@ttn/devices/+/down/ack`,
          `v3/${config.applicationId}@ttn/devices/+/down/failed`,
          `v3/${config.applicationId}@ttn/devices/+/join`,
        ];
        downlinkTopics.forEach((topic) => {
          client.subscribe(topic, { qos: 0 });
        });

        this.clients.set(config.applicationId, client);
        resolve();
      });

      client.on('message', async (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          await this.handleMessage(topic, payload);
        } catch (err) {
          console.error(`[TTN MQTT] Error processing message on ${topic}:`, err);
        }
      });

      client.on('error', (err) => {
        console.error(`[TTN MQTT] Connection error for ${config.applicationId}:`, err.message);
        reject(err);
      });

      client.on('close', () => {
        console.log(`[TTN MQTT] Connection closed for ${config.applicationId}`);
      });

      client.on('reconnect', () => {
        console.log(`[TTN MQTT] Reconnecting ${config.applicationId}...`);
      });

      // Timeout for initial connection
      setTimeout(() => {
        if (!client.connected) {
          reject(new Error(`TTN MQTT connection timeout for ${config.applicationId}`));
        }
      }, 15000);
    });
  }

  /**
   * Connect all active apps on startup
   */
  async connectAll(apps: TTNMqttConfig[]): Promise<void> {
    const results = await Promise.allSettled(
      apps.map((app) => this.connect(app))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    console.log(`[TTN MQTT] Connected ${succeeded}/${apps.length} applications (${failed} failed)`);
  }

  /**
   * Handle incoming MQTT messages from TTN
   */
  private async handleMessage(topic: string, payload: Record<string, unknown>): Promise<void> {
    const topicParts = topic.split('/');
    // Topic format: v3/{app_id}@ttn/devices/{device_id}/{event}
    const deviceId = topicParts[3];
    const eventType = topicParts.slice(4).join('/');

    console.log(`[TTN MQTT] ${eventType} from device: ${deviceId}`);

    if (eventType === 'up') {
      await this.handleUplink(payload);
    } else if (eventType === 'join') {
      await this.handleJoin(payload);
    } else if (eventType.startsWith('down/')) {
      await this.handleDownlinkEvent(payload, eventType.replace('down/', ''));
    }
  }

  /**
   * Handle uplink messages
   */
  private async handleUplink(payload: Record<string, unknown>): Promise<void> {
    try {
      const endDeviceIds = payload.end_device_ids as Record<string, unknown>;
      const uplinkMessage = payload.uplink_message as Record<string, unknown>;

      if (!endDeviceIds || !uplinkMessage) {
        console.warn('[TTN MQTT] Invalid uplink payload structure');
        return;
      }

      const appIds = endDeviceIds.application_ids as Record<string, unknown>;
      const rxMetadataArray = (uplinkMessage.rx_metadata as unknown[]) || [];
      const rxMetadata = rxMetadataArray[0] as Record<string, unknown> | undefined;
      const settings = uplinkMessage.settings as Record<string, unknown> | undefined;
      const dataRate = settings?.data_rate as Record<string, unknown> | undefined;
      const lora = dataRate?.lora as Record<string, unknown> | undefined;
      const gatewayIds = rxMetadata?.gateway_ids as Record<string, unknown> | undefined;
      const location = rxMetadata?.location as Record<string, unknown> | undefined;

      const deviceId = endDeviceIds.device_id as string;
      const applicationId = appIds?.application_id as string;

      // Find the application owner
      const app = await TTNApplication.findOne({ applicationId });
      if (!app) {
        console.warn(`[TTN MQTT] Application ${applicationId} not found in database`);
        return;
      }

      // Parse ALL gateways from rx_metadata
      const gatewaysData = rxMetadataArray.map((rx: unknown) => {
        const meta = rx as Record<string, unknown>;
        const gwIds = meta.gateway_ids as Record<string, unknown> | undefined;
        const gwLoc = meta.location as Record<string, unknown> | undefined;
        return {
          gatewayId: (gwIds?.gateway_id as string) || 'unknown',
          gatewayEui: gwIds?.eui as string | undefined,
          rssi: (meta.rssi as number) || 0,
          snr: (meta.snr as number) || 0,
          location: gwLoc ? {
            latitude: gwLoc.latitude as number,
            longitude: gwLoc.longitude as number,
            altitude: gwLoc.altitude as number | undefined,
          } : undefined,
        };
      });

      const uplinkData = {
        deviceId,
        applicationId,
        owner: app.owner,
        fPort: (uplinkMessage.f_port as number) || 0,
        fCnt: (uplinkMessage.f_cnt as number) || 0,
        rawPayload: (uplinkMessage.frm_payload as string) || '',
        decodedPayload: uplinkMessage.decoded_payload as Record<string, unknown> | undefined,
        rssi: (rxMetadata?.rssi as number) || 0,
        snr: (rxMetadata?.snr as number) || 0,
        spreadingFactor: (lora?.spreading_factor as number) || 0,
        bandwidth: (lora?.bandwidth as number) || 0,
        frequency: (settings?.frequency as number) || 0,
        codingRate: lora?.coding_rate as string | undefined,
        gatewayId: (gatewayIds?.gateway_id as string) || 'unknown',
        gatewayEui: gatewayIds?.eui as string | undefined,
        gatewayLocation: location ? {
          latitude: location.latitude as number,
          longitude: location.longitude as number,
          altitude: location.altitude as number | undefined,
        } : undefined,
        gateways: gatewaysData,
        receivedAt: new Date(uplinkMessage.received_at as string || Date.now()),
        confirmed: (uplinkMessage.confirmed as boolean) || false,
      };

      // Store in database
      const uplink = new TTNUplink(uplinkData);
      await uplink.save();

      const existingDevice = await TTNDevice.findOne({ deviceId, applicationId })
        .select('connectedSince')
        .lean();

      const deviceUpdate: Record<string, unknown> = {
        isOnline: true,
        lastSeen: uplinkData.receivedAt,
        devAddr: endDeviceIds.dev_addr as string,
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
        deviceUpdate.connectedSince = uplinkData.receivedAt;
      }

      // Update device
      await TTNDevice.findOneAndUpdate(
        { deviceId, applicationId },
        {
          $set: deviceUpdate,
          $inc: { 'metrics.totalUplinks': 1 },
        }
      );

      // Upsert gateway records for each gateway that received this uplink
      const gatewayUpdatePromises = gatewaysData.map(async (gw) => {
        try {
          const existing = await TTNGateway.findOne({ gatewayId: gw.gatewayId, applicationId });
          if (existing) {
            // Update running average RSSI/SNR
            const total = existing.metrics.totalUplinksSeen;
            const newAvgRssi = (existing.metrics.avgRssi * total + gw.rssi) / (total + 1);
            const newAvgSnr = (existing.metrics.avgSnr * total + gw.snr) / (total + 1);

            await TTNGateway.updateOne(
              { gatewayId: gw.gatewayId, applicationId },
              {
                $set: {
                  isOnline: true,
                  lastSeen: uplinkData.receivedAt,
                  'metrics.lastRssi': gw.rssi,
                  'metrics.lastSnr': gw.snr,
                  'metrics.avgRssi': Math.round(newAvgRssi * 10) / 10,
                  'metrics.avgSnr': Math.round(newAvgSnr * 10) / 10,
                  ...(gw.gatewayEui ? { gatewayEui: gw.gatewayEui } : {}),
                  ...(gw.location ? { location: gw.location } : {}),
                },
                $inc: { 'metrics.totalUplinksSeen': 1 },
              }
            );
          } else {
            await TTNGateway.create({
              gatewayId: gw.gatewayId,
              gatewayEui: gw.gatewayEui,
              applicationId,
              owner: app.owner,
              name: gw.gatewayId,
              location: gw.location,
              isOnline: true,
              lastSeen: uplinkData.receivedAt,
              firstSeen: uplinkData.receivedAt,
              metrics: {
                totalUplinksSeen: 1,
                avgRssi: gw.rssi,
                avgSnr: gw.snr,
                lastRssi: gw.rssi,
                lastSnr: gw.snr,
              },
            });
          }
        } catch (gwErr) {
          console.error(`[TTN MQTT] Error upserting gateway ${gw.gatewayId}:`, gwErr);
        }
      });
      await Promise.all(gatewayUpdatePromises);

      console.log(`[TTN MQTT] Uplink stored: device=${deviceId}, port=${uplinkData.fPort}, rssi=${uplinkData.rssi}, gateways=${gatewaysData.length}`);

      // Emit real-time update via Socket.io
      if (this.io) {
        this.io.to(`ttn-${applicationId}`).emit('ttnUplink', {
          deviceId,
          applicationId,
          uplink: {
            _id: uplink._id,
            ...uplinkData,
            createdAt: uplink.createdAt,
          },
          timestamp: new Date(),
        });

        // Emit gateway update event
        if (gatewaysData.length > 0) {
          this.io.to(`ttn-${applicationId}`).emit('ttnGatewayUpdate', {
            applicationId,
            gateways: gatewaysData.map((gw) => gw.gatewayId),
            timestamp: new Date(),
          });
        }
      }
    } catch (err) {
      console.error('[TTN MQTT] Error processing uplink:', err);
    }
  }

  /**
   * Handle join events
   */
  private async handleJoin(payload: Record<string, unknown>): Promise<void> {
    const endDeviceIds = payload.end_device_ids as Record<string, unknown>;
    if (!endDeviceIds) return;

    const deviceId = endDeviceIds.device_id as string;
    const applicationId = (endDeviceIds.application_ids as Record<string, unknown>)?.application_id as string;
    const devAddr = endDeviceIds.dev_addr as string;

    console.log(`[TTN MQTT] Device joined: ${deviceId}`);

    const existingDevice = await TTNDevice.findOne({ deviceId, applicationId })
      .select('connectedSince')
      .lean();
    const joinedAt = new Date();
    const joinUpdate: Record<string, unknown> = {
      isOnline: true,
      lastSeen: joinedAt,
      devAddr,
    };
    if (!existingDevice?.connectedSince) {
      joinUpdate.connectedSince = joinedAt;
    }

    await TTNDevice.findOneAndUpdate(
      { deviceId, applicationId },
      { $set: joinUpdate }
    );

    if (this.io) {
      this.io.to(`ttn-${applicationId}`).emit('ttnDeviceJoin', {
        deviceId,
        applicationId,
        devAddr,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle downlink events (ack, sent, failed)
   */
  private async handleDownlinkEvent(payload: Record<string, unknown>, eventType: string): Promise<void> {
    const endDeviceIds = payload.end_device_ids as Record<string, unknown>;
    if (!endDeviceIds) return;

    const deviceId = endDeviceIds.device_id as string;
    const applicationId = (endDeviceIds.application_ids as Record<string, unknown>)?.application_id as string;

    console.log(`[TTN MQTT] Downlink ${eventType}: device=${deviceId}`);

    if (this.io) {
      this.io.to(`ttn-${applicationId}`).emit(`ttnDownlink${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`, {
        deviceId,
        applicationId,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Check if a specific application is connected
   */
  isConnected(applicationId?: string): boolean {
    if (applicationId) {
      return this.clients.get(applicationId)?.connected || false;
    }
    // Return true if any connection is active
    for (const client of this.clients.values()) {
      if (client.connected) return true;
    }
    return false;
  }

  /**
   * Get list of connected application IDs
   */
  getConnectedApps(): string[] {
    const connected: string[] = [];
    for (const [appId, client] of this.clients.entries()) {
      if (client.connected) connected.push(appId);
    }
    return connected;
  }

  /**
   * Disconnect from TTN MQTT - one app or all
   */
  disconnect(applicationId?: string): void {
    if (applicationId) {
      const client = this.clients.get(applicationId);
      if (client) {
        client.end(true);
        this.clients.delete(applicationId);
        console.log(`[TTN MQTT] Disconnected: ${applicationId}`);
      }
    } else {
      // Disconnect all
      for (const [appId, client] of this.clients.entries()) {
        client.end(true);
        console.log(`[TTN MQTT] Disconnected: ${appId}`);
      }
      this.clients.clear();
      console.log('[TTN MQTT] All connections closed');
    }
  }
}

// Singleton
export const ttnMqttService = new TTNMqttService();
