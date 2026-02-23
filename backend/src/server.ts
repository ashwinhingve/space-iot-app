import express from 'express';
import { createServer } from 'http';
import * as net from 'net';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import mqtt from 'mqtt';
import Aedes from 'aedes';
import jwt from 'jsonwebtoken';

// Import routes and models
import authRoutes from './routes/authRoutes';
import deviceRoutes from './routes/deviceRoutes';
import wifiRoutes from './routes/wifiRoutes';
import manifoldRoutes from './routes/manifoldRoutes';
import valveRoutes from './routes/valveRoutes';
import componentRoutes from './routes/componentRoutes';
import ttnRoutes from './routes/ttnRoutes';
import ttnWebhookRoutes from './routes/ttnWebhookRoutes';
import networkDeviceRoutes from './routes/networkDeviceRoutes';
import { Device } from './models/Device';
import { Manifold } from './models/Manifold';
import { Valve } from './models/Valve';
import { ValveCommand } from './models/ValveCommand';

// Import utilities and services
import { validateEnv, getEnvConfig } from './utils/validateEnv';
import { awsIotService, AwsIotConfig } from './services/awsIotService';
import { ttnMqttService } from './services/ttnMqttService';
import { TTNApplication } from './models/TTNApplication';
import { TTNDevice } from './models/TTNDevice';
import { ttnService } from './services/ttnService';

// Load environment variables
dotenv.config();

// Validate environment variables before proceeding
validateEnv();

const config = getEnvConfig();
const isProduction = config.isProduction;

console.log(`Starting server in ${config.nodeEnv} mode...`);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.frontendUrl || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware - CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (server-to-server, Postman, etc.)
    if (!origin) return callback(null, true);

    // Production allowed origins
    const productionOrigins = [
      'https://iot.spaceautotech.com',
      'https://www.iot.spaceautotech.com',
      'https://api.spaceautotech.com',
      config.frontendUrl
    ].filter(Boolean);

    // Development allowed origins
    const developmentOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      config.frontendUrl
    ].filter(Boolean);

    const allowedOrigins = isProduction ? productionOrigins : [...productionOrigins, ...developmentOrigins];

    // Allow local network IPs in development only
    if (!isProduction && origin.match(/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):3000$/)) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};

app.use(cors(corsOptions));
app.use(express.json());

// Keep track of devices and their last seen time
const deviceHeartbeats = new Map<string, Date>();

