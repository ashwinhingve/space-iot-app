import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';

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

    // Check for password strength (optional but recommended)
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

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

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password,
      name: name.trim(),
      authProvider: 'local'
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id.toString());

    console.log(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        authProvider: user.authProvider,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);

    // Handle duplicate key error
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

    // Validation
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

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Check if user registered with Google
    if (user.authProvider === 'google') {
      return res.status(401).json({
        error: 'Invalid login method',
        message: 'This account uses Google Sign-In. Please login with Google.'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Generate JWT token
    const token = generateToken(user._id.toString());

    console.log(`User logged in: ${user.email}`);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        authProvider: user.authProvider,
        createdAt: user.createdAt
      }
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
 * Requires authentication
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

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        authProvider: user.authProvider,
        createdAt: user.createdAt
      }
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
 * Google OAuth callback - SECURE VERSION
 * POST /api/auth/google
 * Verifies Google ID token before creating/logging in user
 */
export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    // Validation
    if (!credential) {
      return res.status(400).json({
        error: 'Missing credential',
        message: 'Google ID token is required'
      });
    }

    // Verify Google ID token
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

    // Extract verified user data
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || 'Google User';
    const avatar = payload.picture;

    // Validate email is verified by Google
    if (!payload.email_verified) {
      return res.status(400).json({
        error: 'Email not verified',
        message: 'Please verify your email with Google first'
      });
    }

    // Check if user exists with this Google ID
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if user exists with this email
      user = await User.findOne({ email: email!.toLowerCase() });

      if (user) {
        // User exists with email but different auth provider
        if (user.authProvider === 'local') {
          return res.status(400).json({
            error: 'Email already registered',
            message: 'An account with this email exists. Please login with email and password.'
          });
        }
        // Update Google ID if missing
        user.googleId = googleId;
        user.avatar = avatar || user.avatar;
        user.name = name || user.name;
        await user.save();
      } else {
        // Create new user
        user = new User({
          email: email!.toLowerCase(),
          name,
          googleId,
          avatar,
          authProvider: 'google'
        });
        await user.save();
        console.log(`New user registered via Google: ${user.email}`);
      }
    } else {
      // Update user info from Google
      user.name = name;
      user.avatar = avatar || user.avatar;
      await user.save();
    }

    // Generate JWT token
    const token = generateToken(user._id.toString());

    console.log(`User logged in via Google: ${user.email}`);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        authProvider: user.authProvider,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    console.error('Google auth error:', error);

    // Handle duplicate key error
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
 * Logout user (client-side token removal)
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // You could implement token blacklisting here if needed
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
