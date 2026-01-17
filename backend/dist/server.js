"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mqtt_1 = __importDefault(require("mqtt"));
// Import routes and models
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const deviceRoutes_1 = __importDefault(require("./routes/deviceRoutes"));
const wifiRoutes_1 = __importDefault(require("./routes/wifiRoutes"));
const manifoldRoutes_1 = __importDefault(require("./routes/manifoldRoutes"));
const valveRoutes_1 = __importDefault(require("./routes/valveRoutes"));
const componentRoutes_1 = __importDefault(require("./routes/componentRoutes"));
const Device_1 = require("./models/Device");
const Manifold_1 = require("./models/Manifold");
const Valve_1 = require("./models/Valve");
const ValveCommand_1 = require("./models/ValveCommand");
// Load environment variables
dotenv_1.default.config();
console.log('Starting server...');
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});
// Middleware - CORS configuration
// Allow requests from localhost and network IPs
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin)
            return callback(null, true);
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
        }
        else {
            callback(null, true); // Allow all origins in development - change to false in production
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Setup MQTT client
const mqttClient = mqtt_1.default.connect(process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883');
// Store MQTT client and Socket.io in app context for controllers
app.set('mqttClient', mqttClient);
app.set('io', io);
mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    // Subscribe to all device data, status, and online topics
    mqttClient.subscribe(['devices/+/data', 'devices/+/status', 'devices/+/online'], (err) => {
        if (!err) {
            console.log('Subscribed to device topics');
        }
        else {
            console.error('Error subscribing to topics:', err);
        }
    });
    // Subscribe to manifold topics
    mqttClient.subscribe([
        'manifolds/+/status', // Manifold valve status updates
        'manifolds/+/online', // Manifold heartbeat
        'manifolds/+/ack' // Command acknowledgments
    ], (err) => {
        if (!err) {
            console.log('Subscribed to manifold topics');
        }
        else {
            console.error('Error subscribing to manifold topics:', err);
        }
    });
});
// Keep track of devices and their last seen time
const deviceHeartbeats = new Map();
// Function to handle when devices go offline
const checkDevicesStatus = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    for (const [deviceId, lastSeen] of deviceHeartbeats.entries()) {
        // If we haven't heard from a device in 15 seconds, mark it as offline (reduced from 30)
        if (now.getTime() - lastSeen.getTime() > 15000) {
            console.log(`Device ${deviceId} has timed out - marking as offline`);
            try {
                const device = yield Device_1.Device.findOneAndUpdate({ mqttTopic: `devices/${deviceId}` }, { status: 'offline' }, { new: true });
                if (device) {
                    io.emit('deviceStatus', {
                        deviceId: device._id,
                        status: 'offline'
                    });
                    // Keep in heartbeats map but with updated timestamp to prevent rapid on/off switching
                    deviceHeartbeats.set(deviceId, new Date(now.getTime() - 14000));
                }
            }
            catch (error) {
                console.error(`Error updating offline status for device ${deviceId}:`, error);
            }
        }
    }
});
// Check device status more frequently for real-time updates
setInterval(checkDevicesStatus, 5000); // Check every 5 seconds instead of 10
mqttClient.on('message', (topic, message) => __awaiter(void 0, void 0, void 0, function* () {
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
            let updatedDevice = yield Device_1.Device.findOneAndUpdate({ mqttTopic: `devices/${deviceId}` }, {
                status: isOnline ? 'online' : 'offline',
                lastSeen: new Date()
            }, { new: true });
            // If device not found, try alternative topic formats
            if (!updatedDevice) {
                // Try with just the device ID
                updatedDevice = yield Device_1.Device.findOneAndUpdate({ mqttTopic: deviceId }, {
                    status: isOnline ? 'online' : 'offline',
                    lastSeen: new Date()
                }, { new: true });
            }
            if (updatedDevice) {
                console.log(`Updated device status: ${updatedDevice._id} -> ${updatedDevice.status}`);
                // Emit status update to connected clients
                io.emit('deviceStatus', {
                    deviceId: updatedDevice._id,
                    status: updatedDevice.status
                });
            }
            else {
                console.log(`No device found with MQTT topic: devices/${deviceId} or ${deviceId}`);
            }
        }
        else if (type === 'data') {
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
                }
                else {
                    // Format: { temperature, humidity, value }
                    temperature = data.temperature !== undefined ? data.temperature : 0;
                    humidity = data.humidity !== undefined ? data.humidity : 0;
                    value = data.value !== undefined ? data.value : 0;
                }
                console.log(`Processing data for device ${deviceId}: temp=${temperature}, humidity=${humidity}, value=${value}`);
                // First try exact match
                let updatedDevice = yield Device_1.Device.findOneAndUpdate({ mqttTopic: `devices/${deviceId}` }, {
                    status: 'online',
                    lastSeen: new Date(),
                    lastData: {
                        timestamp: new Date(),
                        value: temperature // Use temperature as primary value
                    },
                    "settings.temperature": temperature,
                    "settings.humidity": humidity,
                    "settings.value": value
                }, { new: true });
                // If device not found, try alternative topic formats
                if (!updatedDevice) {
                    // Try with just the device ID
                    updatedDevice = yield Device_1.Device.findOneAndUpdate({ mqttTopic: deviceId }, {
                        status: 'online',
                        lastSeen: new Date(),
                        lastData: {
                            timestamp: new Date(),
                            value: temperature // Use temperature as primary value
                        },
                        "settings.temperature": temperature,
                        "settings.humidity": humidity,
                        "settings.value": value
                    }, { new: true });
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
                }
                else {
                    console.log(`Device not found for topic: devices/${deviceId} or ${deviceId}`);
                }
            }
            catch (error) {
                console.error('Error parsing device data:', error);
            }
        }
    }
    catch (error) {
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
                    yield Valve_1.Valve.findOneAndUpdate({
                        manifoldId: { $exists: true },
                        valveNumber: valveData.valveNumber
                    }, {
                        'operationalData.currentStatus': valveData.status,
                        updatedAt: new Date()
                    }, { new: true }).then((valve) => __awaiter(void 0, void 0, void 0, function* () {
                        if (valve) {
                            // Also update manifold last seen time
                            yield Manifold_1.Manifold.findByIdAndUpdate(valve.manifoldId, {
                                updatedAt: new Date()
                            });
                        }
                    }));
                }
                // Emit to Socket.io clients in manifold room
                io.to(`manifold-${manifoldId}`).emit('manifoldStatus', {
                    manifoldId,
                    valves,
                    timestamp: statusData.timestamp || Date.now()
                });
                console.log(`Updated valve states for manifold ${manifoldId}`);
            }
            else if (type === 'ack') {
                // Command acknowledgment from ESP32
                const ackData = JSON.parse(message.toString());
                const { commandId } = ackData;
                // Mark command as acknowledged
                const command = yield ValveCommand_1.ValveCommand.findOneAndUpdate({ commandId }, {
                    status: 'ACKNOWLEDGED',
                    acknowledgedAt: new Date()
                }, { new: true });
                if (command) {
                    console.log(`Command ${commandId} acknowledged by ESP32`);
                    // Emit acknowledgment to frontend
                    io.to(`manifold-${manifoldId}`).emit('commandAcknowledged', {
                        commandId,
                        manifoldId,
                        timestamp: new Date()
                    });
                }
            }
            else if (type === 'online') {
                // Manifold heartbeat / online status
                const isOnline = message.toString() === 'true';
                // Update manifold status
                const manifold = yield Manifold_1.Manifold.findOneAndUpdate({ manifoldId }, {
                    status: isOnline ? 'Active' : 'Offline',
                    updatedAt: new Date()
                }, { new: true });
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
        }
        catch (error) {
            console.error(`Error processing manifold ${type} message:`, error);
        }
    }
}));
// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('joinDevice', (deviceId) => {
        socket.join(deviceId);
    });
    socket.on('requestDeviceStatus', (deviceId) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const device = yield Device_1.Device.findById(deviceId);
            if (device) {
                // Send the current device status to the client
                socket.emit('deviceStatus', {
                    deviceId: device._id,
                    status: device.status
                });
            }
        }
        catch (error) {
            console.error(`Error getting device status for ${deviceId}:`, error);
        }
    }));
    // Manifold-specific Socket.io events
    socket.on('joinManifold', (manifoldId) => {
        socket.join(`manifold-${manifoldId}`);
        console.log(`Socket joined manifold room: manifold-${manifoldId}`);
    });
    socket.on('leaveManifold', (manifoldId) => {
        socket.leave(`manifold-${manifoldId}`);
        console.log(`Socket left manifold room: manifold-${manifoldId}`);
    });
    socket.on('requestManifoldStatus', (manifoldId) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const manifold = yield Manifold_1.Manifold.findById(manifoldId);
            if (manifold) {
                const valves = yield Valve_1.Valve.find({ manifoldId: manifold._id }).sort({ valveNumber: 1 });
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
        }
        catch (error) {
            console.error(`Error getting manifold status for ${manifoldId}:`, error);
        }
    }));
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});
// Connect to MongoDB
mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iotspace')
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));
// Debug endpoint to check database status
app.get('/api/debug/db-status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dbName = mongoose_1.default.connection.db.databaseName;
        const collections = yield mongoose_1.default.connection.db.listCollections().toArray();
        const stats = {
            connected: mongoose_1.default.connection.readyState === 1,
            databaseName: dbName,
            collections: []
        };
        for (const col of collections) {
            const count = yield mongoose_1.default.connection.db.collection(col.name).countDocuments();
            stats.collections.push({
                name: col.name,
                count: count
            });
        }
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
// Setup API routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/devices', deviceRoutes_1.default);
app.use('/api/device', wifiRoutes_1.default);
// Manifold system routes
app.use('/api/manifolds', manifoldRoutes_1.default);
app.use('/api/valves', valveRoutes_1.default);
app.use('/api/components', componentRoutes_1.default);
const PORT = parseInt(process.env.PORT || '5000', 10);
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Server accessible at:`);
    console.log(`  - Local:   http://localhost:${PORT}`);
    console.log(`  - Network: http://0.0.0.0:${PORT}`);
});
