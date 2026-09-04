import { Request, Response, NextFunction } from 'express';
import { updateProfileSchema, changePasswordSchema } from '@taskflow/validation';
import { userService } from '../services/user.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { REFRESH_COOKIE_NAME, getRefreshCookieOptions } from '../lib/auth/session.js';

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const profile = await userService.getProfile(req.user!.id);
    return sendSuccess(res, profile);
  } catch (err: unknown) {
    return next(err);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid profile update input data',
        400,
        parseResult.error.format()
      );
    }

    const updated = await userService.updateProfile(req.user!.id, parseResult.data);
    return sendSuccess(res, updated);
  } catch (err: unknown) {
    return next(err);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid password change input data',
        400,
        parseResult.error.format()
      );
    }

    const meta = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
      requestId: req.id,
    };

    const { accessToken, rawRefreshToken } = await userService.changePassword(
      req.user!.id,
      parseResult.data,
      meta
    );

    // Refresh active device cookie
    res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, getRefreshCookieOptions());

    return sendSuccess(res, {
      accessToken,
      message: 'Password changed successfully. All other remote device sessions have been revoked.',
    });
  } catch (err: unknown) {
    if (err instanceof Error && (err as unknown as { statusCode: number }).statusCode === 400) {
      return sendError(res, 'BAD_REQUEST', err.message, 400);
    }
    return next(err);
  }
};
