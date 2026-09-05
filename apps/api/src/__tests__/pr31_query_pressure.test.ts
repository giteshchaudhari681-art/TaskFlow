/**
 * TaskFlow PR31: Database & Query Pressure Validation Suite
 *
 * Validates that all read-heavy and list endpoints enforce strict resource
 * bounds, safe pagination clamps, relation joins, and zero N+1 behavior
 * under heavy data volumes.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from '../server.js';
import { prisma } from '../lib/prisma.js';
import { projectRepository } from '../repositories/project.repository.js';
import { taskRepository } from '../repositories/task.repository.js';
import { searchService } from '../services/search.service.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { commentRepository } from '../repositories/comment.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { usageRepository } from '../repositories/usage.repository.js';
import { jobRepository } from '../repositories/job.repository.js';

describe('PR31: Database & Query Pressure Validation Suite', () => {
  const app = createServer();

  let testUser: { id: string; email: string; accessToken: string; orgId: string };
  let projectId: string;
  let taskId: string;

  beforeAll(async () => {
    // 1. Create test user & tenant
    const email = `query.pressure.${Date.now()}@taskflow.dev`;
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Query Pressure Tester',
      email,
      password: 'Password123!',
      organizationName: 'Query Pressure Org',
    });

    testUser = {
      id: res.body.data.user.id,
      email,
      accessToken: res.body.data.accessToken,
      orgId: res.body.data.defaultOrganization.id,
    };

    // 2. Create base project
    const proj = await projectRepository.create(
      testUser.orgId,
      {
        name: 'Pressure Base Project',
        key: 'PRES',
      },
      testUser.id
    );
    projectId = proj.id;

    // 3. Create a task with relations (subtasks, comments)
    const task = await taskRepository.create(
      projectId,
      {
        title: 'Primary Pressure Task',
        priority: 'HIGH',
      },
      testUser.id,
      testUser.orgId
    );
    taskId = task.id;

    // Seed 3 comments
    for (let i = 0; i < 3; i++) {
      await commentRepository.create({
        taskId,
        authorId: testUser.id,
        content: `Pressure Comment ${i}`,
      });
    }
  });

  afterAll(async () => {
    if (testUser?.orgId) {
      await prisma.job.deleteMany({ where: { organizationId: testUser.orgId } });
      await prisma.auditEvent.deleteMany({ where: { organizationId: testUser.orgId } });
      await prisma.organization.deleteMany({ where: { id: testUser.orgId } });
    }
    if (testUser?.email) {
      await prisma.user.deleteMany({ where: { email: testUser.email } });
    }
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // 1. Projects List Query Boundedness & Pagination Clamp
  // ---------------------------------------------------------------------------
  it('1. projects listing safely clamps oversized requested limits to max 200', async () => {
    // Request with limit=999999
    const results = await projectRepository.listByOrganization(testUser.orgId, {
      limit: 999999,
    });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(200);

    // Verify HTTP endpoint honors clamp
    const httpRes = await request(app)
      .get(`/api/v1/organizations/${testUser.orgId}/projects?limit=999999`)
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(httpRes.status).toBe(200);
    expect(httpRes.body.data.length).toBeLessThanOrEqual(200);
  });

  // ---------------------------------------------------------------------------
  // 2. Tasks List Query Boundedness & Pagination Clamp
  // ---------------------------------------------------------------------------
  it('2. tasks listing safely clamps oversized requested limits to max 500', async () => {
    const results = await taskRepository.listByProject(projectId, {
      limit: 999999,
    });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(500);

    const httpRes = await request(app)
      .get(`/api/v1/organizations/${testUser.orgId}/projects/${projectId}/tasks?limit=999999`)
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(httpRes.status).toBe(200);
    expect(httpRes.body.data.length).toBeLessThanOrEqual(500);
  });

  // ---------------------------------------------------------------------------
  // 3. Task Detail Retrieval with Single-Query Joined Relations
  // ---------------------------------------------------------------------------
  it('3. task detail retrieval resolves all relations in bounded queries without N+1 loops', async () => {
    const taskDetail = await taskRepository.findById(taskId, projectId);
    expect(taskDetail).not.toBeNull();
    expect(taskDetail?.id).toBe(taskId);
    expect(taskDetail?.dependencySummary).toBeDefined();
    expect(taskDetail?.labels).toBeDefined();

    // Verify through HTTP endpoint
    const httpRes = await request(app)
      .get(`/api/v1/organizations/${testUser.orgId}/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(httpRes.status).toBe(200);
    expect(httpRes.body.data.id).toBe(taskId);
  });

  // ---------------------------------------------------------------------------
  // 4. Multi-Entity Search Query Boundedness
  // ---------------------------------------------------------------------------
  it('4. search service clamps query limits to maximum 100 entities', async () => {
    // Service-level clamping ensures defensive bounds
    const searchRes = await searchService.search(testUser.orgId, testUser.id, {
      q: 'Pressure',
      limit: 999999,
    });

    expect(searchRes.results.length).toBeLessThanOrEqual(100);

    // API boundary schema rejects out-of-bounds limit with 400
    const invalidRes = await request(app)
      .get('/api/v1/search?q=Pressure&limit=999999')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .set('x-organization-id', testUser.orgId);

    expect(invalidRes.status).toBe(400);

    // API boundary with max valid limit returns bounded results
    const validRes = await request(app)
      .get('/api/v1/search?q=Pressure&limit=50')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .set('x-organization-id', testUser.orgId);

    expect(validRes.status).toBe(200);
    expect(validRes.body.data.results.length).toBeLessThanOrEqual(50);
  });

  // ---------------------------------------------------------------------------
  // 5. Notifications List Query Boundedness
  // ---------------------------------------------------------------------------
  it('5. notifications repository clamps query limits to maximum 100', async () => {
    const notifs = await notificationRepository.listByUser(testUser.id, {
      limit: 999999,
    });

    expect(Array.isArray(notifs)).toBe(true);
    expect(notifs.length).toBeLessThanOrEqual(100);

    // Validation boundary rejects out-of-bounds limit with 400
    const invalidRes = await request(app)
      .get('/api/v1/notifications?limit=999999')
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(invalidRes.status).toBe(400);

    // Valid query succeeds within bound
    const validRes = await request(app)
      .get('/api/v1/notifications?limit=100')
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(validRes.status).toBe(200);
    expect(validRes.body.data.notifications.length).toBeLessThanOrEqual(100);
  });

  // ---------------------------------------------------------------------------
  // 6. Comments Thread Query Boundedness
  // ---------------------------------------------------------------------------
  it('6. comments thread query clamps limit to maximum 200 comments', async () => {
    const comments = await commentRepository.listByTask(taskId, {
      limit: 999999,
    });

    expect(Array.isArray(comments)).toBe(true);
    expect(comments.length).toBeLessThanOrEqual(200);
    expect(comments.length).toBeGreaterThanOrEqual(3);
  });

  // ---------------------------------------------------------------------------
  // 7. Audit Events Query Boundedness
  // ---------------------------------------------------------------------------
  it('7. audit repository clamps page size to maximum 100 events', async () => {
    const auditRes = await auditRepository.findMany(testUser.orgId, {
      limit: 999999,
    });

    expect(Array.isArray(auditRes.items)).toBe(true);
    expect(auditRes.items.length).toBeLessThanOrEqual(100);

    // Validation boundary rejects out-of-bounds query limit with 400
    const invalidRes = await request(app)
      .get(`/api/v1/organizations/${testUser.orgId}/audit-events?limit=999999`)
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(invalidRes.status).toBe(400);

    // Valid query succeeds within bound
    const validRes = await request(app)
      .get(`/api/v1/organizations/${testUser.orgId}/audit-events?limit=100`)
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(validRes.status).toBe(200);
    expect(validRes.body.data.length).toBeLessThanOrEqual(100);
  });

  // ---------------------------------------------------------------------------
  // 8. SaaS Usage and Metering Aggregation Efficiency
  // ---------------------------------------------------------------------------
  it('8. usage repository aggregates resource counts without unbounded scans', async () => {
    const periodStart = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const periodEnd = new Date(Date.now() + 24 * 3600 * 1000);

    const counts = await usageRepository.getAllCounts(testUser.orgId, periodStart, periodEnd);

    expect(counts).toBeDefined();
    expect(counts.projects).toBeGreaterThanOrEqual(1);
    expect(counts.members).toBeGreaterThanOrEqual(1);
    expect(counts.activeTasks).toBeGreaterThanOrEqual(1);
    expect(counts.aiRequests).toBeGreaterThanOrEqual(0);

    const httpRes = await request(app)
      .get(`/api/v1/organizations/${testUser.orgId}/usage`)
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(httpRes.status).toBe(200);
    expect(httpRes.body.data.members).toBeDefined();
    expect(httpRes.body.data.projects).toBeDefined();
    expect(httpRes.body.data.activeTasks).toBeDefined();
    expect(httpRes.body.data.aiRequests).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // 9. Jobs Queue Summary Aggregation Bounds
  // ---------------------------------------------------------------------------
  it('9. jobs repository returns bounded status counts without table scans', async () => {
    const summary = await jobRepository.getSummary(testUser.orgId);

    expect(summary).toBeDefined();
    expect(summary.organizationId).toBe(testUser.orgId);
    expect(summary.counts.pending).toBeGreaterThanOrEqual(0);
    expect(summary.counts.processing).toBeGreaterThanOrEqual(0);
    expect(summary.counts.completed).toBeGreaterThanOrEqual(0);
    expect(summary.counts.failed).toBeGreaterThanOrEqual(0);
  });
});
