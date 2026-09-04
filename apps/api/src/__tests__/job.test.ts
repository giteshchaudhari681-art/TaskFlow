import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { NotificationType } from '@prisma/client';
import { JobStatus, UserRole } from '@taskflow/shared';
import { createServer } from '../server.js';
import { prisma } from '../lib/prisma.js';
import { jobRepository } from '../repositories/job.repository.js';
import { jobService } from '../services/job.service.js';
import { JobWorker } from '../services/job.worker.js';
import { jobRegistry } from '../jobs/handlers/registry.js';
import { RetryableJobError, NonRetryableJobError } from '../jobs/errors.js';
import { notificationRepository } from '../repositories/notification.repository.js';

const app = createServer();

describe('TaskFlow PR 26: Production Resilience & Background Jobs Suite', () => {
  const timestamp = `${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  const ownerEmail = `job-owner.${timestamp}@taskflow.dev`;
  const adminEmail = `job-admin.${timestamp}@taskflow.dev`;
  const memberEmail = `job-member.${timestamp}@taskflow.dev`;
  const foreignEmail = `job-foreign.${timestamp}@taskflow.dev`;
  const password = 'Password123!';

  let ownerToken: string;
  let ownerUserId: string;
  let ownerOrgId: string;

  let adminToken: string;
  let adminUserId: string;

  let memberToken: string;
  let memberUserId: string;

  let foreignToken: string;
  let foreignUserId: string;
  let foreignOrgId: string;

  let testProjectId: string;
  let foreignProjectId: string;

  beforeAll(async () => {
    // 1. Register Owner
    const ownerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Job Owner',
      email: ownerEmail,
      password,
      organizationName: 'Resilience Test Org',
    });
    ownerToken = ownerRes.body.data.accessToken;
    ownerUserId = ownerRes.body.data.user.id;
    ownerOrgId = ownerRes.body.data.defaultOrganization.id;

    // 2. Register Admin
    const adminRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Job Admin',
      email: adminEmail,
      password,
    });
    adminToken = adminRes.body.data.accessToken;
    adminUserId = adminRes.body.data.user.id;

    await prisma.organizationMember.create({
      data: {
        organizationId: ownerOrgId,
        userId: adminUserId,
        role: UserRole.ADMIN,
      },
    });

    // 3. Register Member
    const memberRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Job Member',
      email: memberEmail,
      password,
    });
    memberToken = memberRes.body.data.accessToken;
    memberUserId = memberRes.body.data.user.id;

    await prisma.organizationMember.create({
      data: {
        organizationId: ownerOrgId,
        userId: memberUserId,
        role: UserRole.MEMBER,
      },
    });

    // 4. Register Foreign Tenant
    const foreignRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Foreign Job User',
      email: foreignEmail,
      password,
      organizationName: 'Foreign Resilience Corp',
    });
    foreignToken = foreignRes.body.data.accessToken;
    foreignUserId = foreignRes.body.data.user.id;
    foreignOrgId = foreignRes.body.data.defaultOrganization.id;

    // Create projects
    const testProject = await prisma.project.create({
      data: {
        name: 'Resilience Project',
        key: 'RES',
        organizationId: ownerOrgId,
      },
    });
    testProjectId = testProject.id;

    const foreignProject = await prisma.project.create({
      data: {
        name: 'Foreign Project',
        key: 'FOR',
        organizationId: foreignOrgId,
      },
    });
    foreignProjectId = foreignProject.id;
  });

  afterAll(async () => {
    // Clean up created jobs
    await prisma.job.deleteMany({
      where: {
        organizationId: { in: [ownerOrgId, foreignOrgId] },
      },
    });
    // Clean up notifications
    await prisma.notification.deleteMany({
      where: {
        userId: { in: [ownerUserId, adminUserId, memberUserId, foreignUserId] },
      },
    });
    // Clean up projects
    await prisma.project.deleteMany({
      where: {
        id: { in: [testProjectId, foreignProjectId] },
      },
    });
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: { in: [ownerEmail, adminEmail, memberEmail, foreignEmail] },
      },
    });
    await prisma.organization.deleteMany({
      where: {
        id: { in: [ownerOrgId, foreignOrgId] },
      },
    });
  });

  beforeEach(async () => {
    await prisma.job.deleteMany({});
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 1. Job Repository Core Operations
  // ────────────────────────────────────────────────────────────────────────────
  describe('1. Job Repository Core Operations', () => {
    it('enqueues a job successfully with PENDING status and default attempts', async () => {
      const job = await jobRepository.enqueue({
        type: 'NOTIFICATION_DELIVERY',
        organizationId: ownerOrgId,
        payload: {
          notificationId: 'notif-1',
          recipientUserId: ownerUserId,
          deliveryMethod: 'IN_APP',
        },
        maxAttempts: 3,
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.status).toBe(JobStatus.PENDING);
      expect(job.attempts).toBe(0);
      expect(job.maxAttempts).toBe(3);
      expect(job.organizationId).toBe(ownerOrgId);
      expect(job.availableAt).toBeDefined();
    });

    it('claims the available job atomically using FOR UPDATE SKIP LOCKED', async () => {
      await jobRepository.enqueue({
        type: 'NOTIFICATION_DELIVERY',
        organizationId: ownerOrgId,
        payload: { notificationId: 'claim-test', recipientUserId: ownerUserId },
      });

      const claimed = await jobRepository.claimNextJob();
      expect(claimed).not.toBeNull();
      expect(claimed!.status).toBe(JobStatus.PROCESSING);
      expect(claimed!.lockedAt).not.toBeNull();
      expect(claimed!.startedAt).not.toBeNull();

      // Clean up claimed job
      await jobRepository.markCompleted(claimed!.id);
    });

    it('prevents concurrent claim collision on the same job (FOR UPDATE SKIP LOCKED)', async () => {
      const job = await jobRepository.enqueue({
        type: 'NOTIFICATION_DELIVERY',
        organizationId: ownerOrgId,
        payload: { singleClaim: true },
      });

      // Two concurrent claims
      const [claimA, claimB] = await Promise.all([
        jobRepository.claimNextJob(),
        jobRepository.claimNextJob(),
      ]);

      const claimedIds = [claimA?.id, claimB?.id].filter(id => id === job.id);
      expect(claimedIds.length).toBe(1);

      // Clean up
      if (claimA) await jobRepository.markCompleted(claimA.id);
      if (claimB) await jobRepository.markCompleted(claimB.id);
    });

    it('marks a job completed with completedAt timestamp', async () => {
      await jobRepository.enqueue({
        type: 'NOTIFICATION_DELIVERY',
        organizationId: ownerOrgId,
        payload: { test: 'complete' },
      });

      const claimed = await jobRepository.claimNextJob();
      expect(claimed).not.toBeNull();

      const completed = await jobRepository.markCompleted(claimed!.id);
      expect(completed.status).toBe(JobStatus.COMPLETED);
      expect(completed.completedAt).not.toBeNull();
      expect(completed.lockedAt).toBeNull();
    });

    it('schedules a retry returning status to PENDING with updated availableAt', async () => {
      const job = await jobRepository.enqueue({
        type: 'NOTIFICATION_DELIVERY',
        organizationId: ownerOrgId,
        payload: { test: 'retry' },
      });

      const futureDate = new Date(Date.now() + 5000);
      const retried = await jobRepository.scheduleRetry(
        job.id,
        futureDate,
        1,
        'TRANSIENT_NETWORK',
        'Connection reset by peer'
      );

      expect(retried.status).toBe(JobStatus.PENDING);
      expect(retried.attempts).toBe(1);
      expect(retried.availableAt.getTime()).toBe(futureDate.getTime());
      expect(retried.lastErrorCode).toBe('TRANSIENT_NETWORK');
      expect(retried.lastErrorMessage).toBe('Connection reset by peer');
      expect(retried.lockedAt).toBeNull();

      // Should not be claimable immediately because availableAt is in the future
      const immediateClaim = await jobRepository.claimNextJob();
      expect(immediateClaim?.id).not.toBe(job.id);
      if (immediateClaim) await jobRepository.markCompleted(immediateClaim.id);

      // Cleanup
      await jobRepository.markCompleted(job.id);
    });

    it('marks a job permanently FAILED with error details', async () => {
      const job = await jobRepository.enqueue({
        type: 'NOTIFICATION_DELIVERY',
        organizationId: ownerOrgId,
        payload: { test: 'fail' },
      });

      const failed = await jobRepository.markFailed(
        job.id,
        3,
        'INVALID_RESOURCE',
        'Referenced entity does not exist'
      );

      expect(failed.status).toBe(JobStatus.FAILED);
      expect(failed.attempts).toBe(3);
      expect(failed.failedAt).not.toBeNull();
      expect(failed.lastErrorCode).toBe('INVALID_RESOURCE');
      expect(failed.lastErrorMessage).toBe('Referenced entity does not exist');
      expect(failed.lockedAt).toBeNull();
    });

    it('recovers stale jobs whose lockedAt exceeds the processing timeout', async () => {
      const staleLockedAt = new Date(Date.now() - 10 * 60 * 1000);
      const staleJob = await prisma.job.create({
        data: {
          type: 'NOTIFICATION_DELIVERY',
          status: JobStatus.PROCESSING,
          organizationId: ownerOrgId,
          payload: { test: 'stale' },
          attempts: 1,
          maxAttempts: 3,
          availableAt: new Date(Date.now() - 15 * 60 * 1000),
          lockedAt: staleLockedAt,
          startedAt: staleLockedAt,
        },
      });

      const recoveredCount = await jobRepository.recoverStaleJobs(5 * 60 * 1000);
      expect(recoveredCount).toBeGreaterThanOrEqual(1);

      const refreshed = await prisma.job.findUnique({ where: { id: staleJob.id } });
      expect(refreshed!.status).toBe(JobStatus.PENDING);
      expect(refreshed!.lockedAt).toBeNull();
      expect(refreshed!.lastErrorCode).toBe('WORKER_TIMEOUT_RECOVERED');

      // Cleanup
      await jobRepository.markCompleted(staleJob.id);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 2. Transactional Enqueue
  // ────────────────────────────────────────────────────────────────────────────
  describe('2. Transactional Enqueue', () => {
    it('commits job creation along with domain mutation inside an interactive transaction', async () => {
      let createdJobId: string | undefined;

      await prisma.$transaction(async tx => {
        const job = await jobRepository.enqueue(
          {
            type: 'NOTIFICATION_DELIVERY',
            organizationId: ownerOrgId,
            payload: { transactional: true },
          },
          tx
        );
        createdJobId = job.id;
      });

      expect(createdJobId).toBeDefined();
      const persisted = await prisma.job.findUnique({ where: { id: createdJobId! } });
      expect(persisted).not.toBeNull();

      // Cleanup
      await jobRepository.markCompleted(createdJobId!);
    });

    it('rolls back job creation if the enclosing domain transaction fails', async () => {
      let attemptedJobId: string | undefined;

      await expect(
        prisma.$transaction(async tx => {
          const job = await jobRepository.enqueue(
            {
              type: 'NOTIFICATION_DELIVERY',
              organizationId: ownerOrgId,
              payload: { rollbackTest: true },
            },
            tx
          );
          attemptedJobId = job.id;
          throw new Error('Simulated transaction rollback');
        })
      ).rejects.toThrow('Simulated transaction rollback');

      expect(attemptedJobId).toBeDefined();
      const notFound = await prisma.job.findUnique({ where: { id: attemptedJobId! } });
      expect(notFound).toBeNull();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 3. Idempotency & Deduplication
  // ────────────────────────────────────────────────────────────────────────────
  describe('3. Idempotency & Deduplication', () => {
    it('returns existing job when enqueued with duplicate idempotencyKey', async () => {
      const idempotencyKey = `idemp-${timestamp}-${Math.random()}`;

      const firstJob = await jobRepository.enqueue({
        type: 'NOTIFICATION_DELIVERY',
        organizationId: ownerOrgId,
        payload: { key: 'first' },
        idempotencyKey,
      });

      const duplicateJob = await jobRepository.enqueue({
        type: 'NOTIFICATION_DELIVERY',
        organizationId: ownerOrgId,
        payload: { key: 'second' },
        idempotencyKey,
      });

      expect(duplicateJob.id).toBe(firstJob.id);
      expect(duplicateJob.idempotencyKey).toBe(idempotencyKey);

      const count = await prisma.job.count({ where: { idempotencyKey } });
      expect(count).toBe(1);

      // Cleanup
      await jobRepository.markCompleted(firstJob.id);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 4. Retry Policy & Failure Classification
  // ────────────────────────────────────────────────────────────────────────────
  describe('4. Retry Policy & Failure Classification', () => {
    it('calculates exponential backoff within configured bounds', () => {
      const delay1 = jobService.calculateBackoffDelay(1);
      const delay2 = jobService.calculateBackoffDelay(2);
      const delay3 = jobService.calculateBackoffDelay(3);
      const delayHigh = jobService.calculateBackoffDelay(10);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(1300);

      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThanOrEqual(2500);

      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThanOrEqual(4800);

      expect(delayHigh).toBeLessThanOrEqual(300000);
    });

    it('classifies RetryableJobError and retries up to maxAttempts', async () => {
      const testJobType = 'TEST_RETRYABLE_JOB';
      let callCount = 0;

      jobRegistry.register(testJobType, async () => {
        callCount++;
        throw new RetryableJobError('Temporary upstream 503 outage', 'UPSTREAM_503');
      });

      const job = await jobRepository.enqueue({
        type: testJobType,
        organizationId: ownerOrgId,
        payload: { run: true },
        maxAttempts: 2,
      });

      // Claim & execute attempt 1
      const claimed1 = await jobRepository.claimNextJob();
      expect(claimed1?.id).toBe(job.id);
      const result1 = await jobService.processJob(claimed1!);
      expect(result1.success).toBe(false);

      const after1 = await prisma.job.findUnique({ where: { id: job.id } });
      expect(after1!.status).toBe(JobStatus.PENDING);
      expect(after1!.attempts).toBe(1);
      expect(after1!.lastErrorCode).toBe('UPSTREAM_503');

      // Make available immediately for attempt 2 test
      await prisma.job.update({
        where: { id: job.id },
        data: { availableAt: new Date(Date.now() - 1000) },
      });

      // Claim & execute attempt 2 (maxAttempts reached)
      const claimed2 = await jobRepository.claimNextJob();
      expect(claimed2?.id).toBe(job.id);
      const result2 = await jobService.processJob(claimed2!);
      expect(result2.success).toBe(false);

      const after2 = await prisma.job.findUnique({ where: { id: job.id } });
      expect(after2!.status).toBe(JobStatus.FAILED);
      expect(after2!.attempts).toBe(2);
      expect(callCount).toBe(2);

      // Cleanup
      jobRegistry.unregister(testJobType);
    });

    it('classifies NonRetryableJobError and fails immediately on attempt 1 without wasting attempts', async () => {
      const testJobType = 'TEST_NON_RETRYABLE_JOB';
      let callCount = 0;

      jobRegistry.register(testJobType, async () => {
        callCount++;
        throw new NonRetryableJobError('Invalid payload schema', 'INVALID_PAYLOAD');
      });

      const job = await jobRepository.enqueue({
        type: testJobType,
        organizationId: ownerOrgId,
        payload: { malformed: true },
        maxAttempts: 5,
      });

      const claimed = await jobRepository.claimNextJob();
      expect(claimed?.id).toBe(job.id);

      const result = await jobService.processJob(claimed!);
      expect(result.success).toBe(false);

      const failedJob = await prisma.job.findUnique({ where: { id: job.id } });
      expect(failedJob!.status).toBe(JobStatus.FAILED);
      expect(failedJob!.attempts).toBe(1);
      expect(failedJob!.lastErrorCode).toBe('INVALID_PAYLOAD');
      expect(callCount).toBe(1);

      // Cleanup
      jobRegistry.unregister(testJobType);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 5. Tenant Isolation & Resource Ownership Validation
  // ────────────────────────────────────────────────────────────────────────────
  describe('5. Tenant Isolation & Security Boundary', () => {
    it('fails immediately with NonRetryableJobError when job targets a foreign tenant resource', async () => {
      // Create a notification in foreign tenant org
      const foreignNotif = await prisma.notification.create({
        data: {
          userId: foreignUserId,
          projectId: foreignProjectId,
          title: 'Foreign Alert',
          message: 'Tenant boundary test',
          type: NotificationType.TASK_ASSIGNED,
        },
      });

      // Enqueue job claiming it belongs to ownerOrgId, but pointing to foreign notification
      const crossTenantJob = await jobRepository.enqueue({
        type: 'NOTIFICATION_DELIVERY',
        organizationId: ownerOrgId,
        payload: {
          notificationId: foreignNotif.id,
          userId: foreignUserId,
          organizationId: ownerOrgId,
        },
      });

      const claimed = await jobRepository.claimNextJob();
      expect(claimed?.id).toBe(crossTenantJob.id);

      // Execution must fail permanently because Org A cannot process Org B's notification
      const result = await jobService.processJob(claimed!);
      expect(result.success).toBe(false);

      const after = await prisma.job.findUnique({ where: { id: crossTenantJob.id } });
      expect(after!.status).toBe(JobStatus.FAILED);
      expect(after!.lastErrorCode).toBe('TENANT_ORGANIZATION_MISMATCH');

      // Cleanup
      await prisma.notification.delete({ where: { id: foreignNotif.id } });
    });

    it('rejects enqueueing payloads with sensitive credentials or tokens', async () => {
      await expect(
        jobService.enqueue({
          type: 'NOTIFICATION_DELIVERY',
          organizationId: ownerOrgId,
          payload: {
            password: 'SuperSecretPassword!',
            notificationId: 'notif-safe',
          } as any,
        })
      ).rejects.toThrow(/sensitive/i);

      await expect(
        jobService.enqueue({
          type: 'NOTIFICATION_DELIVERY',
          organizationId: ownerOrgId,
          payload: {
            apiKey: 'sk-proj-1234567890',
            notificationId: 'notif-safe',
          } as any,
        })
      ).rejects.toThrow(/sensitive/i);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 6. Notification Secondary Delivery Use Case
  // ────────────────────────────────────────────────────────────────────────────
  describe('6. Notification Secondary Delivery', () => {
    it('enqueues background delivery when notification is created, and succeeds idempotently', async () => {
      const notif = await notificationRepository.create({
        userId: ownerUserId,
        projectId: testProjectId,
        title: 'Background Delivery Test',
        message: 'Testing secondary worker fanout',
        type: NotificationType.TASK_ASSIGNED,
      });

      expect(notif.id).toBeDefined();

      const job = await prisma.job.findFirst({
        where: {
          type: 'NOTIFICATION_DELIVERY',
          payload: {
            path: ['notificationId'],
            equals: notif.id,
          },
        },
      });

      expect(job).not.toBeNull();
      expect(job!.status).toBe(JobStatus.PENDING);
      expect(job!.organizationId).toBe(ownerOrgId);

      // Claim and process it via worker logic
      const claimed = await jobRepository.claimNextJob();
      expect(claimed?.id).toBe(job!.id);

      const result = await jobService.processJob(claimed!);
      expect(result.success).toBe(true);

      const finishedJob = await prisma.job.findUnique({ where: { id: job!.id } });
      expect(finishedJob!.status).toBe(JobStatus.COMPLETED);
      expect(finishedJob!.completedAt).not.toBeNull();

      // Verify durable notification state was not mutated or destroyed
      const durableNotif = await prisma.notification.findUnique({ where: { id: notif.id } });
      expect(durableNotif).not.toBeNull();
      expect(durableNotif!.title).toBe('Background Delivery Test');

      // Cleanup
      await prisma.notification.delete({ where: { id: notif.id } });
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 7. Worker Polling & Graceful Shutdown
  // ────────────────────────────────────────────────────────────────────────────
  describe('7. Worker Polling & Graceful Shutdown', () => {
    it('JobWorker.runOnce claims and processes pending work', async () => {
      const testJobType = 'RUN_ONCE_JOB';
      let executed = false;
      jobRegistry.register(testJobType, async () => {
        executed = true;
      });

      const workerJob = await jobRepository.enqueue({
        type: testJobType,
        organizationId: ownerOrgId,
        payload: { test: true },
      });

      const worker = new JobWorker({ pollingIntervalMs: 100 });
      const didWork = await worker.runOnce();
      expect(didWork).toBe(true);
      expect(executed).toBe(true);

      // Clean up
      jobRegistry.unregister(testJobType);
      await jobRepository.markCompleted(workerJob.id);
    });

    it('stops accepting new claims during graceful shutdown', async () => {
      const worker = new JobWorker({ pollingIntervalMs: 50, shutdownGracePeriodMs: 500 });
      worker.start();
      expect(worker.isActive()).toBe(true);
      expect(worker.isAcceptingJobs()).toBe(true);

      // Stop worker
      await worker.stop();
      expect(worker.isActive()).toBe(false);
      expect(worker.isAcceptingJobs()).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 8. Operations & Admin Job Health Summary Endpoint
  // ────────────────────────────────────────────────────────────────────────────
  describe('8. Operations & Admin Job Health Summary Endpoint', () => {
    it('returns 200 with accurate operational counts for Organization OWNER', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/jobs/summary`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.organizationId).toBe(ownerOrgId);
      expect(res.body.data.counts).toHaveProperty('pending');
      expect(res.body.data.counts).toHaveProperty('processing');
      expect(res.body.data.counts).toHaveProperty('completed');
      expect(res.body.data.counts).toHaveProperty('failed');
      expect(typeof res.body.data.counts.pending).toBe('number');
      expect(typeof res.body.data.recentFailedCount).toBe('number');
    });

    it('returns 200 with accurate operational counts for Organization ADMIN', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/jobs/summary`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 403 FORBIDDEN for Organization MEMBER (RBAC enforcement)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/jobs/summary`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 403/404 for cross-tenant access attempt by Foreign User', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/jobs/summary`)
        .set('Authorization', `Bearer ${foreignToken}`);

      expect([403, 404]).toContain(res.status);
    });

    it('returns 401 UNAUTHORIZED when no token is provided', async () => {
      const res = await request(app).get(`/api/v1/organizations/${ownerOrgId}/jobs/summary`);
      expect(res.status).toBe(401);
    });
  });
});
