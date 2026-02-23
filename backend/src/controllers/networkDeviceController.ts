import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { NetworkDevice } from '../models/NetworkDevice';

/**
 * GET /api/network-devices
 * List network devices for the authenticated user.
 * Query params: protocol, status
 */
export const getNetworkDevices = async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = { owner: req.user._id };
    if (req.query.protocol) filter.protocol = req.query.protocol;
    if (req.query.status) filter.status = req.query.status;

    const devices = await NetworkDevice.find(filter).sort({ createdAt: -1 });
    res.json(devices);
  } catch (error) {
    console.error('Error fetching network devices:', error);
    res.status(500).json({ error: 'Failed to fetch network devices' });
  }
};

/**
 * GET /api/network-devices/stats
 * Aggregate device counts by protocol and total online count.
 */
export const getNetworkDeviceStats = async (req: Request, res: Response) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user._id);

    const results = await NetworkDevice.aggregate([
      { $match: { owner: ownerId } },
      {
        $group: {
          _id: '$protocol',
          count: { $sum: 1 },
          online: {
            $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] },
          },
        },
      },
    ]);

    const stats = { lorawan: 0, wifi: 0, bluetooth: 0, gsm: 0, online: 0 };
    for (const r of results) {
      const key = r._id as keyof typeof stats;
      if (key in stats) {
        stats[key] = r.count;
      }
      stats.online += r.online;
    }

    res.json(stats);
  } catch (error) {
    console.error('Error fetching network device stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

/**
 * GET /api/network-devices/:id
 * Get a single network device.
 */
export const getNetworkDevice = async (req: Request, res: Response) => {
  try {
    const device = await NetworkDevice.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(device);
  } catch (error) {
    console.error('Error fetching network device:', error);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
};

/**
 * POST /api/network-devices
 * Create a new network device.
 */
export const createNetworkDevice = async (req: Request, res: Response) => {
  try {
    const { name, description, protocol, tags, mqttDeviceId, lorawan, wifi, bluetooth, gsm } = req.body;

    const device = new NetworkDevice({
      name,
      description,
      protocol,
      tags: tags || [],
      owner: req.user._id,
      mqttDeviceId,
      lorawan,
      wifi,
      bluetooth,
      gsm,
    });

    await device.save();
    res.status(201).json(device);
  } catch (error) {
    console.error('Error creating network device:', error);
    res.status(500).json({ error: 'Failed to create device' });
  }
};

/**
 * PUT /api/network-devices/:id
 * Update a network device.
 */
export const updateNetworkDevice = async (req: Request, res: Response) => {
  try {
    const device = await NetworkDevice.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(device);
  } catch (error) {
    console.error('Error updating network device:', error);
    res.status(500).json({ error: 'Failed to update device' });
  }
};

/**
 * DELETE /api/network-devices/:id
 * Delete a network device.
 */
export const deleteNetworkDevice = async (req: Request, res: Response) => {
  try {
    const device = await NetworkDevice.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    console.error('Error deleting network device:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
};

/**
 * PATCH /api/network-devices/:id/status
 * Update only the status of a network device.
 */
export const updateNetworkDeviceStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const device = await NetworkDevice.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: { status, lastSeen: status === 'online' ? new Date() : undefined } },
      { new: true, runValidators: true }
    );
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(device);
  } catch (error) {
    console.error('Error updating network device status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};
