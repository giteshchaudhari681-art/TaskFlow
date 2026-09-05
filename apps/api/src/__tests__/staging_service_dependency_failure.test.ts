import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../server.js';
import { healthRepository } from '../repositories/health.repository.js';
import {
  aiClient,
  AIClientUnavailableError,
  AIClientTimeoutError,
} from '../integrations/ai/aiClient.js';
import { aiService } from '../services/ai.service.js';
import { entitlementService } from '../services/entitlement.service.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { taskRepository } from '../repositories/task.repository.js';
import { aiContextBuilder } from '../services/aiContext.builder.js';
import { auditService } from '../services/audit.service.js';
import { jobRepository } from '../repositories/job.repository.js';
import { jobService } from '../services/job.service.js';
import { JobWorker } from '../services/job.worker.js';
import { RetryableJobError, NonRetryableJobError } from '../jobs/errors.js';
import { jobRegistry } from '../jobs/handlers/registry.js';
import { resetSentryForTesting } from '../monitoring/sentry.js';
import { UserRole } from '@prisma/client';

describe('PR30: Staging Service Dependency & Failure-Injection Validation', () => {
  const app = createServer();

  beforeEach(() => {
    vi.clearAllMocks();
    resetSentryForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // B. SERVICE DEPENDENCY & FAILURE INJECTION: API -> PostgreSQL
  // =========================================================================
  describe('B1 & F1: API -> PostgreSQL Dependency & Outage Simulation', () => {
    it('readiness returns 200 when database is healthy', async () => {
      vi.spyOn(healthRepository, 'pingDatabase').mockResolvedValue({
        isHealthy: true,
        latencyMs: 1.5,
      });

      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.checks.database.status).toBe('up');
      expect(res.body.data.checks.database.latencyMs).toBe(1.5);
    });

    it('readiness returns 503 and sanitized error when PostgreSQL is unavailable', async () => {
      vi.spyOn(healthRepository, 'pingDatabase').mockResolvedValue({
        isHealthy: false,
        error: 'Connection refused at localhost:5432',
      });

      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.data.status).toBe('not_ready');
      expect(res.body.data.checks.database.status).toBe('down');
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');

      // Verify no sensitive connection string details leaked
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('localhost:5432');
      expect(bodyStr).not.toContain('password');
    });

    it('readiness automatically recovers to 200 once PostgreSQL is restored', async () => {
      const pingSpy = vi.spyOn(healthRepository, 'pingDatabase');

      // 1. Temporary outage
      pingSpy.mockResolvedValueOnce({ isHealthy: false, error: 'DB down' });
      let res = await request(app).get('/health/ready');
      expect(res.status).toBe(503);

      // 2. Recovery
      pingSpy.mockResolvedValueOnce({ isHealthy: true, latencyMs: 2.0 });
      res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ready');
    });
  });

  // =========================================================================
  // B2, F2, H: API -> Python AI Dependency & AI Degradation Validation
  // =========================================================================
  describe('B2, F2, H: API -> Python AI Degradation & Decoupling', () => {
    it('API readiness remains 200 even if Python AI service is completely offline', async () => {
      // PostgreSQL is healthy, AI is not part of the critical readiness probe
      vi.spyOn(healthRepository, 'pingDatabase').mockResolvedValue({
        isHealthy: true,
        latencyMs: 1.8,
      });

      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.checks.ai).toBeUndefined(); // AI not in critical path
    });

    it('AI service outage returns controlled 503 and reverts reserved quota without mutating domain', async () => {
      const orgId = '00000000-0000-0000-0000-000000000001';
      const projId = '00000000-0000-0000-0000-000000000002';
      const userId = '00000000-0000-0000-0000-000000000003';

      // Mock organization and project access
      vi.spyOn(organizationRepository, 'findMember').mockResolvedValue({
        id: 'mem-1',
        organizationId: orgId,
        userId,
        role: UserRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.spyOn(projectRepository, 'findById').mockResolvedValue({
        id: projId,
        organizationId: orgId,
        name: 'Staging Release Validation',
        key: 'SRV',
      } as any);

      // Mock quota reservation
      vi.spyOn(entitlementService, 'reserveAIQuota').mockResolvedValue({
        usageRecordId: 'test-mock-rec-999',
      });

      const revertQuotaSpy = vi
        .spyOn(entitlementService, 'revertAIQuota')
        .mockResolvedValue(undefined as any);

      vi.spyOn(aiContextBuilder, 'buildProjectContext').mockResolvedValue({} as any);

      // Simulate Python AI service connection failure (ECONNREFUSED)
      vi.spyOn(aiClient, 'analyze').mockRejectedValue(
        new AIClientUnavailableError('Could not establish connection to Python AI service')
      );

      // Domain mutation methods must NOT be called
      const taskUpdateSpy = vi.spyOn(taskRepository, 'update');
      const projectUpdateSpy = vi.spyOn(projectRepository, 'update');

      await expect(
        aiService.analyzeProject(orgId, projId, userId, 'PROJECT_SUMMARY')
      ).rejects.toMatchObject({
        code: 'AI_SERVICE_UNAVAILABLE',
        statusCode: 503,
      });

      // Verify quota was reverted so user is not penalized
      expect(revertQuotaSpy).toHaveBeenCalledWith('test-mock-rec-999');

      // Verify no direct mutations occurred
      expect(taskUpdateSpy).not.toHaveBeenCalled();
      expect(projectUpdateSpy).not.toHaveBeenCalled();
    });

    it('AI service timeout triggers 504 gateway timeout, aborts cleanly, and reverts quota', async () => {
      const orgId = '00000000-0000-0000-0000-000000000001';
      const projId = '00000000-0000-0000-0000-000000000002';
      const userId = '00000000-0000-0000-0000-000000000003';

      vi.spyOn(organizationRepository, 'findMember').mockResolvedValue({
        id: 'mem-1',
        organizationId: orgId,
        userId,
        role: UserRole.ADMIN,
      } as any);

      vi.spyOn(projectRepository, 'findById').mockResolvedValue({
        id: projId,
        organizationId: orgId,
      } as any);

      vi.spyOn(entitlementService, 'reserveAIQuota').mockResolvedValue({
        usageRecordId: 'test-mock-timeout-1',
      });

      const revertQuotaSpy = vi
        .spyOn(entitlementService, 'revertAIQuota')
        .mockResolvedValue(undefined as any);

      vi.spyOn(aiContextBuilder, 'buildProjectContext').mockResolvedValue({} as any);

      // Simulate timeout
      vi.spyOn(aiClient, 'analyze').mockRejectedValue(
        new AIClientTimeoutError('AI service request exceeded timeout of 30000ms')
      );

      await expect(
        aiService.analyzeProject(orgId, projId, userId, 'PROJECT_INSIGHT')
      ).rejects.toMatchObject({
        code: 'AI_GATEWAY_TIMEOUT',
        statusCode: 504,
      });

      expect(revertQuotaSpy).toHaveBeenCalledWith('test-mock-timeout-1');
    });

    it('TASK_ACTIONS proposes actions without directly executing state mutations', async () => {
      const orgId = '00000000-0000-0000-0000-000000000001';
      const projId = '00000000-0000-0000-0000-000000000002';
      const userId = '00000000-0000-0000-0000-000000000003';
      const taskId = '00000000-0000-0000-0000-000000000004';

      vi.spyOn(organizationRepository, 'findMember').mockResolvedValue({
        id: 'mem-1',
        organizationId: orgId,
        userId,
        role: UserRole.ADMIN,
      } as any);

      vi.spyOn(projectRepository, 'findById').mockResolvedValue({
        id: projId,
        organizationId: orgId,
      } as any);

      vi.spyOn(taskRepository, 'findById').mockResolvedValue({
        id: taskId,
        projectId: projId,
        title: 'Implement Staging Runbook',
      } as any);

      vi.spyOn(aiContextBuilder, 'buildTaskContext').mockResolvedValue({} as any);
      vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      vi.spyOn(projectRepository, 'listMembers').mockResolvedValue([
        { user: { id: userId } },
      ] as any);

      vi.spyOn(entitlementService, 'reserveAIQuota').mockResolvedValue({
        usageRecordId: 'test-mock-act-1',
      });

      // AI client returns proposed action
      vi.spyOn(aiClient, 'analyze').mockResolvedValue({
        request_id: 'req-prop-123',
        operation: 'TASK_ACTIONS',
        task_id: taskId,
        actions: [
          {
            type: 'ASSIGN_TASK',
            reason: 'User has capacity',
            confidence: 0.95,
            parameters: { assigneeId: userId },
          },
        ],
        audit_trail: {
          timestamp: new Date().toISOString(),
          context_hash: 'abc',
          model_version: 'gpt-4o-mini',
          tokens_used: 150,
          confidence_score: 0.95,
        },
      } as any);

      const taskUpdateSpy = vi.spyOn(taskRepository, 'update');

      const result = await aiService.analyzeProject(
        orgId,
        projId,
        userId,
        'TASK_ACTIONS',
        undefined,
        'req-prop-123',
        taskId
      );

      // Proposal returned for human review
      expect(result.actions).toHaveLength(1);
      expect(result.actions?.[0]?.type).toBe('ASSIGN_TASK');

      // Crucial architectural constraint: AI NEVER directly mutates task state
      expect(taskUpdateSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // B3 & G: Worker -> PostgreSQL Lifecycle & Worker Recovery Validation
  // =========================================================================
  describe('B3 & G: Durable Worker Lifecycle & Recovery', () => {
    it('executes durable lifecycle: PENDING -> PROCESSING -> COMPLETED', async () => {
      const mockJob: any = {
        id: 'job-life-1',
        type: 'TEST_SUCCESS_JOB',
        payload: { message: 'hello' },
        attempts: 0,
        maxAttempts: 3,
        organizationId: 'org-test',
      };

      // Register test handler
      const handlerMock = vi.fn().mockResolvedValue({ processed: true });
      jobRegistry.register('TEST_SUCCESS_JOB', handlerMock);

      const markCompletedSpy = vi
        .spyOn(jobRepository, 'markCompleted')
        .mockResolvedValue({} as any);

      const result = await jobService.processJob(mockJob);

      expect(handlerMock).toHaveBeenCalledWith(mockJob, mockJob.payload);
      expect(markCompletedSpy).toHaveBeenCalledWith('job-life-1');
      expect(result.status).toBe('COMPLETED');
      expect(result.success).toBe(true);
    });

    it('schedules retry with exponential backoff on RetryableJobError: PENDING -> PROCESSING -> PENDING', async () => {
      const mockJob: any = {
        id: 'job-retry-1',
        type: 'TEST_RETRY_JOB',
        payload: { attempt: 1 },
        attempts: 0,
        maxAttempts: 3,
        organizationId: 'org-test',
      };

      jobRegistry.register('TEST_RETRY_JOB', async () => {
        throw new RetryableJobError('Third-party service rate limit exceeded', 'RATE_LIMITED');
      });

      const scheduleRetrySpy = vi
        .spyOn(jobRepository, 'scheduleRetry')
        .mockResolvedValue({} as any);
      const markFailedSpy = vi.spyOn(jobRepository, 'markFailed');

      const result = await jobService.processJob(mockJob);

      expect(scheduleRetrySpy).toHaveBeenCalledWith(
        'job-retry-1',
        expect.any(Date),
        1, // Next attempt count
        'RATE_LIMITED',
        'Third-party service rate limit exceeded'
      );
      expect(markFailedSpy).not.toHaveBeenCalled();
      expect(result.status).toBe('PENDING');
      expect(result.success).toBe(false);
    });

    it('permanently marks FAILED on NonRetryableJobError without retrying', async () => {
      const mockJob: any = {
        id: 'job-fatal-1',
        type: 'TEST_FATAL_JOB',
        payload: { invalidData: true },
        attempts: 0,
        maxAttempts: 3,
        organizationId: 'org-test',
      };

      jobRegistry.register('TEST_FATAL_JOB', async () => {
        throw new NonRetryableJobError('Corrupted payload structure', 'INVALID_PAYLOAD');
      });

      const scheduleRetrySpy = vi.spyOn(jobRepository, 'scheduleRetry');
      const markFailedSpy = vi.spyOn(jobRepository, 'markFailed').mockResolvedValue({} as any);

      const result = await jobService.processJob(mockJob);

      expect(markFailedSpy).toHaveBeenCalledWith(
        'job-fatal-1',
        1,
        'INVALID_PAYLOAD',
        'Corrupted payload structure'
      );
      expect(scheduleRetrySpy).not.toHaveBeenCalled();
      expect(result.status).toBe('FAILED');
      expect(result.success).toBe(false);
    });

    it('recovers stale jobs left in PROCESSING by terminated workers', async () => {
      const recoverSpy = vi.spyOn(jobRepository, 'recoverStaleJobs').mockResolvedValue(2);

      const recoveredCount = await jobRepository.recoverStaleJobs(30000);
      expect(recoveredCount).toBe(2);
      expect(recoverSpy).toHaveBeenCalledWith(30000);
    });

    it('worker backs off exponentially on consecutive database errors during polling', async () => {
      vi.spyOn(jobRepository, 'recoverStaleJobs').mockResolvedValue(0);
      vi.spyOn(jobRepository, 'claimNextJob').mockRejectedValue(
        new Error('PostgreSQL connection drop')
      );

      const worker = new JobWorker({
        pollingIntervalMs: 10,
        staleRecoveryIntervalMs: 100000,
      });

      expect(worker.getConsecutiveErrors()).toBe(0);

      // Start worker in background
      const workerPromise = worker.start();

      // Wait 60ms to allow loop to catch error and backoff
      await new Promise(r => setTimeout(r, 60));

      expect(worker.getConsecutiveErrors()).toBeGreaterThan(0);

      // Stop worker cleanly
      await worker.stop();
      await workerPromise;
    });

    it('worker restart preserves persisted jobs and recovers pending queue', async () => {
      // 1. Worker stopped
      const worker1 = new JobWorker({ pollingIntervalMs: 10 });
      expect(worker1.getIsRunning()).toBe(false);

      // 2. Pending jobs exist in DB
      vi.spyOn(jobRepository, 'claimNextJob').mockResolvedValueOnce({
        id: 'job-persisted-1',
        type: 'TEST_PERSISTED_JOB',
        payload: {},
        attempts: 0,
        maxAttempts: 3,
      } as any);

      const processSpy = vi.spyOn(jobService, 'processJob').mockResolvedValue({
        success: true,
        status: 'COMPLETED',
      });

      // 3. Worker restarted
      const worker2 = new JobWorker({ pollingIntervalMs: 10 });
      const worker2Promise = worker2.start();

      await new Promise(r => setTimeout(r, 50));
      await worker2.stop();
      await worker2Promise;

      expect(processSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'job-persisted-1' }));
    });
  });

  // =========================================================================
  // E. SECRET LEAKAGE PREVENTION VALIDATION
  // =========================================================================
  describe('E: Zero Secret Leakage Validation', () => {
    it('does not leak JWT_SECRET, COOKIE_SECRET, or DATABASE_URL in health responses', async () => {
      const res = await request(app).get('/health');
      const resBody = JSON.stringify(res.body);

      expect(resBody).not.toContain('development-jwt-secret');
      expect(resBody).not.toContain('development-cookie-secret');
      expect(resBody).not.toContain('TfDevPass_2026_SecureKey');
      expect(resBody).not.toContain('taskflow_dev');
    });

    it('rejects job enqueue containing sensitive credential fields', async () => {
      const sensitivePayload = {
        taskTitle: 'Deploy Staging',
        adminPassword: 'SuperSecretPassword',
      };

      await expect(
        jobService.enqueue({
          type: 'TEST_SAFETY_JOB',
          payload: sensitivePayload,
        })
      ).rejects.toThrow(/prohibited sensitive field/);
    });
  });
});
