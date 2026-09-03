import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const correlationId =
    (req.headers['x-request-id'] as string) ||
    (req.headers['request-id'] as string) ||
    crypto.randomUUID();

  req.id = correlationId;
  res.setHeader('X-Request-ID', correlationId);
  next();
};
