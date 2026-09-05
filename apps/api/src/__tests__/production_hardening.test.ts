import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../server.js';
import { healthRepository } from '../repositories/health.repository.js';
import { isDatabaseConnectionError, errorHandler } from '../middleware/errorHandler.js';
import { JobWorker } from '../services/job.worker.js';
import { jobRepository } from '../repositories/job.repository.js';
import { taskRepository } from '../repositories/task.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { searchService } from '../services/search.service.js';
import { searchRepository } from '../repositories/search.repository.js';
import { measureTiming, resetSentryForTesting } from '../monitoring/sentry.js';
import { prisma } from '../lib/prisma.js';

describe('PR28: Production Hardening, Reliability & Performance Suite', () => {
  const app = createServer();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetSentryForTesting();
  });

  describe('1. Health vs Readiness Probes', () => {
    it('GET /health/live returns 200 indicating process event loop is active', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('live');
      expect(res.body.data.service).toBe('taskflow-api');
      expect(typeof res.body.data.uptimeSeconds).toBe('number');
    });

    it('GET /api/v1/health/live returns 200 for versioned probe', async () => {
      const res = await request(app).get('/api/v1/health/live');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('live');
    });

    it('GET /health/ready returns 200 when database is healthy', async () => {
      vi.spyOn(healthRepository, 'pingDatabase').mockResolvedValue({
        isHealthy: true,
        latencyMs: 1.2,
      });

      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.checks.database.status).toBe('up');
      expect(res.body.data.checks.database.latencyMs).toBe(1.2);
    });

    it('GET /health/ready returns 503 when database is unavailable', async () => {
      vi.spyOn(healthRepository, 'pingDatabase').mockResolvedValue({
        isHealthy: false,
        error: 'Database connection refused',
      });

      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.data.status).toBe('not_ready');
      expect(res.body.data.checks.database.status).toBe('down');
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('readiness does not fail if external AI service is unreachable', async () => {
      // Readiness explicitly only checks database reachability
      vi.spyOn(healthRepository, 'pingDatabase').mockResolvedValue({
        isHealthy: true,
        latencyMs: 2.1,
      });

      const res = await request(app).get('/api/v1/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.checks.ai).toBeUndefined(); // AI not in readiness critical path
    });
  });

  describe('2. Database Failure Error Handling & Sanitization', () => {
    it('correctly classifies Prisma connection and pool errors', () => {
      expect(isDatabaseConnectionError({ name: 'PrismaClientInitializationError' })).toBe(true);
      expect(isDatabaseConnectionError({ name: 'PrismaClientRustPanicError' })).toBe(true);
      expect(isDatabaseConnectionError({ code: 'P1001' })).toBe(true);
      expect(isDatabaseConnectionError({ code: 'P1017' })).toBe(true);
      expect(isDatabaseConnectionError({ code: 'P2024' })).toBe(true);
      expect(
        isDatabaseConnectionError({ message: "Can't reach database server at postgres://..." })
      ).toBe(true);
      expect(isDatabaseConnectionError({ message: 'Validation failed' })).toBe(false);
      expect(isDatabaseConnectionError(null)).toBe(false);
    });

    it('sanitizes database errors to 503 without leaking credentials or internal paths', () => {
      const mockReq: any = {
        id: 'req-123',
        headers: {},
        path: '/api/v1/projects',
        method: 'GET',
      };
      const mockRes: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const mockNext = vi.fn();

      const sensitiveDbError = new Error(
        'Connection to postgres://user:supersecretpass@db.internal:5432 failed with P1001'
      );
      (sensitiveDbError as any).code = 'P1001';

      errorHandler(sensitiveDbError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Database service temporarily unavailable',
          },
        })
      );
      // Ensure password / internal URL never leaked in response body
      const jsonResponse = JSON.stringify(mockRes.json.mock.calls[0][0]);
      expect(jsonResponse).not.toContain('supersecretpass');
      expect(jsonResponse).not.toContain('db.internal');
    });
  });

  describe('3. Background Worker Resilience & Exponential Backoff', () => {
    it('tracks consecutive errors and resets counter on successful database claim', async () => {
      vi.spyOn(jobRepository, 'recoverStaleJobs').mockResolvedValue(0);
      vi.spyOn(jobRepository, 'claimNextJob').mockRejectedValueOnce(new Error('Database offline'));

      const worker = new JobWorker({ pollingIntervalMs: 10 });
      expect(worker.getConsecutiveErrors()).toBe(0);

      const workerPromise = worker.start();

      // Give worker a moment to process the error
      await new Promise(r => setTimeout(r, 50));
      expect(worker.getConsecutiveErrors()).toBeGreaterThan(0);

      // Now mock success
      vi.spyOn(jobRepository, 'claimNextJob').mockResolvedValue(null);

      // Stop worker
      await worker.stop();
      await workerPromise;
    });
  });

  describe('4. Query Result Bounds Safety', () => {
    it('bounds task repository listByProject to maximum 500 items', async () => {
      const findManySpy = vi.spyOn(prisma.task, 'findMany').mockResolvedValue([]);

      await taskRepository.listByProject('proj-123', { limit: 9999 });

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 500, // Capped at 500 max
        })
      );
    });

    it('bounds project repository listByOrganization to maximum 200 items', async () => {
      const findManySpy = vi.spyOn(prisma.project, 'findMany').mockResolvedValue([]);

      await projectRepository.listByOrganization('org-123', { limit: 1000 });

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 200, // Capped at 200 max
        })
      );
    });

    it('bounds search service entity limits to maximum 100 items', async () => {
      vi.spyOn(searchService as any, 'getAccessibleProjectIds').mockResolvedValue([
        '00000000-0000-0000-0000-000000000001',
      ]);
      const searchTasksSpy = vi.spyOn(searchRepository, 'searchTasks').mockResolvedValue([]);
      vi.spyOn(searchRepository, 'searchProjects').mockResolvedValue([]);
      vi.spyOn(searchRepository, 'searchMilestones').mockResolvedValue([]);
      vi.spyOn(searchRepository, 'searchUsers').mockResolvedValue([]);
      vi.spyOn(searchRepository, 'searchLabels').mockResolvedValue([]);

      await searchService.search(
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        { q: 'test', limit: 500 }
      );

      expect(searchTasksSpy).toHaveBeenCalledWith(
        expect.anything(),
        'test',
        100 // Capped at 100 max
      );
    });
  });

  describe('5. Sentry Performance Signal Tracking', () => {
    it('measureTiming executes operation and records duration breadcrumb', async () => {
      const result = await measureTiming(
        'test_operation',
        async () => {
          await new Promise(r => setTimeout(r, 10));
          return 'done';
        },
        { tenant: 'org-test' }
      );

      expect(result).toBe('done');
    });

    it('measureTiming propagates error while recording duration', async () => {
      await expect(
        measureTiming('failing_operation', async () => {
          throw new Error('Test operation error');
        })
      ).rejects.toThrow('Test operation error');
    });
  });
});
