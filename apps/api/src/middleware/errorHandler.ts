import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ERROR_CODES, HTTP_STATUS } from '@taskflow/shared';
import { sendError } from '../utils/response.js';
import { env } from '../config/env.js';
import { captureException } from '../monitoring/sentry.js';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = HTTP_STATUS.BAD_REQUEST,
    public readonly details?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Detects Prisma and PostgreSQL infrastructure connection/pool failures.
 */
export const isDatabaseConnectionError = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') return false;
  const errorObj = err as Record<string, unknown>;
  const name = typeof errorObj.name === 'string' ? errorObj.name : '';
  const code = typeof errorObj.code === 'string' ? errorObj.code : '';

  if (name === 'PrismaClientInitializationError' || name === 'PrismaClientRustPanicError') {
    return true;
  }

  // P1000 to P1017: Prisma database connection/authentication/unreachable codes
  // P2024: Connection pool timeout
  if (code.startsWith('P10') || code === 'P2024') {
    return true;
  }

  const message = typeof errorObj.message === 'string' ? errorObj.message : '';
  if (
    message.includes("Can't reach database server") ||
    message.includes('Connection to database failed') ||
    message.includes('timed out fetching a new connection from the connection pool')
  ) {
    return true;
  }

  return false;
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  // Handle AppError instances
  if (err instanceof AppError) {
    // Only capture high-severity unexpected AppErrors (5xx)
    if (err.statusCode >= 500) {
      captureException(err, {
        requestId: req.id || (req.headers['x-request-id'] as string),
        userId: req.user?.id,
        organizationId: req.orgMember?.organizationId,
        route: req.path,
        method: req.method,
        statusCode: err.statusCode,
      });
    }
    const meta =
      (err as unknown as { entitlementDetails?: unknown }).entitlementDetails ?? err.details;
    return sendError(res, err.code, err.message, err.statusCode, err.details, meta);
  }

  // Handle Zod validation errors (expected 400 operational error, filtered from Sentry)
  if (err instanceof ZodError) {
    const issues = err.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    return sendError(
      res,
      ERROR_CODES.VALIDATION_ERROR,
      'Request validation failed',
      HTTP_STATUS.BAD_REQUEST,
      issues
    );
  }

  // Handle database infrastructure failures gracefully without leaking credentials/internals
  if (isDatabaseConnectionError(err)) {
    captureException(err, {
      requestId: req.id || (req.headers['x-request-id'] as string),
      userId: req.user?.id,
      organizationId: req.orgMember?.organizationId,
      route: req.path,
      method: req.method,
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
      extra: { infrastructure: 'database' },
    });

    console.error('[Database Infrastructure Error]', err.name || 'DatabaseError');

    return sendError(
      res,
      ERROR_CODES.SERVICE_UNAVAILABLE,
      'Database service temporarily unavailable',
      HTTP_STATUS.SERVICE_UNAVAILABLE
    );
  }

  // Handle unexpected internal server errors (captured to Sentry)
  captureException(err, {
    requestId: req.id || (req.headers['x-request-id'] as string),
    userId: req.user?.id,
    organizationId: req.orgMember?.organizationId,
    route: req.path,
    method: req.method,
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  });

  console.error('[Unhandled Error]', err);
  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  return sendError(
    res,
    ERROR_CODES.INTERNAL_ERROR,
    message,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    env.NODE_ENV === 'development' ? { stack: err.stack } : undefined
  );
};
