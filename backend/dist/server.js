"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const net = __importStar(require("net"));
const socket_io_1 = require("socket.io");
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mqtt_1 = __importDefault(require("mqtt"));
const aedes_1 = __importDefault(require("aedes"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Import routes and models
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const deviceRoutes_1 = __importDefault(require("./routes/deviceRoutes"));
const wifiRoutes_1 = __importDefault(require("./routes/wifiRoutes"));
const manifoldRoutes_1 = __importDefault(require("./routes/manifoldRoutes"));
const valveRoutes_1 = __importDefault(require("./routes/valveRoutes"));
const componentRoutes_1 = __importDefault(require("./routes/componentRoutes"));
const ttnRoutes_1 = __importDefault(require("./routes/ttnRoutes"));
const ttnWebhookRoutes_1 = __importDefault(require("./routes/ttnWebhookRoutes"));
const networkDeviceRoutes_1 = __importDefault(require("./routes/networkDeviceRoutes"));
const Device_1 = require("./models/Device");
const Manifold_1 = require("./models/Manifold");
const Valve_1 = require("./models/Valve");
const ValveCommand_1 = require("./models/ValveCommand");
// Import utilities and services
const validateEnv_1 = require("./utils/validateEnv");
const awsIotService_1 = require("./services/awsIotService");
const ttnMqttService_1 = require("./services/ttnMqttService");
const TTNApplication_1 = require("./models/TTNApplication");
const TTNDevice_1 = require("./models/TTNDevice");
const ttnService_1 = require("./services/ttnService");
// Load environment variables
dotenv_1.default.config();
// Validate environment variables before proceeding
(0, validateEnv_1.validateEnv)();
const config = (0, validateEnv_1.getEnvConfig)();
const isProduction = config.isProduction;
console.log(`Starting server in ${config.nodeEnv} mode...`);
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: config.frontendUrl || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});
// Middleware - CORS configuration
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, Postman, etc.)
        if (!origin)
            return callback(null, true);
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
        }
        else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Keep track of devices and their last seen time
