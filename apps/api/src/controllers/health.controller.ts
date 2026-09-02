import { Request, Response } from 'express';
import { HealthCheckData } from '@taskflow/shared';
import { sendSuccess } from '../utils/response.js';
import { env } from '../config/env.js';

const startTime = Date.now();

export const getHealth = (_req: Request, res: Response): Response => {
  const healthData: HealthCheckData = {
    status: 'healthy',
    service: 'taskflow-api',
    version: '0.1.0',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
  };

  return sendSuccess(res, healthData);
};
