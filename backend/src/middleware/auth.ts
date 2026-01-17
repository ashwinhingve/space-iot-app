import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

interface JwtPayload {
  _id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: string;
    }
  }
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || !authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No authentication token provided',
        code: 'NO_TOKEN'
      });
    }

    // Verify JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Your session has expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Authentication token is invalid',
          code: 'INVALID_TOKEN'
        });
      }
      throw jwtError;
    }

    // Find user
    const user = await User.findOne({ _id: decoded._id });

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'User account no longer exists',
        code: 'USER_NOT_FOUND'
      });
    }

    // Attach user and token to request
    req.user = user;
    req.token = token;
    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication',
      code: 'AUTH_ERROR'
    });
  }
}; 