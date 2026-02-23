import { Request, Response } from 'express';
import { Device } from '../models/Device';

export const createDevice = async (req: Request, res: Response) => {
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

    const device = new Device({
      name,
      type,
      mqttTopic,
      owner: req.user._id
    });

    await device.save();
    console.log(`Device created successfully with ID: ${device._id}`);
    res.status(201).json(device);
  } catch (error) {
    console.error('Error creating device:', error);
    res.status(500).json({ error: 'Error creating device' });
  }
};

export const getDevices = async (req: Request, res: Response) => {
  try {
    const devices = await Device.find({ owner: req.user._id }).sort('-lastSeen');
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Error fetching devices' });
  }
};

export const getDevice = async (req: Request, res: Response) => {
  try {
    const device = await Device.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(device);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching device' });
  }
};

export const updateDevice = async (req: Request, res: Response) => {
  try {
    const device = await Device.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(device);
  } catch (error) {
    res.status(500).json({ error: 'Error updating device' });
  }
};

export const deleteDevice = async (req: Request, res: Response) => {
  try {
    const device = await Device.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting device' });
  }
};

export const controlDevice = async (req: Request, res: Response) => {
  try {
    const { value } = req.body;
    const device = await Device.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Get MQTT client from app context (works with both Aedes and AWS IoT)
    const mqttClient = req.app.get('mqttClient');

    if (!mqttClient) {
      console.error('MQTT client not available');
      return res.status(503).json({ error: 'MQTT service unavailable' });
    }

    // Publish control message to MQTT
    mqttClient.publish(
      `${device.mqttTopic}/control`,
      JSON.stringify({ value }),
      { qos: 1 },
      (err?: Error) => {
        if (err) {
          console.error('Error publishing MQTT message:', err);
        }
      }
    );

    const nextStatus = Number(value) > 0 ? 'online' : device.status;
    device.status = nextStatus;
    device.lastSeen = new Date();
    device.lastData = {
      timestamp: new Date(),
      value: Number(value) || 0
    };
    device.settings = {
      ...device.settings,
      value: Number(value) || 0
    };
    await device.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('deviceData', {
        deviceId: device._id,
        data: {
          value: Number(value) || 0,
          timestamp: new Date().toISOString()
        }
      });
      io.emit('deviceStatus', { deviceId: device._id, status: device.status });
    }

    res.json({ message: 'Control command sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error controlling device' });
  }
};
