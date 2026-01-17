import { Request, Response, NextFunction } from 'express';
import { WiFiConfig } from '../models/WiFiConfig';

declare global {
  namespace Express {
    interface Request {
      deviceConfig?: any;
    }
  }
}

/**
 * Middleware to authenticate device requests using API key
 * Expects 'X-API-Key' header
 */
export const deviceAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.header('X-API-Key');

    if (!apiKey) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'API key is missing. Please provide X-API-Key header.'
      });
    }

    // Find device config by API key
    const deviceConfig = await WiFiConfig.findOne({ apiKey });

    if (!deviceConfig) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid.'
      });
    }

    // Attach device config to request
    req.deviceConfig = deviceConfig;
    next();
  } catch (error) {
    console.error('Device authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred during authentication.'
    });
  }
};
