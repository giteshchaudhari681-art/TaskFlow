import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/auth/jwt.js';
import { userRepository } from '../repositories/user.repository.js';
import { sendError } from '../utils/response.js';

/**
 * Authentication middleware that requires a valid Bearer access JWT.
 * Populates req.user upon successful validation.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'UNAUTHORIZED', 'Authentication token is missing or malformed', 401);
  }

  const token = authHeader.substring(7).trim();

  try {
    const claims = verifyAccessToken(token);

    const user = await userRepository.findById(claims.sub);
    if (!user) {
      return sendError(res, 'UNAUTHORIZED', 'User account not found or deactivated', 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    return next();
  } catch (err: unknown) {
    const message =
      err instanceof Error && err.name === 'TokenExpiredError'
        ? 'Access token has expired'
        : 'Invalid authentication token';

    return sendError(res, 'UNAUTHORIZED', message, 401);
  }
};
