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
import { Device } from './models/Device';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Setup MQTT client
const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883');

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
  
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iotspace')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Setup API routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 