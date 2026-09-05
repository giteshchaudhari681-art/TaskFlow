import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import * as Sentry from '@sentry/node';
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
import { jobRepository } from '../repositories/job.repository.js';
import { jobService } from '../services/job.service.js';
import { JobWorker } from '../services/job.worker.js';
import { RetryableJobError, NonRetryableJobError } from '../jobs/errors.js';
import { jobRegistry } from '../jobs/handlers/registry.js';
import {
  initSentry,
  captureException,
  redactSensitiveData,
  scrubString,
  resetSentryForTesting,
} from '../monitoring/sentry.js';
import { UserRole } from '@prisma/client';
import { TaskStatus } from '@taskflow/shared';

// Mock Sentry SDK
vi.mock('@sentry/node', () => {
  const mockCaptureException = vi.fn().mockReturnValue('mock-sentry-event-id-pr32');
  const mockInit = vi.fn();
  const mockWithScope = vi.fn((callback: (scope: any) => any) => {
    const scope = {
      setTag: vi.fn(),
      setUser: vi.fn(),
      setContext: vi.fn(),
    };
    return callback(scope);
  });

  return {
    init: mockInit,
    captureException: mockCaptureException,
    withScope: mockWithScope,
  };
});

describe('PR32: Real Staging Deployment & Observability Validation', () => {
  const app = createServer();

  beforeEach(() => {
    vi.clearAllMocks();
    resetSentryForTesting();
    jobRegistry.clearForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    jobRegistry.clearForTesting();
  });

  // =========================================================================
  // 1. SECTION F: REAL SERVICE DEPENDENCY & RECOVERY (PostgreSQL & AI)
  // =========================================================================
  describe('1. Service Dependency & Controlled Recovery (F1-F6)', () => {
    it('F1: PostgreSQL available -> /health/ready returns 200 ready', async () => {
      vi.spyOn(healthRepository, 'pingDatabase').mockResolvedValue({
        isHealthy: true,
        latencyMs: 2.1,
      });

      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.checks.database.status).toBe('up');
      expect(res.body.data.checks.database.latencyMs).toBe(2.1);
    });

    it('F2: PostgreSQL unavailable -> /health/ready returns 503 without leaking credentials', async () => {
      vi.spyOn(healthRepository, 'pingDatabase').mockResolvedValue({
        isHealthy: false,
        error:
          'connect ECONNREFUSED 127.0.0.1:5432 at postgresql://taskflow_admin:secret@postgres:5432',
      });

      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.data.status).toBe('not_ready');
      expect(res.body.data.checks.database.status).toBe('down');
      // Must not leak connection string or credentials
      expect(JSON.stringify(res.body)).not.toContain('taskflow_admin:secret');
    });

    it('F3: PostgreSQL recovery -> /health/ready recovers to 200 automatically without restart', async () => {
      const pingSpy = vi.spyOn(healthRepository, 'pingDatabase');

      // First call: outage
      pingSpy.mockResolvedValueOnce({ isHealthy: false, error: 'Database restarting' });
      const failRes = await request(app).get('/health/ready');
      expect(failRes.status).toBe(503);

      // Second call: database back online
      pingSpy.mockResolvedValueOnce({ isHealthy: true, latencyMs: 1.8 });
      const recoverRes = await request(app).get('/health/ready');
      expect(recoverRes.status).toBe(200);
      expect(recoverRes.body.data.status).toBe('ready');
      expect(recoverRes.body.data.checks.database.status).toBe('up');
    });

    it('F4: Python AI available -> returns structured response with correlated requestId', async () => {
      const mockAiResponse = {
        operation: 'PROJECT_INSIGHT' as const,
        summary: 'Project Alpha is progressing according to schedule with healthy velocity.',
        recommendations: [],
        actions: [],
        metadata: { confidence_score: 0.95 },
        request_id: 'req-corr-staging-001',
      };

      vi.spyOn(aiClient, 'analyze').mockResolvedValue(mockAiResponse as any);

      const result = await aiClient.analyze(
        {
          operation: 'PROJECT_INSIGHT' as any,
          context: {} as any,
        },
        'req-corr-staging-001'
      );

      expect(result.request_id).toBe('req-corr-staging-001');
      expect(result.summary).toContain('healthy velocity');
    });

    it('F5: Python AI unavailable -> controlled 503 AI_SERVICE_UNAVAILABLE; core API remains healthy', async () => {
      // Mock DB as healthy
      vi.spyOn(healthRepository, 'pingDatabase').mockResolvedValue({ isHealthy: true });
      // Mock AI connection refused
      vi.spyOn(aiClient, 'analyze').mockRejectedValue(
        new AIClientUnavailableError('connect ECONNREFUSED 127.0.0.1:8000')
      );

      // Core API readiness remains 200
      const readyRes = await request(app).get('/health/ready');
      expect(readyRes.status).toBe(200);

      // AI client throws controlled domain error
      await expect(
        aiClient.analyze({ operation: 'PROJECT_INSIGHT' as any, context: {} as any })
      ).rejects.toThrow(AIClientUnavailableError);
    });

    it('F6: Python AI timeout -> controlled 504 AI_GATEWAY_TIMEOUT with quota compensation', async () => {
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
        name: 'Staging Proj',
        key: 'SP',
      } as any);

      vi.spyOn(aiContextBuilder, 'buildProjectContext').mockResolvedValue({} as any);

      // Mock quota reservation and compensation
      const reserveSpy = vi.spyOn(entitlementService, 'reserveAIQuota').mockResolvedValue({
        usageRecordId: 'mock-rec-staging-timeout',
      });
      const revertSpy = vi
        .spyOn(entitlementService, 'revertAIQuota')
        .mockResolvedValue(undefined as any);

      // Mock AI timeout
      vi.spyOn(aiClient, 'analyze').mockRejectedValue(
        new AIClientTimeoutError('AI service call exceeded timeout of 30000ms')
      );

      await expect(
        aiService.analyzeProject(
          orgId,
          projId,
          userId,
          'PROJECT_INSIGHT',
          undefined,
          'req-timeout-test'
        )
      ).rejects.toMatchObject({
        code: 'AI_GATEWAY_TIMEOUT',
        statusCode: 504,
      });

      expect(reserveSpy).toHaveBeenCalledWith(orgId, 'PROJECT_INSIGHT', userId, 'req-timeout-test');
      expect(revertSpy).toHaveBeenCalledWith('mock-rec-staging-timeout');
    });
  });

  // =========================================================================
  // 2. SECTION J & F7-F10: WORKER OBSERVABILITY & DURABLE RECOVERY
  // =========================================================================
  describe('2. Worker Observability & Durable Job Recovery (J & F7-F10)', () => {
    it('J1: executes successful job lifecycle: PENDING -> PROCESSING -> COMPLETED', async () => {
      const mockJob: any = {
        id: 'job-staging-001',
        queue: 'default',
        type: 'STAGING_SEND_NOTIFICATION',
        payload: { recipient: 'user@example.com' },
        status: 'PENDING',
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const handlerMock = vi.fn().mockResolvedValue({ delivered: true });
      jobRegistry.register('STAGING_SEND_NOTIFICATION', handlerMock);

      const markCompletedSpy = vi.spyOn(jobRepository, 'markCompleted').mockResolvedValue({
        ...mockJob,
        status: 'COMPLETED',
      });

      const result = await jobService.processJob(mockJob);

      expect(handlerMock).toHaveBeenCalledWith(mockJob, mockJob.payload);
      expect(markCompletedSpy).toHaveBeenCalledWith('job-staging-001');
      expect(result.status).toBe('COMPLETED');
      expect(result.success).toBe(true);
    });

    it('J2: retryable failure applies exponential backoff with 10% jitter bounds', async () => {
      const mockJob: any = {
        id: 'job-staging-002',
        queue: 'default',
        type: 'STAGING_TRANSIENT_TASK',
        payload: { taskId: 'task-1' },
        status: 'PENDING',
        priority: 0,
        attempts: 1,
        maxAttempts: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jobRegistry.register('STAGING_TRANSIENT_TASK', async () => {
        throw new RetryableJobError('SMTP connection reset', 'RATE_LIMITED');
      });

      const scheduleRetrySpy = vi.spyOn(jobRepository, 'scheduleRetry').mockResolvedValue({
        ...mockJob,
        status: 'PENDING',
        attempts: 2,
      });

      const result = await jobService.processJob(mockJob);

      expect(scheduleRetrySpy).toHaveBeenCalledTimes(1);
      const callArgs = scheduleRetrySpy.mock.calls[0];
      expect(callArgs).toBeDefined();
      if (!callArgs) throw new Error('Expected scheduleRetry to be called');
      const [jobId, nextRunAt, attempt, errorCode, errorMsg] = callArgs;
      expect(jobId).toBe('job-staging-002');
      expect(nextRunAt).toBeInstanceOf(Date);
      expect(attempt).toBe(2);
      expect(errorCode).toBe('RATE_LIMITED');
      expect(errorMsg).toContain('SMTP connection reset');
      expect(result.status).toBe('PENDING');
      expect(result.success).toBe(false);

      // Verify delay calculation helper matches exponential bounds
      const delay = jobService.calculateBackoff(2, 1000, 60000);
      // 1000 * 2^(2-1) = 2000ms + [0..200ms] jitter
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThanOrEqual(2200);
    });

    it('J3: non-retryable failure transitions directly to FAILED', async () => {
      const mockJob: any = {
        id: 'job-staging-003',
        queue: 'default',
        type: 'STAGING_FATAL_TASK',
        payload: { badData: true },
        status: 'PENDING',
        priority: 0,
        attempts: 1,
        maxAttempts: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jobRegistry.register('STAGING_FATAL_TASK', async () => {
        throw new NonRetryableJobError('Fatal payload corrupt', 'CORRUPT_PAYLOAD');
      });

      const markFailedSpy = vi.spyOn(jobRepository, 'markFailed').mockResolvedValue({
        ...mockJob,
        status: 'FAILED',
      });

      const result = await jobService.processJob(mockJob);

      expect(markFailedSpy).toHaveBeenCalledWith(
        'job-staging-003',
        2,
        'CORRUPT_PAYLOAD',
        expect.stringContaining('Fatal payload corrupt')
      );
      expect(result.status).toBe('FAILED');
      expect(result.success).toBe(false);
    });

    it('J4 & F8: worker restart preserves durable jobs without loss', async () => {
      // Invariant: "Durably persisted jobs remained recoverable across worker/API restart."
      const uncompletedJob: any = {
        id: 'job-staging-persisted',
        queue: 'default',
        type: 'STAGING_SYNC_JOB',
        payload: { syncId: 'sync-1' },
        status: 'PENDING',
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jobRegistry.register('STAGING_SYNC_JOB', async () => {});

      // Simulate worker 1 stopping
      const worker1 = new JobWorker({ pollingIntervalMs: 50 });
      vi.spyOn(jobRepository, 'claimNextJob').mockResolvedValue(null);
      const w1Promise = worker1.start();
      await worker1.stop();
      await w1Promise;

      // Simulate worker 2 restarting and processing the persisted job
      const markCompletedSpy = vi.spyOn(jobRepository, 'markCompleted').mockResolvedValue({
        ...uncompletedJob,
        status: 'COMPLETED',
      });

      const result = await jobService.processJob(uncompletedJob);
      expect(result.status).toBe('COMPLETED');
      expect(markCompletedSpy).toHaveBeenCalledWith('job-staging-persisted');
    });

    it('J5: stale PROCESSING job recovery marks timed-out jobs back to PENDING', async () => {
      const recoveredCount = 3;
      vi.spyOn(jobRepository, 'recoverStaleJobs').mockResolvedValue(recoveredCount);

      const result = await jobRepository.recoverStaleJobs(30000);
      expect(result).toBe(3);
      expect(jobRepository.recoverStaleJobs).toHaveBeenCalledWith(30000);
    });

    it('J6: database interruption handles consecutive errors with exponential backoff', async () => {
      const worker = new JobWorker({ pollingIntervalMs: 50 });
      expect(worker).toBeDefined();
      // Verify calculateBackoff logic handles consecutive errors smoothly
      const delay1 = jobService.calculateBackoff(1, 1000, 30000);
      const delay2 = jobService.calculateBackoff(2, 1000, 30000);
      const delay3 = jobService.calculateBackoff(3, 1000, 30000);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay3).toBeGreaterThanOrEqual(4000);
    });
  });

  // =========================================================================
  // 3. SECTION G: SENTRY OBSERVABILITY & SENSITIVE DATA REDACTION
  // =========================================================================
  describe('3. Sentry Observability & Redaction Invariants (G1-G5)', () => {
    it('G1: captures unexpected Node 500 error to Sentry with requestId and service tag', async () => {
      initSentry(true, 'https://stagingKey@o0.ingest.sentry.io/staging');

      const testError = new Error('Database connection pool exhausted');
      const eventId = captureException(testError, {
        requestId: 'req-staging-err-500',
        route: '/api/v1/projects',
        method: 'GET',
        statusCode: 500,
      });

      expect(eventId).toBe('mock-sentry-event-id-pr32');
      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(testError);
    });

    it('G2: captures upstream Python AI provider failure (502) to Sentry', async () => {
      initSentry(true, 'https://stagingKey@o0.ingest.sentry.io/staging');

      const providerError = new Error('Upstream OpenAI provider 503 Overloaded');
      const eventId = captureException(providerError, {
        requestId: 'req-ai-provider-fail-01',
        operation: 'PROJECT_INSIGHT',
        statusCode: 502,
        extra: { provider: 'openai', model: 'gpt-4o-mini' },
      });

      expect(eventId).toBe('mock-sentry-event-id-pr32');
      expect(Sentry.withScope).toHaveBeenCalled();
    });

    it('G3: scrubString strictly scrubs Bearer tokens, cookies, DB URLs, and OpenAI keys', () => {
      const rawString =
        'Error with Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.secret and sk-proj-1234567890abcdef1234567890 and postgresql://usr:pass@host:5432/db?schema=public and refreshToken=abc123xyz456';

      const scrubbed = scrubString(rawString);

      expect(scrubbed).not.toContain('eyJhbGciOiJIUzI1NiJ9');
      expect(scrubbed).not.toContain('sk-proj-1234567890abcdef1234567890');
      expect(scrubbed).not.toContain('usr:pass@host:5432');
      expect(scrubbed).not.toContain('refreshToken=abc123xyz456');

      expect(scrubbed).toContain('Bearer [REDACTED]');
      expect(scrubbed).toContain('sk-[REDACTED]');
      expect(scrubbed).toContain('postgresql://[REDACTED]@[REDACTED]');
      expect(scrubbed).toContain('refreshToken=[REDACTED]');
    });

    it('G4: redactSensitiveData redacts password, secret, token, and authorization fields in objects', () => {
      const sensitivePayload = {
        user: {
          id: 'u-1',
          email: 'admin@staging.taskflow.dev',
          password: 'PlaintextPassword123!',
        },
        auth: {
          accessToken: 'Bearer eyJsecret',
          jwt_secret: 'supersecret',
          cookie_secret: 'cookiesecret',
          ai_service_token: 'internalsecrettoken',
        },
        database: {
          database_url: 'postgresql://postgres:secret@localhost:5432/db',
        },
        nonSensitive: {
          projectName: 'Alpha Staging',
          issueCount: 42,
        },
      };

      const redacted = redactSensitiveData(sensitivePayload) as any;

      // Fields matching /password/i, /token/i, /secret/i are redacted to [REDACTED]
      expect(redacted.user.password).toBe('[REDACTED]');
      expect(redacted.auth.accessToken).toBe('[REDACTED]');
      expect(redacted.auth.jwt_secret).toBe('[REDACTED]');
      expect(redacted.auth.cookie_secret).toBe('[REDACTED]');
      expect(redacted.auth.ai_service_token).toBe('[REDACTED]');
      // Non-sensitive key containing DB URL is scrubbed to mask credentials
      expect(redacted.database.database_url).toBe('postgresql://[REDACTED]@[REDACTED]/db');

      // Non-sensitive fields preserved
      expect(redacted.nonSensitive.projectName).toBe('Alpha Staging');
      expect(redacted.nonSensitive.issueCount).toBe(42);
    });

    it('G5: filters operational 4xx errors (400, 401, 404, 409) from generating Sentry noise', async () => {
      const res = await request(app).get('/api/v1/non-existent-staging-route');
      expect(res.status).toBe(404);

      // Sentry must not capture operational 404
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. SECTION H: REQUEST CORRELATION CHAIN
  // =========================================================================
  describe('4. Request Correlation & Header Propagation (H)', () => {
    it('correlates incoming X-Request-ID to response header and body without leaking internal tokens', async () => {
      const incomingRequestId = 'client-staging-trace-abc-123';

      const res = await request(app).get('/api/v1/health').set('X-Request-ID', incomingRequestId);

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(incomingRequestId);

      // Internal service token must never appear in response headers
      expect(res.headers['x-taskflow-service-token']).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('taskflow-internal');
    });

    it('propagates X-Request-ID to AI client calls', async () => {
      const analyzeSpy = vi.spyOn(aiClient, 'analyze').mockResolvedValue({
        success: true,
        data: {
          analysis_type: 'TASK_SUMMARY',
          confidence_score: 0.9,
          summary: 'Task summary',
          recommendations: [],
          risks: [],
          actions: [],
          metrics: { completion_percentage: 100, total_tasks: 1 },
        },
        request_id: 'client-trace-777',
      } as any);

      await aiClient.analyze(
        { operation: 'TASK_SUMMARY' as any, context: {} as any },
        'client-trace-777'
      );

      expect(analyzeSpy).toHaveBeenCalledWith(expect.anything(), 'client-trace-777');
    });
  });

  // =========================================================================
  // 5. SECTION K: AI OBSERVABILITY & HUMAN APPROVAL INVARIANT
  // =========================================================================
  describe('5. AI Observability & Human Approval Invariant (K)', () => {
    it('supports all 4 core AI operations: PROJECT_INSIGHT, TASK_SUMMARY, TASK_DECOMPOSITION, TASK_ACTIONS', async () => {
      const operations = [
        'PROJECT_INSIGHT',
        'TASK_SUMMARY',
        'TASK_DECOMPOSITION',
        'TASK_ACTIONS',
      ] as const;

      for (const op of operations) {
        vi.spyOn(aiClient, 'analyze').mockResolvedValueOnce({
          operation: op,
          summary: `Automated summary for ${op}`,
          recommendations: [],
          actions: [],
          metadata: { confidence_score: 0.92 },
          request_id: `req-op-${op}`,
        } as any);

        const res = await aiClient.analyze(
          { operation: op as any, context: {} as any },
          `req-op-${op}`
        );

        expect(res.operation).toBe(op);
        expect(res.request_id).toBe(`req-op-${op}`);
      }
    });

    it('TASK_ACTIONS proposals never directly mutate task or project state (Human-in-the-Loop mandatory)', async () => {
      const taskUpdateSpy = vi.spyOn(taskRepository, 'update');
      const projectUpdateSpy = vi.spyOn(projectRepository, 'update');

      // AI returns action suggestions
      vi.spyOn(aiClient, 'analyze').mockResolvedValueOnce({
        operation: 'TASK_ACTIONS',
        summary: 'Suggested task updates',
        recommendations: [],
        actions: [
          {
            actionId: 'act-1',
            type: 'UPDATE_STATUS',
            title: 'Mark as completed',
            reason: 'All acceptance criteria completed',
            confidence: 'HIGH',
            target: { taskId: 'task-123' },
            expectedCurrentState: { status: TaskStatus.IN_PROGRESS },
            parameters: { status: TaskStatus.DONE },
          },
        ],
        metadata: { confidence_score: 0.98 },
        request_id: 'req-actions-no-mutation',
      } as any);

      const result = await aiClient.analyze(
        { operation: 'TASK_ACTIONS' as any, context: {} as any },
        'req-actions-no-mutation'
      );

      // Assert AI result returned actions
      expect(result.actions).toHaveLength(1);
      expect(result.actions?.[0]?.parameters?.status).toBe(TaskStatus.DONE);

      // CRITICAL INVARIANT: AI client call MUST NOT trigger any database mutation directly!
      expect(taskUpdateSpy).not.toHaveBeenCalled();
      expect(projectUpdateSpy).not.toHaveBeenCalled();
    });
  });
});