// MQTT message handler function - works with both Aedes and AWS IoT
const handleMqttMessage = async (topic: string, message: Buffer) => {
  const topicParts = topic.split('/');
  const [prefix, deviceId, type] = topicParts;
  console.log(`MQTT message received on topic: ${topic}`);
  console.log(`Topic parsed: prefix=${prefix}, deviceId=${deviceId}, type=${type}`);

  try {
    deviceHeartbeats.set(deviceId, new Date());

    if (prefix === 'devices') {
      if (type === 'online') {
        const isOnline = message.toString() === 'true';
        console.log(`Processing online status for device ${deviceId}: ${isOnline}`);

        let updatedDevice = await Device.findOneAndUpdate(
          { mqttTopic: `devices/${deviceId}` },
          { status: isOnline ? 'online' : 'offline', lastSeen: new Date() },
          { new: true }
        );

        if (!updatedDevice) {
          updatedDevice = await Device.findOneAndUpdate(
            { mqttTopic: { $regex: `/${deviceId}$`, $options: 'i' } },
            { status: isOnline ? 'online' : 'offline', lastSeen: new Date() },
            { new: true }
          );
        }

        if (updatedDevice) {
          console.log(`Updated device status: ${updatedDevice._id} -> ${updatedDevice.status}`);
          io.emit('deviceStatus', { deviceId: updatedDevice._id, status: updatedDevice.status });
        } else {
          const allDevices = await Device.find({}, 'mqttTopic');
          console.log(`No device found for: ${deviceId}. Available: ${allDevices.map(d => d.mqttTopic).join(', ')}`);
        }
      } else if (type === 'data') {
        try {
          const data = JSON.parse(message.toString());
          let temperature = 0, humidity = 0, value = 0;

          if (data.data) {
            temperature = data.data.temperature ?? 0;
            humidity = data.data.humidity ?? 0;
            value = data.data.value ?? 0;
          } else {
            temperature = data.temperature ?? 0;
            humidity = data.humidity ?? 0;
            value = data.value ?? 0;
          }

          console.log(`Processing data for ${deviceId}: temp=${temperature}, humidity=${humidity}`);

          let updatedDevice = await Device.findOneAndUpdate(
            { mqttTopic: `devices/${deviceId}` },
            {
              $set: {
                status: 'online',
                lastSeen: new Date(),
                lastData: { timestamp: new Date(), value: temperature },
                settings: { temperature, humidity, value }
              }
            },
            { new: true }
          );

          if (!updatedDevice) {
            updatedDevice = await Device.findOneAndUpdate(
              { mqttTopic: { $regex: `/${deviceId}$`, $options: 'i' } },
              {
                $set: {
                  status: 'online',
                  lastSeen: new Date(),
                  lastData: { timestamp: new Date(), value: temperature },
                  settings: { temperature, humidity, value }
                }
              },
              { new: true }
            );
          }

          if (updatedDevice) {
            console.log(`Updated device data: ${updatedDevice._id}`);
            io.emit('deviceData', {
              deviceId: updatedDevice._id,
              data: { temperature, humidity, value, timestamp: new Date() }
            });
          }
        } catch (err) {
          console.error('Error parsing device data:', err);
        }
      }
    } else if (prefix === 'manifolds') {
      const manifoldId = deviceId;
      console.log(`Processing manifold ${type} for ${manifoldId}`);

      if (type === 'status') {
        const statusData = JSON.parse(message.toString());
        const manifold = await Manifold.findOne({ manifoldId });
        if (manifold) {
          for (const valveData of statusData.valves || []) {
            const updatedValve = await Valve.findOneAndUpdate(
              { manifoldId: manifold._id, valveNumber: valveData.valveNumber },
              {
                'operationalData.currentStatus': valveData.status,
                ...(valveData.mode ? { 'operationalData.mode': valveData.mode } : {}),
                updatedAt: new Date()
              },
              { new: true }
            );
            if (
              updatedValve?.alarmConfig?.enabled &&
              updatedValve.alarmConfig.ruleType === 'STATUS' &&
              updatedValve.alarmConfig.metric === 'status' &&
              valveData.status === updatedValve.alarmConfig.triggerStatus
            ) {
              const existingActive = updatedValve.alarms.find(
                (alarm) => !alarm.acknowledged && alarm.message === `Valve ${updatedValve.valveNumber} status ${valveData.status}`
              );
              if (!existingActive) {
                updatedValve.alarms.push({
                  alarmId: `AL-${Date.now()}-${updatedValve.valveNumber}`,
                  severity: valveData.status === 'FAULT' ? 'CRITICAL' : 'WARNING',
                  message: `Valve ${updatedValve.valveNumber} status ${valveData.status}`,
                  timestamp: new Date(),
                  acknowledged: false
                } as any);
                await updatedValve.save();
              }
            }
          }
          await Manifold.findByIdAndUpdate(manifold._id, { updatedAt: new Date() });
        }
        io.to(`manifold-${manifoldId}`).emit('manifoldStatus', {
          manifoldId,
          valves: statusData.valves,
          timestamp: statusData.timestamp || Date.now()
        });
      } else if (type === 'online') {
        const isOnline = message.toString() === 'true';
        const manifold = await Manifold.findOneAndUpdate(
          { manifoldId },
          { status: isOnline ? 'Active' : 'Offline', updatedAt: new Date() },
          { new: true }
        );
        if (manifold) {
          io.to(`manifold-${manifoldId}`).emit('manifoldOnline', { manifoldId, isOnline, timestamp: new Date() });
        }
      } else if (type === 'ack') {
        const { commandId } = JSON.parse(message.toString());
        const command = await ValveCommand.findOneAndUpdate(
          { commandId },
          { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() },
          { new: true }
        );
        if (command) {
          io.to(`manifold-${manifoldId}`).emit('commandAcknowledged', { commandId, manifoldId, timestamp: new Date() });
        }
      }
    }
  } catch (error) {
    console.error('Error processing MQTT message:', error);
  }
};

// ============================================================
// ===== MQTT SETUP (3 modes: local, aws, cloud) =====
// ============================================================

let aedes: Aedes | null = null;
let mqttServer: net.Server | null = null;
let mqttClient: mqtt.MqttClient | null = null;
let cloudMqttClient: mqtt.MqttClient | null = null;

