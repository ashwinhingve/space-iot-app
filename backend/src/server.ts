import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import mqtt from 'mqtt';

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
// Allow requests from localhost and network IPs
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Allow localhost and any network IP on port 3000
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL
    ];

    // Allow any origin from local network (192.168.x.x, 10.x.x.x, etc.) on port 3000
    if (origin.match(/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):3000$/)) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development - change to false in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Setup MQTT client
const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883');

// Store MQTT client and Socket.io in app context for controllers
app.set('mqttClient', mqttClient);
app.set('io', io);

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  // Subscribe to all device data, status, and online topics
  mqttClient.subscribe(['devices/+/data', 'devices/+/status', 'devices/+/online'], (err) => {
    if (!err) {
      console.log('Subscribed to device topics');
    } else {
      console.error('Error subscribing to topics:', err);
    }
  });

  // Subscribe to manifold topics
  mqttClient.subscribe([
    'manifolds/+/status',   // Manifold valve status updates
    'manifolds/+/online',   // Manifold heartbeat
    'manifolds/+/ack'       // Command acknowledgments
  ], (err) => {
    if (!err) {
      console.log('Subscribed to manifold topics');
    } else {
      console.error('Error subscribing to manifold topics:', err);
    }
  });
});

// Keep track of devices and their last seen time
const deviceHeartbeats = new Map<string, Date>();

// Function to handle when devices go offline
const checkDevicesStatus = async () => {
  const now = new Date();
  for (const [deviceId, lastSeen] of deviceHeartbeats.entries()) {
    // If we haven't heard from a device in 15 seconds, mark it as offline (reduced from 30)
    if (now.getTime() - lastSeen.getTime() > 15000) {
      console.log(`Device ${deviceId} has timed out - marking as offline`);
      
      try {
        const device = await Device.findOneAndUpdate(
          { mqttTopic: `devices/${deviceId}` },
          { status: 'offline' },
          { new: true }
        );
        
        if (device) {
          io.emit('deviceStatus', {
            deviceId: device._id,
            status: 'offline'
          });
          
          // Keep in heartbeats map but with updated timestamp to prevent rapid on/off switching
          deviceHeartbeats.set(deviceId, new Date(now.getTime() - 14000));
        }
      } catch (error) {
        console.error(`Error updating offline status for device ${deviceId}:`, error);
      }
    }
  }
};

// Check device status more frequently for real-time updates
setInterval(checkDevicesStatus, 5000); // Check every 5 seconds instead of 10