const deviceHeartbeats = new Map();
// MQTT message handler function - works with both Aedes and AWS IoT
const handleMqttMessage = (topic, message) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
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
                let updatedDevice = yield Device_1.Device.findOneAndUpdate({ mqttTopic: `devices/${deviceId}` }, { status: isOnline ? 'online' : 'offline', lastSeen: new Date() }, { new: true });
                if (!updatedDevice) {
                    updatedDevice = yield Device_1.Device.findOneAndUpdate({ mqttTopic: { $regex: `/${deviceId}$`, $options: 'i' } }, { status: isOnline ? 'online' : 'offline', lastSeen: new Date() }, { new: true });
                }
                if (updatedDevice) {
                    console.log(`Updated device status: ${updatedDevice._id} -> ${updatedDevice.status}`);
                    io.emit('deviceStatus', { deviceId: updatedDevice._id, status: updatedDevice.status });
                }
                else {
                    const allDevices = yield Device_1.Device.find({}, 'mqttTopic');
                    console.log(`No device found for: ${deviceId}. Available: ${allDevices.map(d => d.mqttTopic).join(', ')}`);
                }
            }
            else if (type === 'data') {
                try {
                    const data = JSON.parse(message.toString());
                    let temperature = 0, humidity = 0, value = 0;
                    if (data.data) {
                        temperature = (_a = data.data.temperature) !== null && _a !== void 0 ? _a : 0;
                        humidity = (_b = data.data.humidity) !== null && _b !== void 0 ? _b : 0;
                        value = (_c = data.data.value) !== null && _c !== void 0 ? _c : 0;
                    }
                    else {
                        temperature = (_d = data.temperature) !== null && _d !== void 0 ? _d : 0;
                        humidity = (_e = data.humidity) !== null && _e !== void 0 ? _e : 0;
                        value = (_f = data.value) !== null && _f !== void 0 ? _f : 0;
                    }
                    console.log(`Processing data for ${deviceId}: temp=${temperature}, humidity=${humidity}`);
                    let updatedDevice = yield Device_1.Device.findOneAndUpdate({ mqttTopic: `devices/${deviceId}` }, {
                        $set: {
                            status: 'online',
                            lastSeen: new Date(),
                            lastData: { timestamp: new Date(), value: temperature },
                            settings: { temperature, humidity, value }
                        }
                    }, { new: true });
                    if (!updatedDevice) {
                        updatedDevice = yield Device_1.Device.findOneAndUpdate({ mqttTopic: { $regex: `/${deviceId}$`, $options: 'i' } }, {
                            $set: {
                                status: 'online',
                                lastSeen: new Date(),
                                lastData: { timestamp: new Date(), value: temperature },
                                settings: { temperature, humidity, value }
                            }
                        }, { new: true });
                    }
                    if (updatedDevice) {
                        console.log(`Updated device data: ${updatedDevice._id}`);
                        io.emit('deviceData', {
                            deviceId: updatedDevice._id,
                            data: { temperature, humidity, value, timestamp: new Date() }
                        });
                    }
                }
                catch (err) {
                    console.error('Error parsing device data:', err);
                }
            }
        }
        else if (prefix === 'manifolds') {
            const manifoldId = deviceId;
            console.log(`Processing manifold ${type} for ${manifoldId}`);
            if (type === 'status') {
                const statusData = JSON.parse(message.toString());
                const manifold = yield Manifold_1.Manifold.findOne({ manifoldId });
                if (manifold) {
                    for (const valveData of statusData.valves || []) {
                        const updatedValve = yield Valve_1.Valve.findOneAndUpdate({ manifoldId: manifold._id, valveNumber: valveData.valveNumber }, Object.assign(Object.assign({ 'operationalData.currentStatus': valveData.status }, (valveData.mode ? { 'operationalData.mode': valveData.mode } : {})), { updatedAt: new Date() }), { new: true });
                        if (((_g = updatedValve === null || updatedValve === void 0 ? void 0 : updatedValve.alarmConfig) === null || _g === void 0 ? void 0 : _g.enabled) &&
                            updatedValve.alarmConfig.ruleType === 'STATUS' &&
                            updatedValve.alarmConfig.metric === 'status' &&
                            valveData.status === updatedValve.alarmConfig.triggerStatus) {
                            const existingActive = updatedValve.alarms.find((alarm) => !alarm.acknowledged && alarm.message === `Valve ${updatedValve.valveNumber} status ${valveData.status}`);
                            if (!existingActive) {
                                updatedValve.alarms.push({
                                    alarmId: `AL-${Date.now()}-${updatedValve.valveNumber}`,
                                    severity: valveData.status === 'FAULT' ? 'CRITICAL' : 'WARNING',
                                    message: `Valve ${updatedValve.valveNumber} status ${valveData.status}`,
                                    timestamp: new Date(),
                                    acknowledged: false
                                });
                                yield updatedValve.save();
                            }
                        }
                    }
                    yield Manifold_1.Manifold.findByIdAndUpdate(manifold._id, { updatedAt: new Date() });
                }
                io.to(`manifold-${manifoldId}`).emit('manifoldStatus', {
                    manifoldId,
                    valves: statusData.valves,
                    timestamp: statusData.timestamp || Date.now()
                });
            }
            else if (type === 'online') {
                const isOnline = message.toString() === 'true';
                const manifold = yield Manifold_1.Manifold.findOneAndUpdate({ manifoldId }, { status: isOnline ? 'Active' : 'Offline', updatedAt: new Date() }, { new: true });
                if (manifold) {
                    io.to(`manifold-${manifoldId}`).emit('manifoldOnline', { manifoldId, isOnline, timestamp: new Date() });
                }
            }
            else if (type === 'ack') {
                const { commandId } = JSON.parse(message.toString());
                const command = yield ValveCommand_1.ValveCommand.findOneAndUpdate({ commandId }, { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() }, { new: true });
                if (command) {
                    io.to(`manifold-${manifoldId}`).emit('commandAcknowledged', { commandId, manifoldId, timestamp: new Date() });
                }
            }
        }
    }
    catch (error) {
        console.error('Error processing MQTT message:', error);
    }
});
// ============================================================
// ===== MQTT SETUP (3 modes: local, aws, cloud) =====
// ============================================================
let aedes = null;
let mqttServer = null;
let mqttClient = null;
let cloudMqttClient = null;
function setupMqtt() {
    return __awaiter(this, void 0, void 0, function* () {
        const mqttMode = config.mqttMode;
        console.log(`Setting up MQTT in '${mqttMode}' mode...`);
        if (mqttMode === 'aws') {
            // AWS IoT Core
            const awsConfig = {
                endpoint: config.awsIotEndpoint,
                certPath: config.awsIotCertPath,
                keyPath: config.awsIotKeyPath,
                caPath: config.awsIotCaPath,
                clientId: `iotspace-backend-${Date.now()}`,
                region: config.awsRegion
            };
            yield awsIotService_1.awsIotService.initialize(awsConfig, handleMqttMessage);
            yield awsIotService_1.awsIotService.subscribe('devices/+/data');
            yield awsIotService_1.awsIotService.subscribe('devices/+/online');
            yield awsIotService_1.awsIotService.subscribe('manifolds/+/status');
            yield awsIotService_1.awsIotService.subscribe('manifolds/+/online');
            yield awsIotService_1.awsIotService.subscribe('manifolds/+/ack');
            app.set('mqttClient', {
                publish: (topic, message, options, callback) => {
                    awsIotService_1.awsIotService.publish(topic, message, (options === null || options === void 0 ? void 0 : options.qos) || 1)
                        .then(() => callback === null || callback === void 0 ? void 0 : callback())
                        .catch((err) => callback === null || callback === void 0 ? void 0 : callback(err));
                },
                connected: () => awsIotService_1.awsIotService.isConnected()
            });
            console.log('AWS IoT Core setup complete');
        }
        else if (mqttMode === 'cloud') {
            // Cloud MQTT broker (HiveMQ, EMQX, etc.)
            const brokerUrl = config.mqttBrokerUrl;
            console.log(`Connecting to cloud MQTT broker: ${brokerUrl}`);
            cloudMqttClient = mqtt_1.default.connect(brokerUrl, {
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
                cloudMqttClient.subscribe(topics, { qos: 1 }, (err) => {
                    if (err) {
                        console.error('Cloud MQTT subscribe error:', err);
                    }
                    else {
                        console.log('Subscribed to device topics on cloud broker');
                    }
                });
            });
            cloudMqttClient.on('message', (topic, message) => __awaiter(this, void 0, void 0, function* () {
                if (topic.startsWith('devices/') || topic.startsWith('manifolds/')) {
                    try {
                        yield handleMqttMessage(topic, message);
                    }
                    catch (err) {
                        console.error('Cloud MQTT message handler error:', err);
                    }
                }
            }));
            cloudMqttClient.on('error', (err) => {
                console.error('Cloud MQTT error:', err);
            });
            cloudMqttClient.on('offline', () => {
                console.warn('Cloud MQTT client offline, will reconnect...');
            });
            // Store cloud client in app context for controllers
            app.set('mqttClient', cloudMqttClient);
            console.log('Cloud MQTT setup complete');
        }
        else {
            // Local Aedes broker (default for development)
            aedes = new aedes_1.default();
            mqttServer = net.createServer(aedes.handle);
            mqttServer.listen(config.mqttPort, '0.0.0.0', () => {
                console.log(`MQTT Broker running on port ${config.mqttPort}`);
                console.log(`  - Local:   mqtt://localhost:${config.mqttPort}`);
                console.log(`  - Network: mqtt://0.0.0.0:${config.mqttPort}`);
            });
            aedes.on('client', (client) => {
                console.log(`MQTT Client Connected: ${(client === null || client === void 0 ? void 0 : client.id) || 'unknown'}`);
            });
            aedes.on('clientDisconnect', (client) => {
                console.log(`MQTT Client Disconnected: ${(client === null || client === void 0 ? void 0 : client.id) || 'unknown'}`);
            });
            aedes.on('subscribe', (subscriptions, client) => {
                console.log(`MQTT Client ${client === null || client === void 0 ? void 0 : client.id} subscribed to: ${subscriptions.map(s => s.topic).join(', ')}`);
            });
            aedes.on('publish', (packet, client) => __awaiter(this, void 0, void 0, function* () {
                const topic = packet.topic;
                if (topic.startsWith('$'))
                    return;
                if (client) {
                    console.log(`MQTT Publish from ${client.id}: ${topic}`);
                }
                if (topic.startsWith('devices/') || topic.startsWith('manifolds/')) {
                    try {
                        yield handleMqttMessage(topic, packet.payload);
                    }
                    catch (err) {
                        console.error('Aedes message handler error:', err);
                    }
                }
            }));
            // Create MQTT client for PUBLISHING only
            setTimeout(() => {
                mqttClient = mqtt_1.default.connect(`mqtt://localhost:${config.mqttPort}`, {
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
    });
}
// Function to handle when devices go offline
const checkDevicesStatus = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    for (const [deviceId, lastSeen] of deviceHeartbeats.entries()) {
        if (now.getTime() - lastSeen.getTime() > 15000) {
            console.log(`Device ${deviceId} has timed out - marking as offline`);
            try {
                let device = yield Device_1.Device.findOneAndUpdate({ mqttTopic: `devices/${deviceId}` }, { status: 'offline' }, { new: true });
                if (!device) {
                    device = yield Device_1.Device.findOneAndUpdate({ mqttTopic: { $regex: `/${deviceId}$`, $options: 'i' } }, { status: 'offline' }, { new: true });
                }
                if (device) {
                    io.emit('deviceStatus', { deviceId: device._id, status: 'offline' });
                    deviceHeartbeats.set(deviceId, new Date(now.getTime() - 14000));
                }
            }
            catch (error) {
                console.error(`Error updating offline status for device ${deviceId}:`, error);
            }
        }
    }
});
setInterval(checkDevicesStatus, 5000);
// Expire old valve commands every 60 seconds
setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield ValveCommand_1.ValveCommand.expireOldCommands();
    }
    catch (err) {
        console.error('Error expiring valve commands:', err);
    }
}), 60000);
// Socket.io authentication middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication required'));
    }
    try {
        jsonwebtoken_1.default.verify(token, config.jwtSecret);
        next();
    }
    catch (_a) {
        next(new Error('Invalid token'));
    }
});
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
                socket.emit('deviceStatus', { deviceId: device._id, status: device.status });
            }
        }
        catch (error) {
            console.error(`Error getting device status for ${deviceId}:`, error);
        }
    }));
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
mongoose_1.default.connect(config.mongodbUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));
// ============================================================
// ===== HEALTH CHECK ENDPOINT =====
// ============================================================
app.get('/api/health', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let mqttConnected = false;
    if (config.mqttMode === 'aws') {
        mqttConnected = awsIotService_1.awsIotService.isConnected();
    }
    else if (config.mqttMode === 'cloud') {
        mqttConnected = (_a = cloudMqttClient === null || cloudMqttClient === void 0 ? void 0 : cloudMqttClient.connected) !== null && _a !== void 0 ? _a : false;
    }
    else {
        const mqttClientInstance = app.get('mqttClient');
        mqttConnected = (_b = mqttClientInstance === null || mqttClientInstance === void 0 ? void 0 : mqttClientInstance.connected) !== null && _b !== void 0 ? _b : false;
    }
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        services: {
            database: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected',
            mqtt: mqttConnected ? 'connected' : 'disconnected'
        },
        version: process.env.npm_package_version || '1.0.0'
    });
}));
// ============================================================
// ===== DEBUG ENDPOINTS (Development Only) =====
// ============================================================
if (!isProduction) {
    // Debug endpoint to list all devices with their MQTT topics
    app.get('/api/debug/devices', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const devices = yield Device_1.Device.find({}, 'name mqttTopic status lastSeen');
            res.json({
                count: devices.length,
                devices: devices.map(d => ({
                    id: d._id, name: d.name, mqttTopic: d.mqttTopic, status: d.status, lastSeen: d.lastSeen
                }))
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }));
    // Debug endpoint to check database status
    app.get('/api/debug/db-status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const dbName = mongoose_1.default.connection.db.databaseName;
            const collections = yield mongoose_1.default.connection.db.listCollections().toArray();
            const stats = { connected: mongoose_1.default.connection.readyState === 1, databaseName: dbName, collections: [] };
            for (const col of collections) {
                const count = yield mongoose_1.default.connection.db.collection(col.name).countDocuments();
                stats.collections.push({ name: col.name, count });
            }
            res.json(stats);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }));
}
else {
    // Return 404 for debug endpoints in production
    app.get('/api/debug/*', (req, res) => {
        res.status(404).json({ error: 'Not found' });
    });
}
// Setup API routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/devices', deviceRoutes_1.default);
app.use('/api/device', wifiRoutes_1.default);
app.use('/api/manifolds', manifoldRoutes_1.default);
app.use('/api/valves', valveRoutes_1.default);
app.use('/api/components', componentRoutes_1.default);
app.use('/api/ttn', ttnRoutes_1.default);
app.use('/api/ttn/webhook', ttnWebhookRoutes_1.default);
app.use('/api/network-devices', networkDeviceRoutes_1.default);
// ============================================================
// ===== SERVER STARTUP =====
// ============================================================
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        // Initialize MQTT
        yield setupMqtt();
        // Store Socket.io instance in app for webhook routes
        app.set('io', io);
        // Initialize TTN MQTT connections for all active apps with stored API keys
        ttnMqttService_1.ttnMqttService.setSocketIO(io);
        try {
            const ttnApps = yield TTNApplication_1.TTNApplication.find({ isActive: true }).select('+apiKeyEncrypted');
            const appsToConnect = ttnApps
                .filter((app) => app.apiKeyEncrypted)
                .map((app) => ({
                region: app.ttnRegion,
                applicationId: app.applicationId,
                apiKey: app.getApiKey(),
            }));
            if (appsToConnect.length > 0) {
                yield ttnMqttService_1.ttnMqttService.connectAll(appsToConnect);
            }
            else {
                console.log('[TTN] No applications with stored API keys found');
            }
        }
        catch (err) {
            console.warn('[TTN] Error connecting MQTT on startup:', err);
        }
        // Periodic TTN sync every 5 minutes
        setInterval(() => __awaiter(this, void 0, void 0, function* () {
            try {
                const apps = yield TTNApplication_1.TTNApplication.find({ isActive: true }).select('+apiKeyEncrypted');
                for (const app of apps) {
                    const apiKey = app.getApiKey();
                    if (!apiKey)
                        continue;
                    try {
                        ttnService_1.ttnService.initialize({
                            region: app.ttnRegion,
                            applicationId: app.applicationId,
                            apiKey,
                        });
                        const ttnDevices = yield ttnService_1.ttnService.getDevices();
                        for (const ttnDevice of ttnDevices) {
                            yield TTNDevice_1.TTNDevice.findOneAndUpdate({ deviceId: ttnDevice.ids.device_id, applicationId: app.applicationId }, {
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
                            }, { upsert: true });
                        }
                        app.lastSync = new Date();
                        yield app.save();
                        console.log(`[TTN Sync] ${app.applicationId}: ${ttnDevices.length} devices synced`);
                    }
                    catch (syncErr) {
                        console.warn(`[TTN Sync] Error syncing ${app.applicationId}:`, syncErr);
                    }
                }
            }
            catch (err) {
                console.error('[TTN Sync] Periodic sync error:', err);
            }
        }), 5 * 60 * 1000);
        // Start HTTP server
        httpServer.listen(config.port, '0.0.0.0', () => {
            console.log(`Server running on port ${config.port}`);
            console.log(`  - Local:   http://localhost:${config.port}`);
            console.log(`  - Network: http://0.0.0.0:${config.port}`);
            console.log(`  - Mode:    ${config.nodeEnv}`);
        });
    });
}
// Graceful shutdown handler
process.on('SIGTERM', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('SIGTERM received, shutting down gracefully...');
    // Close HTTP server
    httpServer.close(() => {
        console.log('HTTP server closed');
    });
    // Close TTN MQTT
    ttnMqttService_1.ttnMqttService.disconnect();
    // Close MQTT connections
    if (config.mqttMode === 'aws') {
        yield awsIotService_1.awsIotService.disconnect();
    }
    else if (config.mqttMode === 'cloud') {
        if (cloudMqttClient) {
            cloudMqttClient.end();
        }
    }
    else {
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
    yield mongoose_1.default.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
}));
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('SIGINT received, shutting down...');
    process.emit('SIGTERM', 'SIGTERM');
}));
// Start the server
startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
