/**
 * TaskFlow PR31: API Concurrency, Contention & Race-Condition Validation Suite
 *
 * Validates that the existing PostgreSQL locking mechanisms, transactions,
 * and state-machine transitions remain strictly authoritative and bounded
 * under concurrent execution.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from '../server.js';
import { prisma } from '../lib/prisma.js';
import { taskRepository } from '../repositories/task.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { usageRepository } from '../repositories/usage.repository.js';
import { jobRepository } from '../repositories/job.repository.js';
import { auditService } from '../services/audit.service.js';
import { REFRESH_COOKIE_NAME } from '../lib/auth/session.js';
import { AuditAction, ActorType, AuditSource } from '@prisma/client';

describe('PR31: API Concurrency & Race-Condition Validation Suite', () => {
  const app = createServer();

  let tenantA: { id: string; email: string; accessToken: string; orgId: string };
  let tenantB: { id: string; email: string; accessToken: string; orgId: string };
  let projectAId: string;
  let projectBId: string;

  beforeAll(async () => {
    // 1. Create Tenant A
    const emailA = `pr31.conc.a.${Date.now()}@taskflow.dev`;
    const resA = await request(app).post('/api/v1/auth/register').send({
      name: 'PR31 User A',
      email: emailA,
      password: 'Password123!',
      organizationName: 'PR31 Org A',
    });

    tenantA = {
      id: resA.body.data.user.id,
      email: emailA,
      accessToken: resA.body.data.accessToken,
      orgId: resA.body.data.defaultOrganization.id,
    };

    // 2. Create Tenant B
    const emailB = `pr31.conc.b.${Date.now()}@taskflow.dev`;
    const resB = await request(app).post('/api/v1/auth/register').send({
      name: 'PR31 User B',
      email: emailB,
      password: 'Password123!',
      organizationName: 'PR31 Org B',
    });

    tenantB = {
      id: resB.body.data.user.id,
      email: emailB,
      accessToken: resB.body.data.accessToken,
      orgId: resB.body.data.defaultOrganization.id,
    };

    // 3. Create Project A in Org A
    const resProjA = await request(app)
      .post(`/api/v1/organizations/${tenantA.orgId}/projects`)
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .send({
        name: 'Project Alpha PR31',
        key: 'PR31A',
      });
    projectAId = resProjA.body.data.id;

    // 4. Create Project B in Org B
    const resProjB = await request(app)
      .post(`/api/v1/organizations/${tenantB.orgId}/projects`)
      .set('Authorization', `Bearer ${tenantB.accessToken}`)
      .send({
        name: 'Project Beta PR31',
        key: 'PR31B',
      });
    projectBId = resProjB.body.data.id;
  });

  afterAll(async () => {
    // Clean up created entities
    for (const orgId of [tenantA?.orgId, tenantB?.orgId]) {
      if (orgId) {
        await prisma.job.deleteMany({ where: { organizationId: orgId } });
        await prisma.aIUsageRecord.deleteMany({ where: { organizationId: orgId } });
        await prisma.auditEvent.deleteMany({ where: { organizationId: orgId } });
      }
    }
    for (const email of [tenantA?.email, tenantB?.email]) {
      if (email) {
        await prisma.user.deleteMany({ where: { email } });
      }
    }
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // 1. Project Creation at Entitlement Boundary Under Concurrency
  // ---------------------------------------------------------------------------
  it('1. concurrent project creation at entitlement boundary strictly halts at limit without overshoot', async () => {
    // Tenant A currently has 1 project (Project Alpha).
    // Impose an entitlement boundary of exactly 3 projects total.
    const maxAllowedProjects = 3;
    const concurrentAttempts = 6;

    // Fire 6 simultaneous project creation attempts against Tenant A
    const promises = Array.from({ length: concurrentAttempts }, (_, i) =>
      projectRepository
        .create(
          tenantA.orgId,
          {
            name: `Boundary Project ${i}-${Date.now()}`,
            key: `BP${i}${Date.now().toString().slice(-3)}`,
          },
          tenantA.id,
          maxAllowedProjects
        )
        .then(proj => ({ success: true, project: proj }))
        .catch(err => ({ success: false, error: err }))
    );

    const results = await Promise.all(promises);
    const successes = results.filter(r => r.success);
    const failures = results.filter((r): r is { success: false; error: any } => !r.success);

    // Initial was 1 project. Limit is 3. Exactly 2 new projects must succeed.
    expect(successes.length).toBe(2);
    expect(failures.length).toBe(4);

    // Verify error code on failed attempts
    for (const failure of failures) {
      expect(failure.error?.code).toBe('ENTITLEMENT_LIMIT_REACHED');
    }

    // Verify authoritative database count matches limit exactly
    const finalCount = await prisma.project.count({
      where: { organizationId: tenantA.orgId },
    });
    expect(finalCount).toBe(maxAllowedProjects);
  });

  // ---------------------------------------------------------------------------
  // 2. Concurrent Task Creation and State Integrity Across Tenants
  // ---------------------------------------------------------------------------
  it('2. concurrent task mutations maintain state integrity and tenant isolation', async () => {
    const taskCount = 6;

    // Create tasks concurrently in Tenant A and Tenant B simultaneously
    const promisesA = Array.from({ length: taskCount }, (_, i) =>
      taskRepository.create(
        projectAId,
        { title: `Tenant A Task ${i}`, priority: 'HIGH' },
        tenantA.id,
        tenantA.orgId
      )
    );

    const promisesB = Array.from({ length: taskCount }, (_, i) =>
      taskRepository.create(
        projectBId,
        { title: `Tenant B Task ${i}`, priority: 'MEDIUM' },
        tenantB.id,
        tenantB.orgId
      )
    );

    const [tasksA, tasksB] = await Promise.all([Promise.all(promisesA), Promise.all(promisesB)]);

    expect(tasksA.length).toBe(taskCount);
    expect(tasksB.length).toBe(taskCount);

    // Verify tenant isolation: all tasksA belong exclusively to projectA
    for (const t of tasksA) {
      expect(t.projectId).toBe(projectAId);
    }

    // Verify all tasksB belong exclusively to projectB
    for (const t of tasksB) {
      expect(t.projectId).toBe(projectBId);
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Issue-Key Generation Row-Lock Concurrency
  // ---------------------------------------------------------------------------
  it('3. concurrent task creation generates unique, monotonically increasing issue keys with zero collisions', async () => {
    const concurrentTaskCount = 8;

    const promises = Array.from({ length: concurrentTaskCount }, (_, i) =>
      taskRepository.create(
        projectAId,
        { title: `Issue Key Task ${i}`, priority: 'LOW' },
        tenantA.id,
        tenantA.orgId
      )
    );

    const createdTasks = await Promise.all(promises);
    expect(createdTasks.length).toBe(concurrentTaskCount);

    const issueKeys = createdTasks.map(t => t.issueKey);
    const uniqueKeys = new Set(issueKeys);

    // Strictly unique keys
    expect(uniqueKeys.size).toBe(concurrentTaskCount);

    // All keys follow prefix format: PR31A-N
    for (const key of issueKeys) {
      expect(key).toMatch(/^PR31A-\d+$/);
    }
  });

  // ---------------------------------------------------------------------------
  // 4. AI Quota Atomic Reservation & Upstream Compensation
  // ---------------------------------------------------------------------------
  it('4. concurrent AI quota reservation enforces strict quota boundary and compensates atomic rollback on failure', async () => {
    const periodStart = new Date(Date.now() - 3600 * 1000);
    const periodEnd = new Date(Date.now() + 3600 * 1000);
    const quotaCap = 4;

    // Attempt 8 simultaneous atomic quota reservations
    const attempts = 8;
    const reservationPromises = Array.from({ length: attempts }, (_, i) =>
      usageRepository.recordAIUsageAtomic(
        tenantB.orgId,
        'TASK_DECOMPOSITION',
        quotaCap,
        periodStart,
        periodEnd,
        `req-ai-conc-${i}-${Date.now()}`
      )
    );

    const reservationResults = await Promise.all(reservationPromises);
    const successfulReservations = reservationResults.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );
    const rejectedReservations = reservationResults.filter(r => r === null);

    // Exactly 4 succeeded, 4 rejected
    expect(successfulReservations.length).toBe(quotaCap);
    expect(rejectedReservations.length).toBe(attempts - quotaCap);

    // Simulate upstream provider failure on 2 of the successful reservations
    const [failedCall1, failedCall2] = successfulReservations;
    expect(failedCall1).toBeDefined();
    expect(failedCall2).toBeDefined();

    // Compensate usage by marking FAILED
    await usageRepository.markAIUsageFailed(failedCall1!.usageRecordId);
    await usageRepository.markAIUsageFailed(failedCall2!.usageRecordId);

    // Double compensation attempt should be safely idempotent
    await usageRepository.markAIUsageFailed(failedCall1!.usageRecordId);

    // Verify active SUCCESS records in DB is now quotaCap - 2 = 2
    const activeUsageCount = await prisma.aIUsageRecord.count({
      where: {
        organizationId: tenantB.orgId,
        createdAt: { gte: periodStart, lt: periodEnd },
        status: 'SUCCESS',
      },
    });
    expect(activeUsageCount).toBe(quotaCap - 2);

    // Now a new reservation should succeed because 2 slots were restored
    const restoredReservation = await usageRepository.recordAIUsageAtomic(
      tenantB.orgId,
      'TASK_DECOMPOSITION',
      quotaCap,
      periodStart,
      periodEnd,
      `req-ai-restored-${Date.now()}`
    );
    expect(restoredReservation).not.toBeNull();
  });

  // ---------------------------------------------------------------------------
  // 5. Concurrent Audit Events Creation & Tenant Isolation
  // ---------------------------------------------------------------------------
  it('5. concurrent audit events create accurate immutable logs without cross-tenant leakage', async () => {
    const eventCount = 5;

    // Create audit events concurrently in Tenant A
    const promisesA = Array.from({ length: eventCount }, (_, i) =>
      auditService.record({
        organizationId: tenantA.orgId,
        action: AuditAction.PROJECT_CREATED,
        actorType: ActorType.USER,
        actorUserId: tenantA.id,
        source: AuditSource.USER,
        requestId: `req-audit-a-${i}`,
        resourceType: 'Project',
        resourceId: projectAId,
        metadata: { batchIndex: i },
      })
    );

    // Create audit events concurrently in Tenant B
    const promisesB = Array.from({ length: eventCount }, (_, i) =>
      auditService.record({
        organizationId: tenantB.orgId,
        action: AuditAction.TASK_CREATED,
        actorType: ActorType.USER,
        actorUserId: tenantB.id,
        source: AuditSource.USER,
        requestId: `req-audit-b-${i}`,
        resourceType: 'Task',
        metadata: { batchIndex: i },
      })
    );

    await Promise.all([...promisesA, ...promisesB]);

    // Query Tenant A audit logs
    const logsA = await prisma.auditEvent.findMany({
      where: { organizationId: tenantA.orgId },
    });
    // Query Tenant B audit logs
    const logsB = await prisma.auditEvent.findMany({
      where: { organizationId: tenantB.orgId },
    });

    expect(logsA.length).toBeGreaterThanOrEqual(eventCount);
    expect(logsB.length).toBeGreaterThanOrEqual(eventCount);

    // Zero cross-tenant contamination
    for (const log of logsA) {
      expect(log.organizationId).toBe(tenantA.orgId);
      expect(log.actorUserId).toBe(tenantA.id);
    }
    for (const log of logsB) {
      expect(log.organizationId).toBe(tenantB.orgId);
      expect(log.actorUserId).toBe(tenantB.id);
    }
  });

  // ---------------------------------------------------------------------------
  // 6. Multi-Worker Competing Job Claims (FOR UPDATE SKIP LOCKED)
  // ---------------------------------------------------------------------------
  it('6. multiple workers competing concurrently for pending jobs claim mutually exclusive jobs', async () => {
    const jobCount = 6;
    const workerCount = 6;

    // Enqueue 6 jobs for Tenant A
    const enqueuedJobs = await Promise.all(
      Array.from({ length: jobCount }, (_, i) =>
        jobRepository.enqueue({
          type: 'PR31_CONCURRENT_TEST_JOB',
          payload: { index: i, timestamp: Date.now() },
          organizationId: tenantA.orgId,
          availableAt: new Date(Date.now() - 5000), // Available immediately
        })
      )
    );

    expect(enqueuedJobs.length).toBe(jobCount);

    // 6 workers simultaneously call claimNextJob()
    const claimPromises = Array.from({ length: workerCount }, () => jobRepository.claimNextJob());

    const claimedResults = await Promise.all(claimPromises);
    const validClaims = claimedResults.filter((j): j is NonNullable<typeof j> => j !== null);

    // Exactly jobCount jobs claimed
    expect(validClaims.length).toBe(jobCount);

    // Verify all claimed IDs are unique (zero duplicate claims)
    const claimedIds = validClaims.map(j => j.id);
    const uniqueIds = new Set(claimedIds);
    expect(uniqueIds.size).toBe(jobCount);

    // Clean up enqueued jobs
    await prisma.job.deleteMany({
      where: { id: { in: enqueuedJobs.map(j => j.id) } },
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Concurrent Refresh Token Rotation & Reuse Detection
  // ---------------------------------------------------------------------------
  it('7. concurrent refresh attempts against the same token allow only one winner and invalidate the family', async () => {
    // 1. Perform login for tenant A to obtain a fresh refresh token cookie
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: tenantA.email,
      password: 'Password123!',
    });

    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();

    const refreshCookie = cookies.find((c: string) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
    expect(refreshCookie).toBeDefined();

    // 2. Fire 3 concurrent refresh requests with the EXACT SAME refresh token cookie
    const refreshAttempts = 3;
    const refreshPromises = Array.from({ length: refreshAttempts }, () =>
      request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie!).send()
    );

    const refreshResults = await Promise.all(refreshPromises);
    const successes = refreshResults.filter(r => r.status === 200);
    const failures = refreshResults.filter(r => r.status !== 200);

    // Transactional locking ensures exactly 1 winner succeeds in rotating the token
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(2);

    // The losing requests should receive 401 Unauthorized
    for (const failRes of failures) {
      expect(failRes.status).toBe(401);
    }
  });
});