mqttClient.on('message', async (topic, message) => {
  const topicParts = topic.split('/');
  const [prefix, deviceId, type] = topicParts;
  console.log(`MQTT message received on topic: ${topic}, data: ${message.toString().substring(0, 100)}${message.toString().length > 100 ? '...' : ''}`);
  
  // Debugging to show what we parsed from the topic
  console.log(`Topic parsed: prefix=${prefix}, deviceId=${deviceId}, type=${type}`);
  
  try {
    // Update the last seen time for this device
    deviceHeartbeats.set(deviceId, new Date());
    
    if (type === 'online') {
      // Handle online/offline status messages
      const isOnline = message.toString() === 'true';
      console.log(`Processing online status update for device ${deviceId}: ${isOnline}`);
      
      // First try exact match
      let updatedDevice = await Device.findOneAndUpdate(
        { mqttTopic: `devices/${deviceId}` },
        { 
          status: isOnline ? 'online' : 'offline',
          lastSeen: new Date()
        },
        { new: true }
      );
      
      // If device not found, try alternative topic formats
      if (!updatedDevice) {
        // Try with just the device ID
        updatedDevice = await Device.findOneAndUpdate(
          { mqttTopic: deviceId },
          { 
            status: isOnline ? 'online' : 'offline',
            lastSeen: new Date()
          },
          { new: true }
        );
      }

      if (updatedDevice) {
        console.log(`Updated device status: ${updatedDevice._id} -> ${updatedDevice.status}`);
        // Emit status update to connected clients
        io.emit('deviceStatus', {
          deviceId: updatedDevice._id,
          status: updatedDevice.status
        });
      } else {
        console.log(`No device found with MQTT topic: devices/${deviceId} or ${deviceId}`);
      }
    } else if (type === 'data') {
      try {
        const data = JSON.parse(message.toString());
        
        // Extract sensor values - handle different data formats
        let temperature = 0;
        let humidity = 0;
        let value = 0;
        
        if (data.data) {
          // Format: { data: { temperature, humidity, value } }
          temperature = data.data.temperature !== undefined ? data.data.temperature : 0;
          humidity = data.data.humidity !== undefined ? data.data.humidity : 0;
          value = data.data.value !== undefined ? data.data.value : 0;
        } else {
          // Format: { temperature, humidity, value }
          temperature = data.temperature !== undefined ? data.temperature : 0;
          humidity = data.humidity !== undefined ? data.humidity : 0;
          value = data.value !== undefined ? data.value : 0;
        }
        
        console.log(`Processing data for device ${deviceId}: temp=${temperature}, humidity=${humidity}, value=${value}`);
        
        // First try exact match
        let updatedDevice = await Device.findOneAndUpdate(
          { mqttTopic: `devices/${deviceId}` },
          {
            status: 'online',
            lastSeen: new Date(),
            lastData: {
              timestamp: new Date(),
              value: temperature // Use temperature as primary value
            },
            "settings.temperature": temperature,
            "settings.humidity": humidity,
            "settings.value": value
          },
          { new: true }
        );
        
        // If device not found, try alternative topic formats
        if (!updatedDevice) {
          // Try with just the device ID
          updatedDevice = await Device.findOneAndUpdate(
            { mqttTopic: deviceId },
            {
              status: 'online',
              lastSeen: new Date(),
              lastData: {
                timestamp: new Date(),
                value: temperature // Use temperature as primary value
              },
              "settings.temperature": temperature,
              "settings.humidity": humidity,
              "settings.value": value
            },
            { new: true }
          );
        }

        if (updatedDevice) {
          console.log(`Updated device data: ${updatedDevice._id}`);
          // Emit to Socket.io clients
          io.emit('deviceData', {
            deviceId: updatedDevice._id,
            data: {
              temperature,
              humidity,
              value,
              timestamp: new Date()
            }
          });
        } else {
          console.log(`Device not found for topic: devices/${deviceId} or ${deviceId}`);
        }
      } catch (error) {
        console.error('Error parsing device data:', error);
      }
    }
  } catch (error) {
    console.error('Error processing MQTT message:', error);
  }

  // Handle manifold MQTT messages
  if (prefix === 'manifolds') {
    const manifoldId = deviceId; // Using deviceId variable which is actually manifoldId in this context
    console.log(`Processing manifold message: ${type} for manifold ${manifoldId}`);

    try {
      if (type === 'status') {
        // Manifold valve status update from ESP32
        const statusData = JSON.parse(message.toString());
        const { valves } = statusData;

        // Update valve states in database
        for (const valveData of valves) {
          await Valve.findOneAndUpdate(
            {
              manifoldId: { $exists: true },
              valveNumber: valveData.valveNumber
            },
            {
              'operationalData.currentStatus': valveData.status,
              updatedAt: new Date()
            },
            { new: true }
          ).then(async (valve) => {
            if (valve) {
              // Also update manifold last seen time
              await Manifold.findByIdAndUpdate(valve.manifoldId, {
                updatedAt: new Date()
              });
            }
          });
        }

        // Emit to Socket.io clients in manifold room
        io.to(`manifold-${manifoldId}`).emit('manifoldStatus', {
          manifoldId,
          valves,
          timestamp: statusData.timestamp || Date.now()
        });

        console.log(`Updated valve states for manifold ${manifoldId}`);
      } else if (type === 'ack') {
        // Command acknowledgment from ESP32
        const ackData = JSON.parse(message.toString());
        const { commandId } = ackData;

        // Mark command as acknowledged
        const command = await ValveCommand.findOneAndUpdate(
          { commandId },
          {
            status: 'ACKNOWLEDGED',
            acknowledgedAt: new Date()
          },
          { new: true }
        );

        if (command) {
          console.log(`Command ${commandId} acknowledged by ESP32`);

          // Emit acknowledgment to frontend
          io.to(`manifold-${manifoldId}`).emit('commandAcknowledged', {
            commandId,
            manifoldId,
            timestamp: new Date()
          });
        }
      } else if (type === 'online') {
        // Manifold heartbeat / online status
        const isOnline = message.toString() === 'true';

        // Update manifold status
        const manifold = await Manifold.findOneAndUpdate(
          { manifoldId },
          {
            status: isOnline ? 'Active' : 'Offline',
            updatedAt: new Date()
          },
          { new: true }
        );

        if (manifold) {
          console.log(`Manifold ${manifoldId} is now ${isOnline ? 'online' : 'offline'}`);

          // Emit to Socket.io clients
          io.to(`manifold-${manifoldId}`).emit('manifoldOnline', {
            manifoldId,
            isOnline,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      console.error(`Error processing manifold ${type} message:`, error);
    }
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
        // Send the current device status to the client
        socket.emit('deviceStatus', {
          deviceId: device._id,
          status: device.status
        });
      }
    } catch (error) {
      console.error(`Error getting device status for ${deviceId}:`, error);
    }
  });

  // Manifold-specific Socket.io events
  socket.on('joinManifold', (manifoldId) => {
    socket.join(`manifold-${manifoldId}`);
    console.log(`Socket joined manifold room: manifold-${manifoldId}`);
  });

  socket.on('leaveManifold', (manifoldId) => {
    socket.leave(`manifold-${manifoldId}`);
    console.log(`Socket left manifold room: manifold-${manifoldId}`);
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

// Debug endpoint to check database status
app.get('/api/debug/db-status', async (req, res) => {
  try {
    const dbName = mongoose.connection.db.databaseName;
    const collections = await mongoose.connection.db.listCollections().toArray();

    const stats: any = {
      connected: mongoose.connection.readyState === 1,
      databaseName: dbName,
      collections: []
    };

    for (const col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      stats.collections.push({
        name: col.name,
        count: count
      });
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

// Manifold system routes
app.use('/api/manifolds', manifoldRoutes);
app.use('/api/valves', valveRoutes);
app.use('/api/components', componentRoutes);

const PORT = parseInt(process.env.PORT || '5000', 10);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server accessible at:`);
  console.log(`  - Local:   http://localhost:${PORT}`);
  console.log(`  - Network: http://0.0.0.0:${PORT}`);
}); 