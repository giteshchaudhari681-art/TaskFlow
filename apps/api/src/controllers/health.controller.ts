import { Request, Response } from 'express';
import { HealthCheckData, HTTP_STATUS, ERROR_CODES } from '@taskflow/shared';
import { sendSuccess } from '../utils/response.js';
import { env } from '../config/env.js';
import { healthRepository } from '../repositories/health.repository.js';

const startTime = Date.now();

/**
 * Combined / legacy health endpoint preserving full compatibility with PR1-PR27.
 */
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

/**
 * Liveness probe: "Is the process running?"
 * Returns 200 if the Node.js event loop is operational.
 */
export const getLiveness = async (_req: Request, res: Response): Promise<Response> => {
  return sendSuccess(res, {
    status: 'live',
    service: 'taskflow-api',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Readiness probe: "Can this process serve useful traffic?"
 * Checks database reachability. Does NOT fail if external AI service is unreachable,
 * ensuring core project/task CRUD traffic remains operational.
 */
export const getReadiness = async (_req: Request, res: Response): Promise<Response> => {
  const dbHealth = await healthRepository.pingDatabase();
  const isReady = dbHealth.isHealthy;

  const data = {
    status: isReady ? 'ready' : 'not_ready',
    service: 'taskflow-api',
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: dbHealth.isHealthy ? 'up' : 'down',
        ...(dbHealth.latencyMs !== undefined ? { latencyMs: dbHealth.latencyMs } : {}),
      },
    },
  };

  if (!isReady) {
    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: false,
      data,
      error: {
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
        message: 'Required dependencies (database) are unavailable',
      },
    });
  }

  return sendSuccess(res, data, HTTP_STATUS.OK);
};
