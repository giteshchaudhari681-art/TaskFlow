import crypto from 'crypto';
import { CookieOptions } from 'express';
import { env } from '../../config/env.js';

export const REFRESH_COOKIE_NAME = 'taskflow_refresh_token';

/**
 * Generate a cryptographically secure 256-bit random string for the refresh token.
 */
export const generateRefreshToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash a raw refresh token using SHA-256.
 * Guarantees that only the one-way hash is stored in PostgreSQL.
 */
export const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Returns secure cookie settings for the refresh token.
 * Prevents XSS access (HttpOnly), restricts CSRF (SameSite=Lax), and restricts transmission to HTTPS in production.
 */
export const getRefreshCookieOptions = (): CookieOptions => {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: `${env.API_PREFIX}/auth`,
    maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  };
};

/**
 * Cookie options used to safely clear the refresh cookie upon logout.
 */
export const getClearCookieOptions = (): CookieOptions => {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: `${env.API_PREFIX}/auth`,
  };
};
