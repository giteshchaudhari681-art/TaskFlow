import { Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema } from '@taskflow/validation';
import { authService } from '../services/auth.service.js';
import {
  REFRESH_COOKIE_NAME,
  getRefreshCookieOptions,
  getClearCookieOptions,
} from '../lib/auth/session.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid registration input data',
        400,
        parseResult.error.format()
      );
    }

    const meta = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
    };

    const { data, rawRefreshToken } = await authService.register(parseResult.data, meta);

    res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, getRefreshCookieOptions());

    return sendSuccess(res, data, 201);
  } catch (err: unknown) {
    if (err instanceof Error && (err as unknown as { statusCode: number }).statusCode === 409) {
      return sendError(res, 'CONFLICT', err.message, 409);
    }
    return next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid login input data',
        400,
        parseResult.error.format()
      );
    }

    const meta = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
    };

    const { data, rawRefreshToken } = await authService.login(parseResult.data, meta);

    res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, getRefreshCookieOptions());

    return sendSuccess(res, data, 200);
  } catch (err: unknown) {
    if (err instanceof Error && (err as unknown as { statusCode: number }).statusCode === 401) {
      return sendError(res, 'INVALID_CREDENTIALS', err.message, 401);
    }
    return next(err);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawRefreshToken) {
      return sendError(res, 'UNAUTHORIZED', 'No active refresh session found', 401);
    }

    const meta = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
    };

    const { data, rawRefreshToken: newRefreshToken } = await authService.refresh(
      rawRefreshToken,
      meta
    );

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getRefreshCookieOptions());

    return sendSuccess(res, data, 200);
  } catch (err: unknown) {
    if (err instanceof Error && (err as unknown as { statusCode: number }).statusCode === 401) {
      res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());
      return sendError(res, 'UNAUTHORIZED', err.message, 401);
    }
    return next(err);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (rawRefreshToken) {
      await authService.logout(rawRefreshToken);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());

    return sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err: unknown) {
    return next(err);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const data = await authService.getCurrentUser(req.user!.id);
    return sendSuccess(res, data);
  } catch (err: unknown) {
    return next(err);
  }
};
