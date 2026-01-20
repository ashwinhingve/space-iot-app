import express from 'express';
import { createServer, createServer as createNetServer } from 'http';
import * as net from 'net';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import mqtt from 'mqtt';
import Aedes from 'aedes';

// Import routes and models
import authRoutes from './routes/authRoutes';
import deviceRoutes from './routes/deviceRoutes';
import wifiRoutes from './routes/wifiRoutes';
import manifoldRoutes from './routes/manifoldRoutes';
import valveRoutes from './routes/valveRoutes';
import componentRoutes from './routes/componentRoutes';
import { Device } from './models/Device';
import { Manifold } from './models/Manifold';
import { Valve } from './models/Valve';
import { ValveCommand } from './models/ValveCommand';

// Load environment variables
dotenv.config();

console.log('Starting server...');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware - CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL
    ];
    if (origin.match(/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):3000$/)) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// ============================================================
// ===== AEDES MQTT BROKER =====
// ============================================================

const aedes = new Aedes();
const mqttServer = net.createServer(aedes.handle);
const MQTT_PORT = parseInt(process.env.MQTT_PORT || '1883', 10);

mqttServer.listen(MQTT_PORT, '0.0.0.0', () => {
  console.log(`MQTT Broker running on port ${MQTT_PORT}`);
  console.log(`  - Local:   mqtt://localhost:${MQTT_PORT}`);
  console.log(`  - Network: mqtt://0.0.0.0:${MQTT_PORT}`);
});

// Aedes broker events
aedes.on('client', (client) => {
  console.log(`MQTT Client Connected: ${client?.id || 'unknown'}`);
});

aedes.on('clientDisconnect', (client) => {
  console.log(`MQTT Client Disconnected: ${client?.id || 'unknown'}`);
});

aedes.on('subscribe', (subscriptions, client) => {
  console.log(`MQTT Client ${client?.id} subscribed to: ${subscriptions.map(s => s.topic).join(', ')}`);
});

// Keep track of devices and their last seen time
const deviceHeartbeats = new Map<string, Date>();

// MQTT message handler function - MUST be defined before aedes.on('publish')
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
            { mqttTopic: { $regex: deviceId, $options: 'i' } },
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
              status: 'online',
              lastSeen: new Date(),
              lastData: { timestamp: new Date(), value: temperature },
              'settings.temperature': temperature,
              'settings.humidity': humidity,
              'settings.value': value
            },
            { new: true }
          );

          if (!updatedDevice) {
            updatedDevice = await Device.findOneAndUpdate(
              { mqttTopic: { $regex: deviceId, $options: 'i' } },
              {
                status: 'online',
                lastSeen: new Date(),
                lastData: { timestamp: new Date(), value: temperature },
                'settings.temperature': temperature,
                'settings.humidity': humidity,
                'settings.value': value
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
        for (const valveData of statusData.valves || []) {
          const valve = await Valve.findOneAndUpdate(
            { manifoldId: { $exists: true }, valveNumber: valveData.valveNumber },
            { 'operationalData.currentStatus': valveData.status, updatedAt: new Date() },
            { new: true }
          );
          if (valve) {
            await Manifold.findByIdAndUpdate(valve.manifoldId, { updatedAt: new Date() });
          }
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

// Handle ALL messages directly from the broker (no separate client needed)
aedes.on('publish', async (packet, client) => {
  const topic = packet.topic;

  // Skip internal topics (start with $)
  if (topic.startsWith('$')) return;

  // Log external publishes
  if (client) {
    console.log(`MQTT Publish from ${client.id}: ${topic}`);
  }

  // Process device and manifold messages
  if (topic.startsWith('devices/') || topic.startsWith('manifolds/')) {
    console.log(`>>> Calling handleMqttMessage for topic: ${topic}`);
    try {
      await handleMqttMessage(topic, packet.payload as Buffer);
      console.log(`>>> handleMqttMessage completed for topic: ${topic}`);
    } catch (err) {
      console.error(`>>> handleMqttMessage ERROR:`, err);
    }
  }
});

// Create MQTT client for PUBLISHING only (to send commands to devices)
let mqttClient: mqtt.MqttClient;

setTimeout(() => {
  mqttClient = mqtt.connect(`mqtt://localhost:${MQTT_PORT}`, {
    reconnectPeriod: 1000,
    connectTimeout: 5000,
    clientId: 'backend-publisher'
  });

  mqttClient.on('connect', () => {
    console.log('Backend MQTT publisher ready');
  });

  // Store MQTT client in app context for controllers to publish commands
  app.set('mqttClient', mqttClient);
}, 500);

// Function to handle when devices go offline
const checkDevicesStatus = async () => {
  const now = new Date();
  for (const [deviceId, lastSeen] of deviceHeartbeats.entries()) {
    if (now.getTime() - lastSeen.getTime() > 15000) {
      console.log(`Device ${deviceId} has timed out - marking as offline`);
      try {
        const device = await Device.findOneAndUpdate(
          { mqttTopic: `devices/${deviceId}` },
          { status: 'offline' },
          { new: true }
        );
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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iotspace')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

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

// Setup API routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/device', wifiRoutes);
app.use('/api/manifolds', manifoldRoutes);
app.use('/api/valves', valveRoutes);
app.use('/api/components', componentRoutes);

const PORT = parseInt(process.env.PORT || '5000', 10);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`  - Local:   http://localhost:${PORT}`);
  console.log(`  - Network: http://0.0.0.0:${PORT}`);
});
