import { Request, Response } from 'express';
import { HealthCheckData } from '@taskflow/shared';
import { sendSuccess } from '../utils/response.js';
import { env } from '../config/env.js';

import { healthRepository } from '../repositories/health.repository.js';

const startTime = Date.now();

export const getHealth = async (_req: Request, res: Response): Promise<Response> => {
  const dbHealth = await healthRepository.pingDatabase();

  const healthData: HealthCheckData = {
    status: dbHealth.isHealthy ? 'healthy' : 'degraded',
    service: 'taskflow-api',
    version: '0.1.0',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    database: {
      status: dbHealth.isHealthy ? 'connected' : 'disconnected',
      ...(dbHealth.latencyMs !== undefined ? { latencyMs: dbHealth.latencyMs } : {}),
    },
  };

  return sendSuccess(res, healthData);
};
