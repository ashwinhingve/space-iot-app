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
exports.controlDevice = exports.deleteDevice = exports.updateDevice = exports.getDevice = exports.getDevices = exports.createDevice = void 0;
const Device_1 = require("../models/Device");
const mqtt_1 = __importDefault(require("mqtt"));
// MQTT client for publishing messages
const mqttClient = mqtt_1.default.connect(process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883');
const createDevice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { name, type, mqttTopic } = req.body;
        // Validate the MQTT topic format
        if (!mqttTopic) {
            return res.status(400).json({ error: 'MQTT topic is required' });
        }
        // If the topic doesn't already start with "devices/", add it
        if (!mqttTopic.startsWith('devices/')) {
            console.log(`Adding 'devices/' prefix to topic: ${mqttTopic}`);
            mqttTopic = `devices/${mqttTopic}`;
        }
        console.log(`Creating device with name: ${name}, type: ${type}, topic: ${mqttTopic}`);
        const device = new Device_1.Device({
            name,
            type,
            mqttTopic,
            owner: req.user._id
        });
        yield device.save();
        console.log(`Device created successfully with ID: ${device._id}`);
        res.status(201).json(device);
    }
    catch (error) {
        console.error('Error creating device:', error);
        res.status(500).json({ error: 'Error creating device' });
    }
});
exports.createDevice = createDevice;
const getDevices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const devices = yield Device_1.Device.find({ owner: req.user._id }).sort('-lastSeen');
        res.json(devices);
    }
    catch (error) {
        console.error('Error fetching devices:', error);
        res.status(500).json({ error: 'Error fetching devices' });
    }
});
exports.getDevices = getDevices;
const getDevice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const device = yield Device_1.Device.findOne({
            _id: req.params.id,
            owner: req.user._id
        });
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }
        res.json(device);
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching device' });
    }
});
exports.getDevice = getDevice;
const updateDevice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const device = yield Device_1.Device.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, req.body, { new: true });
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }
        res.json(device);
    }
    catch (error) {
        res.status(500).json({ error: 'Error updating device' });
    }
});
exports.updateDevice = updateDevice;
const deleteDevice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const device = yield Device_1.Device.findOneAndDelete({
            _id: req.params.id,
            owner: req.user._id
        });
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }
        res.json({ message: 'Device deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error deleting device' });
    }
});
exports.deleteDevice = deleteDevice;
const controlDevice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { value } = req.body;
        const device = yield Device_1.Device.findOne({
            _id: req.params.id,
            owner: req.user._id
        });
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }
        // Publish control message to MQTT
        mqttClient.publish(`${device.mqttTopic}/control`, JSON.stringify({ value }), { qos: 1 });
        res.json({ message: 'Control command sent successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error controlling device' });
    }
});
exports.controlDevice = controlDevice;
