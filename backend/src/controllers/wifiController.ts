import { Request, Response } from 'express';
import { WiFiConfig } from '../models/WiFiConfig';
import crypto from 'crypto';

/**
 * Save or update WiFi credentials for a device
 * POST /api/device/wifi
 * Requires user authentication
 */
export const saveWiFiConfig = async (req: Request, res: Response) => {
  try {
    const { deviceId, ssid, password } = req.body;

    // Validate input
    if (!deviceId || !ssid || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'deviceId, ssid, and password are required.'
      });
    }

    // Validate deviceId format (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(deviceId)) {
      return res.status(400).json({
        error: 'Invalid deviceId format',
        message: 'deviceId can only contain letters, numbers, hyphens, and underscores.'
      });
    }

    // Check if config already exists for this device
    let wifiConfig = await WiFiConfig.findOne({ deviceId });

    if (wifiConfig) {
      // Check if the user owns this device config
      if (wifiConfig.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to modify this device configuration.'
        });
      }

      // Update existing config
      wifiConfig.ssid = ssid;
      wifiConfig.password = wifiConfig.encryptPassword(password);
      await wifiConfig.save();

      console.log(`WiFi config updated for device: ${deviceId}`);

      return res.json({
        success: true,
        message: 'WiFi configuration updated successfully',
        deviceId: wifiConfig.deviceId,
        apiKey: wifiConfig.apiKey,
        ssid: wifiConfig.ssid
      });
    } else {
      // Create new config
      const newConfig = new WiFiConfig({
        deviceId,
        ssid,
        password: '', // Will be encrypted in pre-save hook if we modify it
        owner: req.user._id
      });

      // Encrypt password
      newConfig.password = newConfig.encryptPassword(password);

      // Generate unique API key
      newConfig.apiKey = crypto.randomBytes(32).toString('hex');

      await newConfig.save();

      console.log(`WiFi config created for device: ${deviceId}`);

      return res.status(201).json({
        success: true,
        message: 'WiFi configuration created successfully',
        deviceId: newConfig.deviceId,
        apiKey: newConfig.apiKey,
        ssid: newConfig.ssid,
        instructions: {
          step1: 'Copy the API key below',
          step2: 'Update your ESP32 code with this API key',
          step3: 'Flash the firmware to your ESP32',
          step4: 'The device will automatically fetch WiFi credentials on boot'
        }
      });
    }
  } catch (error: any) {
    console.error('Error saving WiFi config:', error);

    // Handle duplicate deviceId error
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Device already exists',
        message: 'A configuration for this device ID already exists.'
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to save WiFi configuration.'
    });
  }
};

/**
 * Get WiFi credentials for a device (Device-side API)
 * GET /api/device/:deviceId/wifi
 * Requires device API key authentication
 */
export const getWiFiConfig = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;

    // Find WiFi config for this device
    const wifiConfig = await WiFiConfig.findOne({ deviceId });

    if (!wifiConfig) {
      return res.status(404).json({
        error: 'Configuration not found',
        message: 'No WiFi configuration found for this device.'
      });
    }

    // Verify API key matches
    if (!req.deviceConfig || req.deviceConfig._id.toString() !== wifiConfig._id.toString()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'API key does not match this device.'
      });
    }

    // Decrypt password
    const decryptedPassword = wifiConfig.decryptPassword(wifiConfig.password);

    // Update last fetched timestamp
    wifiConfig.lastFetched = new Date();
    await wifiConfig.save();

    console.log(`WiFi config fetched by device: ${deviceId}`);

    // Return credentials
    res.json({
      success: true,
      deviceId: wifiConfig.deviceId,
      ssid: wifiConfig.ssid,
      password: decryptedPassword,
      lastUpdated: wifiConfig.updatedAt
    });
  } catch (error) {
    console.error('Error fetching WiFi config:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch WiFi configuration.'
    });
  }
};

/**
 * Get all WiFi configurations for the authenticated user
 * GET /api/device/wifi/list
 * Requires user authentication
 */
export const listWiFiConfigs = async (req: Request, res: Response) => {
  try {
    const configs = await WiFiConfig.find({ owner: req.user._id })
      .select('-password') // Exclude encrypted password
      .sort('-updatedAt');

    res.json({
      success: true,
      count: configs.length,
      configs: configs.map(config => ({
        deviceId: config.deviceId,
        ssid: config.ssid,
        apiKey: config.apiKey,
        lastFetched: config.lastFetched,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error listing WiFi configs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to list WiFi configurations.'
    });
  }
};

/**
 * Delete WiFi configuration
 * DELETE /api/device/wifi/:deviceId
 * Requires user authentication
 */
export const deleteWiFiConfig = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;

    const wifiConfig = await WiFiConfig.findOneAndDelete({
      deviceId,
      owner: req.user._id
    });

    if (!wifiConfig) {
      return res.status(404).json({
        error: 'Configuration not found',
        message: 'No WiFi configuration found for this device.'
      });
    }

    console.log(`WiFi config deleted for device: ${deviceId}`);

    res.json({
      success: true,
      message: 'WiFi configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting WiFi config:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete WiFi configuration.'
    });
  }
};
