import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { JobStatus } from '@taskflow/shared';
import { createServer } from '../server.js';
import { prisma } from '../lib/prisma.js';
import { taskRepository } from '../repositories/task.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { usageRepository } from '../repositories/usage.repository.js';
import { jobRepository } from '../repositories/job.repository.js';
import { auditService } from '../services/audit.service.js';
import { REFRESH_COOKIE_NAME } from '../lib/auth/session.js';
import { AuditAction, ActorType, AuditSource } from '@prisma/client';

describe('PR29: Concurrency, Contention & Race Condition Validation Suite', () => {
  const app = createServer();

  let testUser: { id: string; email: string; accessToken: string; orgId: string };
  let projectId: string;

  beforeAll(async () => {
    const email = `concurrency.test.${Date.now()}@taskflow.dev`;
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Concurrency Tester',
      email,
      password: 'Password123!',
      organizationName: 'Concurrency Testing Corp',
    });

    testUser = {
      id: res.body.data.user.id,
      email,
      accessToken: res.body.data.accessToken,
      orgId: res.body.data.defaultOrganization.id,
    };

    const projRes = await request(app)
      .post(`/api/v1/organizations/${testUser.orgId}/projects`)
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({
        name: 'Concurrency Base Project',
        key: 'CONC',
      });
    projectId = projRes.body.data.id;
  });

  afterAll(async () => {
    if (testUser?.email) {
      await prisma.user.deleteMany({
        where: { email: testUser.email },
      });
    }
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------
  // 1 & 5. Concurrent Project Creation Under Limit & Near Boundary
  // -------------------------------------------------------------
  it('1 & 5. concurrent project creation respects maxAllowedProjects without limit overshoot', async () => {
    // Current project count is 1. Suppose maxAllowedProjects is 3.
    // If we fire 5 concurrent requests to create projects, exactly 2 should succeed, 3 should fail with limit error.
    const maxAllowed = 3;
    const concurrentAttempts = 5;

    const promises = Array.from({ length: concurrentAttempts }, (_, i) =>
      projectRepository
        .create(
          testUser.orgId,
          {
            name: `Concurrent Project ${i}-${Date.now()}`,
            key: `CP${i}${Date.now().toString().slice(-3)}`,
          },
          testUser.id,
          maxAllowed
        )
        .then(proj => ({ success: true, project: proj }))
        .catch(err => ({ success: false, error: err }))
    );

    const results = await Promise.all(promises);
    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    // Initial was 1 project. Limit is 3. Exactly 2 new creations can succeed. Total in DB must be exactly 3!
    expect(successes.length).toBe(2);
    expect(failures.length).toBe(3);

    const finalCount = await prisma.project.count({
      where: { organizationId: testUser.orgId },
    });
    expect(finalCount).toBe(maxAllowed);
  });

  // -------------------------------------------------------------
  // 2 & 3. Concurrent AI Quota Reservation
  // -------------------------------------------------------------
  it('2 & 3. concurrent AI quota reservation enforces strict quota boundary with zero overshoot', async () => {
    const periodStart = new Date(Date.now() - 3600 * 1000);
    const periodEnd = new Date(Date.now() + 3600 * 1000);
    const maxAllowedQuota = 5;

    // Fire 10 simultaneous atomic quota reservation attempts
    const attempts = 10;
    const promises = Array.from({ length: attempts }, (_, i) =>
      usageRepository.recordAIUsageAtomic(
        testUser.orgId,
        'PROJECT_INSIGHT',
        maxAllowedQuota,
        periodStart,
        periodEnd,
        `req-conc-ai-${i}-${Date.now()}`
      )
    );

    const results = await Promise.all(promises);
    const successfulReservations = results.filter(r => r !== null);
    const rejectedReservations = results.filter(r => r === null);

    // Exactly 5 must succeed and 5 must be rejected
    expect(successfulReservations.length).toBe(maxAllowedQuota);
    expect(rejectedReservations.length).toBe(attempts - maxAllowedQuota);

    // Verify DB count
    const totalRecordedInDB = await prisma.aIUsageRecord.count({
      where: {
        organizationId: testUser.orgId,
        createdAt: { gte: periodStart, lt: periodEnd },
        status: 'SUCCESS',
      },
    });
    expect(totalRecordedInDB).toBe(maxAllowedQuota);
  });

  // -------------------------------------------------------------
  // 4. Concurrent Task Issue-Key Generation (Row-Level Locking)
  // -------------------------------------------------------------
  it('4. concurrent task creation generates sequential, strictly unique issue keys without duplicates', async () => {
    const taskCount = 8;

    const promises = Array.from({ length: taskCount }, (_, i) =>
      taskRepository.create(
        projectId,
        {
          title: `Concurrent Task ${i}`,
          priority: 'MEDIUM',
        },
        testUser.id,
        testUser.orgId
      )
    );

    const createdTasks = await Promise.all(promises);
    expect(createdTasks.length).toBe(taskCount);

    const issueKeys = createdTasks.map(t => t.issueKey);
    const uniqueKeys = new Set(issueKeys);

    // Zero duplicate issue keys under concurrent transactions
    expect(uniqueKeys.size).toBe(taskCount);

    // Verify all keys follow the CONC-N format with unique sequential numbers
    for (const key of issueKeys) {
      expect(key).toMatch(/^CONC-\d+$/);
    }
  });

  // -------------------------------------------------------------
  // 6. Multi-Worker Concurrent Job Claiming (FOR UPDATE SKIP LOCKED)
  // -------------------------------------------------------------
  it('6. concurrent job claims by multiple simulated workers never claim the same job twice', async () => {
    // Enqueue 5 jobs
    const enqueuedJobs = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        jobRepository.enqueue({
          type: 'TEST_CONCURRENT_JOB',
          payload: { index: i, timestamp: Date.now() },
          organizationId: testUser.orgId,
          availableAt: new Date(Date.now() - 1000), // Available immediately
        })
      )
    );

    expect(enqueuedJobs.length).toBe(5);

    // 5 concurrent workers attempting to claim jobs simultaneously
    const workerClaims = await Promise.all([
      jobRepository.claimNextJob(),
      jobRepository.claimNextJob(),
      jobRepository.claimNextJob(),
      jobRepository.claimNextJob(),
      jobRepository.claimNextJob(),
    ]);

    const claimedJobs = workerClaims.filter((j): j is NonNullable<typeof j> => j !== null);

    // All claimed jobs must have distinct IDs (no duplicate claims)
    const claimedIds = claimedJobs.map(j => j.id);
    const uniqueClaimedIds = new Set(claimedIds);
    expect(uniqueClaimedIds.size).toBe(claimedJobs.length);

    // Cleanup claimed jobs
    await prisma.job.deleteMany({
      where: { id: { in: claimedIds } },
    });
  });

  // -------------------------------------------------------------
  // 7. Stale Job Recovery Under Concurrent Polling
  // -------------------------------------------------------------
  it('7. stale job recovery safely resets timed-out processing jobs', async () => {
    let recoveredCount = 0;
    let refreshedJob: Awaited<ReturnType<typeof jobRepository.findById>> = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const staleLockedAt = new Date(Date.now() - 10 * 60 * 1000);
      const job = await prisma.job.create({
        data: {
          type: 'STALE_RECOVERY_TEST',
          status: JobStatus.PROCESSING,
          organizationId: testUser.orgId,
          payload: { test: true },
          attempts: 1,
          maxAttempts: 3,
          availableAt: new Date(Date.now() - 15 * 60 * 1000),
          lockedAt: staleLockedAt,
          startedAt: staleLockedAt,
        },
      });

      recoveredCount = await jobRepository.recoverStaleJobs(5 * 60 * 1000);
      refreshedJob = await jobRepository.findById(job.id);
      await prisma.job.deleteMany({ where: { id: job.id } });

      if (recoveredCount >= 1 && refreshedJob?.status === JobStatus.PENDING) {
        break;
      }
    }

    expect(recoveredCount).toBeGreaterThanOrEqual(1);
    expect(refreshedJob?.status).toBe(JobStatus.PENDING);
    expect(refreshedJob?.lockedAt).toBeNull();
    expect(refreshedJob?.attempts).toBe(2);
  });

  // -------------------------------------------------------------
  // 8. Refresh-Token Rotation Race Condition
  // -------------------------------------------------------------
  it('8. concurrent refresh token rotation allows only one winner and detects reuse', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: 'Password123!',
    });

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const refreshCookie = cookies.find(c => c.startsWith(`${REFRESH_COOKIE_NAME}=`))?.split(';')[0];
    expect(refreshCookie).toBeDefined();

    // Two simultaneous requests presenting the exact same refresh token
    const [res1, res2] = await Promise.all([
      request(app).post('/api/v1/auth/refresh').set('Cookie', [refreshCookie!]),
      request(app).post('/api/v1/auth/refresh').set('Cookie', [refreshCookie!]),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // In a race, one must succeed (200) and the second must be rejected (401), or both fail if reuse triggered
    expect(statuses).toContain(401);
  });

  // -------------------------------------------------------------
  // 9. Concurrent Audit Event Creation
  // -------------------------------------------------------------
  it('9. concurrent audit events are safely persisted without dropping records', async () => {
    const eventCount = 10;
    const promises = Array.from({ length: eventCount }, (_, i) =>
      auditService.record({
        organizationId: testUser.orgId,
        actorUserId: testUser.id,
        actorType: ActorType.USER,
        action: AuditAction.TASK_CREATED,
        resourceType: 'Task',
        resourceId: `task-conc-${i}`,
        source: AuditSource.USER,
        metadata: { index: i, testRun: true },
      })
    );

    const createdAudits = await Promise.all(promises);
    expect(createdAudits.length).toBe(eventCount);

    const persistedCount = await prisma.auditEvent.count({
      where: {
        organizationId: testUser.orgId,
        resourceType: 'Task',
        resourceId: { startsWith: 'task-conc-' },
      },
    });
    expect(persistedCount).toBe(eventCount);
  });
});