async function setupMqtt() {
  const mqttMode = config.mqttMode;
  console.log(`Setting up MQTT in '${mqttMode}' mode...`);

  if (mqttMode === 'aws') {
    // AWS IoT Core
    const awsConfig: AwsIotConfig = {
      endpoint: config.awsIotEndpoint!,
      certPath: config.awsIotCertPath!,
      keyPath: config.awsIotKeyPath!,
      caPath: config.awsIotCaPath!,
      clientId: `iotspace-backend-${Date.now()}`,
      region: config.awsRegion!
    };

    await awsIotService.initialize(awsConfig, handleMqttMessage);

    await awsIotService.subscribe('devices/+/data');
    await awsIotService.subscribe('devices/+/online');
    await awsIotService.subscribe('manifolds/+/status');
    await awsIotService.subscribe('manifolds/+/online');
    await awsIotService.subscribe('manifolds/+/ack');

    app.set('mqttClient', {
      publish: (topic: string, message: string, options?: any, callback?: (err?: Error) => void) => {
        awsIotService.publish(topic, message, options?.qos || 1)
          .then(() => callback?.())
          .catch((err) => callback?.(err));
      },
      connected: () => awsIotService.isConnected()
    });

    console.log('AWS IoT Core setup complete');

  } else if (mqttMode === 'cloud') {
    // Cloud MQTT broker (HiveMQ, EMQX, etc.)
    const brokerUrl = config.mqttBrokerUrl!;
    console.log(`Connecting to cloud MQTT broker: ${brokerUrl}`);

    cloudMqttClient = mqtt.connect(brokerUrl, {
      username: config.mqttUsername,
      password: config.mqttPassword,
      clientId: `iotspace-backend-${Date.now()}`,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    });

    cloudMqttClient.on('connect', () => {
      console.log('Connected to cloud MQTT broker');

      // Subscribe to device topics
      const topics = [
        'devices/+/data',
        'devices/+/online',
        'manifolds/+/status',
        'manifolds/+/online',
        'manifolds/+/ack'
      ];
      cloudMqttClient!.subscribe(topics, { qos: 1 }, (err) => {
        if (err) {
          console.error('Cloud MQTT subscribe error:', err);
        } else {
          console.log('Subscribed to device topics on cloud broker');
        }
      });
    });

    cloudMqttClient.on('message', async (topic, message) => {
      if (topic.startsWith('devices/') || topic.startsWith('manifolds/')) {
        try {
          await handleMqttMessage(topic, message);
        } catch (err) {
          console.error('Cloud MQTT message handler error:', err);
        }
      }
    });

    cloudMqttClient.on('error', (err) => {
      console.error('Cloud MQTT error:', err);
    });

    cloudMqttClient.on('offline', () => {
      console.warn('Cloud MQTT client offline, will reconnect...');
    });

    // Store cloud client in app context for controllers
    app.set('mqttClient', cloudMqttClient);

    console.log('Cloud MQTT setup complete');

  } else {
    // Local Aedes broker (default for development)
    aedes = new Aedes();
    mqttServer = net.createServer(aedes.handle);

    mqttServer.listen(config.mqttPort, '0.0.0.0', () => {
      console.log(`MQTT Broker running on port ${config.mqttPort}`);
      console.log(`  - Local:   mqtt://localhost:${config.mqttPort}`);
      console.log(`  - Network: mqtt://0.0.0.0:${config.mqttPort}`);
    });

    aedes.on('client', (client) => {
      console.log(`MQTT Client Connected: ${client?.id || 'unknown'}`);
    });

    aedes.on('clientDisconnect', (client) => {
      console.log(`MQTT Client Disconnected: ${client?.id || 'unknown'}`);
    });

    aedes.on('subscribe', (subscriptions, client) => {
      console.log(`MQTT Client ${client?.id} subscribed to: ${subscriptions.map(s => s.topic).join(', ')}`);
    });

    aedes.on('publish', async (packet, client) => {
      const topic = packet.topic;
      if (topic.startsWith('$')) return;

      if (client) {
        console.log(`MQTT Publish from ${client.id}: ${topic}`);
      }

      if (topic.startsWith('devices/') || topic.startsWith('manifolds/')) {
        try {
          await handleMqttMessage(topic, packet.payload as Buffer);
        } catch (err) {
          console.error('Aedes message handler error:', err);
        }
      }
    });

    // Create MQTT client for PUBLISHING only
    setTimeout(() => {
      mqttClient = mqtt.connect(`mqtt://localhost:${config.mqttPort}`, {
        reconnectPeriod: 1000,
        connectTimeout: 5000,
        clientId: 'backend-publisher'
      });

      mqttClient.on('connect', () => {
        console.log('Backend MQTT publisher ready');
      });

      app.set('mqttClient', mqttClient);
    }, 500);
  }
}

