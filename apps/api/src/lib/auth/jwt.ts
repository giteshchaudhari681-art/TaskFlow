import jwt from 'jsonwebtoken';
import { JwtUserClaims } from '@taskflow/shared';
import { env } from '../../config/env.js';

/**
 * Sign a short-lived JSON Web Token for authenticated user requests.
 */
export const signAccessToken = (payload: Omit<JwtUserClaims, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
};

/**
 * Verify and decode an access token.
 * Throws an error if expired, malformed, or signature is invalid.
 */
export const verifyAccessToken = (token: string): JwtUserClaims => {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
  });

  return decoded as JwtUserClaims;
};
