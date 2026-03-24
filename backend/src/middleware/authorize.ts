import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';

/**
 * Authorization middleware factory.
 * Usage: router.get('/route', auth, authorize('admin', 'engineer'), handler)
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (req.user.isActive === false) {
      return res.status(403).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact the administrator.',
        code: 'ACCOUNT_DISABLED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${roles.join(', ')}`,
        code: 'FORBIDDEN',
        requiredRoles: roles,
        currentRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Middleware that checks if user is active (not disabled).
 * Used alongside auth middleware.
 */
export const requireActive = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }

  if (req.user.isActive === false) {
    return res.status(403).json({
      error: 'Account disabled',
      message: 'Your account has been disabled. Please contact the administrator.',
      code: 'ACCOUNT_DISABLED'
    });
  }

  next();
};