// Function to handle when devices go offline
const checkDevicesStatus = async () => {
  const now = new Date();
  for (const [deviceId, lastSeen] of deviceHeartbeats.entries()) {
    if (now.getTime() - lastSeen.getTime() > 15000) {
      console.log(`Device ${deviceId} has timed out - marking as offline`);
      try {
        let device = await Device.findOneAndUpdate(
          { mqttTopic: `devices/${deviceId}` },
          { status: 'offline' },
          { new: true }
        );
        if (!device) {
          device = await Device.findOneAndUpdate(
            { mqttTopic: { $regex: `/${deviceId}$`, $options: 'i' } },
            { status: 'offline' },
            { new: true }
          );
        }
        if (device) {
          io.emit('deviceStatus', { deviceId: device._id, status: 'offline' });
          deviceHeartbeats.set(deviceId, new Date(now.getTime() - 14000));
        }
      } catch (error) {
        console.error(`Error updating offline status for device ${deviceId}:`, error);
      }
    }
  }
};

setInterval(checkDevicesStatus, 5000);

// Expire old valve commands every 60 seconds
setInterval(async () => {
  try {
    await (ValveCommand as any).expireOldCommands();
  } catch (err) {
    console.error('Error expiring valve commands:', err);
  }
}, 60000);

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('joinDevice', (deviceId) => {
    socket.join(deviceId);
  });

  socket.on('requestDeviceStatus', async (deviceId) => {
    try {
      const device = await Device.findById(deviceId);
      if (device) {
        socket.emit('deviceStatus', { deviceId: device._id, status: device.status });
      }
    } catch (error) {
      console.error(`Error getting device status for ${deviceId}:`, error);
    }
  });

  socket.on('joinManifold', (manifoldId) => {
    socket.join(`manifold-${manifoldId}`);
  });

  socket.on('leaveManifold', (manifoldId) => {
    socket.leave(`manifold-${manifoldId}`);
  });

  // TTN Socket.io rooms
  socket.on('joinTTNApplication', (applicationId) => {
    socket.join(`ttn-${applicationId}`);
    console.log(`Socket joined TTN application room: ttn-${applicationId}`);
  });

  socket.on('leaveTTNApplication', (applicationId) => {
    socket.leave(`ttn-${applicationId}`);
    console.log(`Socket left TTN application room: ttn-${applicationId}`);
  });

  socket.on('requestManifoldStatus', async (manifoldId) => {
    try {
      const manifold = await Manifold.findById(manifoldId);
      if (manifold) {
        const valves = await Valve.find({ manifoldId: manifold._id }).sort({ valveNumber: 1 });
        socket.emit('manifoldStatus', {
          manifoldId: manifold.manifoldId,
          valves: valves.map(v => ({
            valveNumber: v.valveNumber,
            status: v.operationalData.currentStatus,
            mode: v.operationalData.mode
          })),
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error(`Error getting manifold status for ${manifoldId}:`, error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Connect to MongoDB
mongoose.connect(config.mongodbUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// ============================================================
// ===== HEALTH CHECK ENDPOINT =====
// ============================================================

app.get('/api/health', async (req, res) => {
  let mqttConnected = false;
  if (config.mqttMode === 'aws') {
    mqttConnected = awsIotService.isConnected();
  } else if (config.mqttMode === 'cloud') {
    mqttConnected = cloudMqttClient?.connected ?? false;
  } else {
    const mqttClientInstance = app.get('mqttClient');
    mqttConnected = mqttClientInstance?.connected ?? false;
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      mqtt: mqttConnected ? 'connected' : 'disconnected'
    },
    version: process.env.npm_package_version || '1.0.0'
  });
});

// ============================================================
// ===== DEBUG ENDPOINTS (Development Only) =====
// ============================================================

if (!isProduction) {
  // Debug endpoint to list all devices with their MQTT topics
  app.get('/api/debug/devices', async (req, res) => {
    try {
      const devices = await Device.find({}, 'name mqttTopic status lastSeen');
      res.json({
        count: devices.length,
        devices: devices.map(d => ({
          id: d._id, name: d.name, mqttTopic: d.mqttTopic, status: d.status, lastSeen: d.lastSeen
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint to check database status
  app.get('/api/debug/db-status', async (req, res) => {
    try {
      const dbName = mongoose.connection.db.databaseName;
      const collections = await mongoose.connection.db.listCollections().toArray();
      const stats: any = { connected: mongoose.connection.readyState === 1, databaseName: dbName, collections: [] };
      for (const col of collections) {
        const count = await mongoose.connection.db.collection(col.name).countDocuments();
        stats.collections.push({ name: col.name, count });
      }
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
} else {
  // Return 404 for debug endpoints in production
  app.get('/api/debug/*', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
}

// Setup API routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/device', wifiRoutes);
app.use('/api/manifolds', manifoldRoutes);
app.use('/api/valves', valveRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/ttn', ttnRoutes);
app.use('/api/ttn/webhook', ttnWebhookRoutes);
app.use('/api/network-devices', networkDeviceRoutes);

// ============================================================
// ===== SERVER STARTUP =====
// ============================================================

async function startServer() {
  // Initialize MQTT
  await setupMqtt();

  // Store Socket.io instance in app for webhook routes
  app.set('io', io);

  // Initialize TTN MQTT connections for all active apps with stored API keys
  ttnMqttService.setSocketIO(io);

  try {
    const ttnApps = await TTNApplication.find({ isActive: true }).select('+apiKeyEncrypted');
    const appsToConnect = ttnApps
      .filter((app) => app.apiKeyEncrypted)
      .map((app) => ({
        region: app.ttnRegion,
        applicationId: app.applicationId,
        apiKey: app.getApiKey()!,
      }));

    if (appsToConnect.length > 0) {
      await ttnMqttService.connectAll(appsToConnect);
    } else {
      console.log('[TTN] No applications with stored API keys found');
    }
  } catch (err) {
    console.warn('[TTN] Error connecting MQTT on startup:', err);
  }

  // Periodic TTN sync every 5 minutes
  setInterval(async () => {
    try {
      const apps = await TTNApplication.find({ isActive: true }).select('+apiKeyEncrypted');
      for (const app of apps) {
        const apiKey = app.getApiKey();
        if (!apiKey) continue;

        try {
          ttnService.initialize({
            region: app.ttnRegion,
            applicationId: app.applicationId,
            apiKey,
          });

          const ttnDevices = await ttnService.getDevices();
          for (const ttnDevice of ttnDevices) {
            await TTNDevice.findOneAndUpdate(
              { deviceId: ttnDevice.ids.device_id, applicationId: app.applicationId },
              {
                $set: {
                  deviceId: ttnDevice.ids.device_id,
                  applicationId: app.applicationId,
                  owner: app.owner,
                  name: ttnDevice.name || ttnDevice.ids.device_id,
                  description: ttnDevice.description,
                  devEui: ttnDevice.ids.dev_eui,
                  joinEui: ttnDevice.ids.join_eui,
                  devAddr: ttnDevice.ids.dev_addr,
                  attributes: ttnDevice.attributes,
                },
              },
              { upsert: true }
            );
          }

          app.lastSync = new Date();
          await app.save();
          console.log(`[TTN Sync] ${app.applicationId}: ${ttnDevices.length} devices synced`);
        } catch (syncErr) {
          console.warn(`[TTN Sync] Error syncing ${app.applicationId}:`, syncErr);
        }
      }
    } catch (err) {
      console.error('[TTN Sync] Periodic sync error:', err);
    }
  }, 5 * 60 * 1000);

  // Start HTTP server
  httpServer.listen(config.port, '0.0.0.0', () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`  - Local:   http://localhost:${config.port}`);
    console.log(`  - Network: http://0.0.0.0:${config.port}`);
    console.log(`  - Mode:    ${config.nodeEnv}`);
  });
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');

  // Close HTTP server
  httpServer.close(() => {
    console.log('HTTP server closed');
  });

  // Close TTN MQTT
  ttnMqttService.disconnect();

  // Close MQTT connections
  if (config.mqttMode === 'aws') {
    await awsIotService.disconnect();
  } else if (config.mqttMode === 'cloud') {
    if (cloudMqttClient) {
      cloudMqttClient.end();
    }
  } else {
    if (mqttClient) {
      mqttClient.end();
    }
    if (mqttServer) {
      mqttServer.close();
    }
    if (aedes) {
      aedes.close();
    }
  }

  // Close MongoDB connection
  await mongoose.connection.close();
  console.log('MongoDB connection closed');

  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  process.emit('SIGTERM', 'SIGTERM');
});

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
