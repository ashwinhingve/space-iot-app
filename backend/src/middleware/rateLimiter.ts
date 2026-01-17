import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints
 * Prevents brute force attacks on login/register
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // INCREASED for development - Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many attempts',
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests
  skipSuccessfulRequests: false,
});

/**
 * Stricter rate limiter for password-related endpoints
 * Prevents password reset abuse
 */
export const strictAuthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
  message: {
    error: 'Too many attempts',
    message: 'Too many password reset attempts. Please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter
 * Protects against general API abuse
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Valve command rate limiter
 * Prevents rapid valve commands that could damage relay hardware
 * Critical for industrial manifold systems to prevent relay burnout
 */
export const valveCommandLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 valve commands per minute
  message: {
    error: 'Too many valve commands',
    message: 'Too many valve commands. Please wait before sending more commands to prevent hardware damage.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip failed requests (only count successful commands)
  skipFailedRequests: true,
});
