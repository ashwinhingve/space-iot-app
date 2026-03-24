import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, ADMIN_EMAIL_CONST } from '../models/User';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { SystemConfig, getSystemMode, invalidateSystemModeCache } from '../models/SystemConfig';

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Validate email format
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate JWT token
 */
const generateToken = (userId: string): string => {
  return jwt.sign(
    { _id: userId },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
};

import { ROLE_DEFAULT_PERMISSIONS } from '../models/User';

const ADMIN_PERMISSIONS: string[] = ROLE_DEFAULT_PERMISSIONS['admin'];

/**
 * Enforce admin email always has role=admin and full permissions.
 * Silently updates DB if needed — no error thrown.
 */
async function enforceAdminIfNeeded(user: any): Promise<void> {
  if (user.email !== ADMIN_EMAIL_CONST) return;
  const needsUpdate = user.role !== 'admin' || !user.permissions || user.permissions.length < ADMIN_PERMISSIONS.length;
  if (needsUpdate) {
    user.role = 'admin';
    user.permissions = ADMIN_PERMISSIONS;
    await user.save();
  }
}

/**
 * Build safe user response object (includes role)
 */
const buildUserResponse = (user: any) => ({
  _id: user._id,
  email: user.email,
  name: user.name,
  avatar: user.avatar,
  authProvider: user.authProvider,
  role: user.role,
  permissions: user.permissions || [],
  isActive: user.isActive,
  phone: user.phone,
  department: user.department,
  village: user.village,
  project: user.project,
  createdAt: user.createdAt
});

/**
 * Register new user
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide name, email, and password'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    // Enhanced password validation
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password too short',
        message: 'Password must be at least 8 characters long'
      });
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        error: 'Invalid name',
        message: 'Name must be at least 2 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        error: 'Email already registered',
        message: 'An account with this email already exists'
      });
    }

    // Determine role:
    //  1. Designated admin email → always admin
    //  2. Single (individual) mode → new users are admin
    //  3. Team mode → new users are ows
    const isAdminEmail = email.toLowerCase() === ADMIN_EMAIL_CONST;
    let role = 'ows';
    if (isAdminEmail) {
      role = 'admin';
    } else {
      const sysMode = await getSystemMode();
      if (sysMode === 'single') role = 'admin';
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password,
      name: name.trim(),
      authProvider: 'local',
      role
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id.toString());

    console.log(`New user registered: ${user.email} (role: ${user.role})`);

    res.status(201).json({
      success: true,
      token,
      user: buildUserResponse(user)
    });
  } catch (error: any) {
    console.error('Registration error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Email already registered',
        message: 'An account with this email already exists'
      });
    }

    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred while creating your account'
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Please provide email and password'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    if (user.authProvider === 'google') {
      return res.status(401).json({
        error: 'Invalid login method',
        message: 'This account uses Google Sign-In. Please login with Google.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact the administrator.'
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    await enforceAdminIfNeeded(user);

    const token = generateToken(user._id.toString());

    console.log(`User logged in: ${user.email} (role: ${user.role})`);

    res.json({
      success: true,
      token,
      user: buildUserResponse(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred while logging in'
    });
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    await enforceAdminIfNeeded(user);

    res.json({
      success: true,
      user: buildUserResponse(user)
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'An error occurred while fetching user data'
    });
  }
};

/**
 * Google OAuth callback
 * POST /api/auth/google
 */
export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        error: 'Missing credential',
        message: 'Google ID token is required'
      });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID!,
      });
      payload = ticket.getPayload();

      if (!payload) {
        throw new Error('Invalid token payload');
      }
    } catch (verifyError: any) {
      console.error('Google token verification failed:', verifyError.message);
      return res.status(401).json({
        error: 'Invalid Google token',
        message: 'Failed to verify Google authentication. Please try again.'
      });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || 'Google User';
    const avatar = payload.picture;

    if (!payload.email_verified) {
      return res.status(400).json({
        error: 'Email not verified',
        message: 'Please verify your email with Google first'
      });
    }

    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.findOne({ email: email!.toLowerCase() });

      if (user) {
        if (user.authProvider === 'local') {
          return res.status(400).json({
            error: 'Email already registered',
            message: 'An account with this email exists. Please login with email and password.'
          });
        }
        user.googleId = googleId;
        user.avatar = avatar || user.avatar;
        user.name = name || user.name;
        await user.save();
      } else {
        // Determine role for new Google users (same logic as register)
        let role = 'ows';
        if (email!.toLowerCase() === ADMIN_EMAIL_CONST) {
          role = 'admin';
        } else {
          const sysMode = await getSystemMode();
          if (sysMode === 'single') role = 'admin';
        }

        user = new User({
          email: email!.toLowerCase(),
          name,
          googleId,
          avatar,
          authProvider: 'google',
          role
        });
        await user.save();
        console.log(`New user registered via Google: ${user.email} (role: ${user.role})`);
      }
    } else {
      if (!user.isActive) {
        return res.status(403).json({
          error: 'Account disabled',
          message: 'Your account has been disabled. Please contact the administrator.'
        });
      }
      user.name = name;
      user.avatar = avatar || user.avatar;
      await user.save();
    }

    await enforceAdminIfNeeded(user);

    const token = generateToken(user._id.toString());

    console.log(`User logged in via Google: ${user.email} (role: ${user.role})`);

    res.json({
      success: true,
      token,
      user: buildUserResponse(user)
    });
  } catch (error: any) {
    console.error('Google auth error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Account already exists',
        message: 'An account with this Google ID already exists'
      });
    }

    res.status(500).json({
      error: 'Google authentication failed',
      message: 'An error occurred during Google authentication'
    });
  }
};

/**
 * First-time system setup — Individual mode
 * POST /api/auth/setup
 *
 * Sets system mode to 'single' and registers the first user as Admin.
 * Only works when NO admin user exists in the database (first-time setup).
 * After setup, subsequent logins work normally.
 */
export const setupSystem = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide name, email, and password'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email', message: 'Please provide a valid email address' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password too short', message: 'Password must be at least 8 characters' });
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNum   = /[0-9]/.test(password);
    if (!hasUpper || !hasLower || !hasNum) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must contain uppercase, lowercase, and a number'
      });
    }

    // Guard: only allowed if no admin exists yet
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return res.status(403).json({
        error: 'Setup already complete',
        message: 'An admin already exists. Use the normal registration form.'
      });
    }

    // Check if email is already registered
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        error: 'Email already registered',
        message: 'An account with this email already exists'
      });
    }

    // Switch system mode to 'single' (Individual)
    let cfg = await SystemConfig.findOne();
    if (!cfg) cfg = new SystemConfig({ mode: 'single' });
    cfg.mode = 'single';
    await cfg.save();
    invalidateSystemModeCache();

    // Create first user with full Admin role
    const user = new User({
      email: email.toLowerCase(),
      password,
      name: name.trim(),
      authProvider: 'local',
      role: 'admin',
    });
    await user.save();

    const token = generateToken(user._id.toString());
    console.log(`System setup complete. First admin created: ${user.email}`);

    res.status(201).json({
      success: true,
      token,
      user: buildUserResponse(user),
      message: 'Individual mode configured. You are the system administrator.'
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already registered', message: 'An account with this email already exists' });
    }
    res.status(500).json({ error: 'Setup failed', message: 'An error occurred during setup' });
  }
};

/**
 * Logout user (client-side token removal)
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred while logging out'
    });
  }
};
