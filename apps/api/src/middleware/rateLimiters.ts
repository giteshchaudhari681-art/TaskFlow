import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Strict rate limiter for sensitive authentication endpoints (login, register).
 * Mitigates credential stuffing and brute-force dictionary attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 10000 : 30, // 30 attempts per 15 minutes in non-test
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
  },
});
