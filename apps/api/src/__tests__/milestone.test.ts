import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { ProjectRole, MilestoneStatus } from '@taskflow/shared';
import { createServer } from '../server.js';
import { prisma } from '../lib/prisma.js';

const app = createServer();

describe('TaskFlow PR 10: Milestones & Project Timeline Suite', () => {
  const timestamp = `${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  const ownerEmail = `ms.owner.${timestamp}@taskflow.dev`;
  const memberEmail = `ms.member.${timestamp}@taskflow.dev`;
  const viewerEmail = `ms.viewer.${timestamp}@taskflow.dev`;
  const foreignEmail = `ms.foreign.${timestamp}@taskflow.dev`;
  const defaultPassword = 'Password123!';

  let ownerToken: string;
  let ownerOrgId: string;

  let memberToken: string;
  let memberUserId: string;

  let viewerToken: string;
  let viewerUserId: string;

  let foreignToken: string;
  let foreignOrgId: string;

  let testProjectId: string;
  let foreignProjectId: string;

  let taskId: string;

  let milestoneId: string;
  let secondMilestoneId: string;
  let foreignMilestoneId: string;

  beforeAll(async () => {
    // 1. Register Owner
    const ownerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Milestone Owner',
      email: ownerEmail,
      password: defaultPassword,
      organizationName: 'Milestone Corp',
    });
    ownerToken = ownerRes.body.data.accessToken;
    ownerOrgId = ownerRes.body.data.defaultOrganization.id;

    // 2. Register Member
    const memberRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Milestone Member',
      email: memberEmail,
      password: defaultPassword,
    });
    memberToken = memberRes.body.data.accessToken;
    memberUserId = memberRes.body.data.user.id;
    await prisma.organizationMember.create({ data: { organizationId: ownerOrgId, userId: memberUserId, role: 'MEMBER' } });

    // 3. Register Viewer
    const viewerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Milestone Viewer',
      email: viewerEmail,
      password: defaultPassword,
    });
    viewerToken = viewerRes.body.data.accessToken;
    viewerUserId = viewerRes.body.data.user.id;
    await prisma.organizationMember.create({ data: { organizationId: ownerOrgId, userId: viewerUserId, role: 'MEMBER' } });

    // 4. Register Foreign user (no access)
    const foreignRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Milestone Foreign',
      email: foreignEmail,
      password: defaultPassword,
      organizationName: 'Foreign Corp',
    });
    foreignToken = foreignRes.body.data.accessToken;
    foreignOrgId = foreignRes.body.data.defaultOrganization.id;

    // 5. Create test project
    const projRes = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Milestone Test Project', key: `MS${Date.now().toString().slice(-6)}` });
    testProjectId = projRes.body.data.id;

    // 6. Add member and viewer to project
    await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: memberUserId, role: ProjectRole.MEMBER });
    await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: viewerUserId, role: ProjectRole.VIEWER });

    // 7. Create a task in the project
    const taskRes = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Milestone Task Alpha', priority: 'HIGH' });
    taskId = taskRes.body.data.id;

    // 8. Create a foreign project
    const foreignProjRes = await request(app)
      .post(`/api/v1/organizations/${foreignOrgId}/projects`)
      .set('Authorization', `Bearer ${foreignToken}`)
      .send({ name: 'Foreign Milestone Project', key: `FM${Date.now().toString().slice(-6)}` });
    foreignProjectId = foreignProjRes.body.data.id;
  });

  afterAll(async () => {
    await prisma.project.deleteMany({ where: { id: { in: [testProjectId, foreignProjectId] } } });
    await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, memberEmail, viewerEmail, foreignEmail] } } });
  });

  // ================================================================
  // MILESTONE CRUD
  // ================================================================

  describe('POST /milestones — Create Milestone', () => {
    it('owner can create milestone with all fields', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Alpha Launch',
          description: 'First public release',
          startDate: '2025-01-01',
          dueDate: '2025-03-31',
          status: MilestoneStatus.OPEN,
          displayOrder: 0,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Alpha Launch');
      expect(res.body.data.description).toBe('First public release');
      expect(res.body.data.status).toBe(MilestoneStatus.OPEN);
      expect(res.body.data.progress).toBe(0);
      expect(res.body.data.taskCount).toBe(0);
      expect(res.body.data.completedTaskCount).toBe(0);
      expect(typeof res.body.data.health).toBe('string');
      milestoneId = res.body.data.id;
    });

    it('member can create milestone', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ title: 'Beta Phase', displayOrder: 1 });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Beta Phase');
      secondMilestoneId = res.body.data.id;
    });

    it('viewer cannot create milestone', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ title: 'Viewer Attempt' });

      expect(res.status).toBe(403);
    });

    it('foreign user cannot create milestone', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones`)
        .set('Authorization', `Bearer ${foreignToken}`)
        .send({ title: 'Foreign Attempt' });

      expect(res.status).toBe(403);
    });

    it('rejects milestone with startDate after dueDate', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Invalid Dates',
          startDate: '2025-06-01',
          dueDate: '2025-01-01',
        });

      expect(res.status).toBe(400);
    });

    it('rejects empty title', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /milestones — List Milestones', () => {
    it('owner can list milestones', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      // All items should have aggregated fields
      for (const ms of res.body.data) {
        expect(typeof ms.taskCount).toBe('number');
        expect(typeof ms.completedTaskCount).toBe('number');
        expect(typeof ms.progress).toBe('number');
        expect(typeof ms.health).toBe('string');
      }
    });

    it('viewer can list milestones', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
    });

    it('foreign user cannot list milestones', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones`)
        .set('Authorization', `Bearer ${foreignToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /milestones/:id — Get Milestone Detail', () => {
    it('returns milestone with task list', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(milestoneId);
      expect(Array.isArray(res.body.data.tasks)).toBe(true);
      expect(typeof res.body.data.progress).toBe('number');
      expect(typeof res.body.data.health).toBe('string');
    });

    it('returns 404 for non-existent milestone', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
    });

    it('foreign user cannot get milestone detail', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${foreignToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ================================================================
  // TASK ↔ MILESTONE ASSOCIATION
  // ================================================================

  describe('PATCH /tasks/:id — Assign task to milestone', () => {
    it('owner can assign a task to a milestone', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ milestoneId });

      expect(res.status).toBe(200);
      // milestoneId should be in the response
    });

    it('milestone task count reflects associated task', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.taskCount).toBeGreaterThanOrEqual(1);
    });

    it('can filter tasks by milestoneId', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks?milestoneId=${milestoneId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: { milestoneId: string | null }) => t.milestoneId === milestoneId)).toBe(true);
    });

    it('can filter tasks with milestoneId=none for unassigned', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks?milestoneId=none`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: { milestoneId: string | null }) => t.milestoneId === null)).toBe(true);
    });

    it('can unassign task from milestone', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ milestoneId: null });

      expect(res.status).toBe(200);
    });
  });

  // ================================================================
  // MILESTONE UPDATE
  // ================================================================

  describe('PATCH /milestones/:id — Update Milestone', () => {
    it('owner can update milestone title', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ title: 'Alpha Launch v2' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Alpha Launch v2');
    });

    it('member can update milestone', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: MilestoneStatus.COMPLETED });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(MilestoneStatus.COMPLETED);
    });

    it('viewer cannot update milestone', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ title: 'Viewer Update Attempt' });

      expect(res.status).toBe(403);
    });

    it('rejects empty update body', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ================================================================
  // TIMELINE ENDPOINT
  // ================================================================

  describe('GET /timeline — Project Timeline', () => {
    it('returns timeline with milestones array', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/timeline`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.projectId).toBe(testProjectId);
      expect(Array.isArray(res.body.data.milestones)).toBe(true);
      expect(typeof res.body.data.rangeStart).toBe('string');
      expect(typeof res.body.data.rangeEnd).toBe('string');

      for (const ms of res.body.data.milestones) {
        expect(typeof ms.progress).toBe('number');
        expect(typeof ms.health).toBe('string');
        expect(typeof ms.taskCount).toBe('number');
      }
    });

    it('viewer can access timeline', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/timeline`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
    });

    it('foreign user cannot access timeline', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/timeline`)
        .set('Authorization', `Bearer ${foreignToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ================================================================
  // DELETION (tasks preserved)
  // ================================================================

  describe('DELETE /milestones/:id — Delete Milestone', () => {
    it('re-assign task before deletion test', async () => {
      await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ milestoneId: secondMilestoneId });
    });

    it('viewer cannot delete milestone', async () => {
      const res = await request(app)
        .delete(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones/${secondMilestoneId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });

    it('owner can delete milestone, tasks preserved', async () => {
      const res = await request(app)
        .delete(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones/${secondMilestoneId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);

      // Verify task still exists with milestoneId = null
      const taskRes = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(taskRes.status).toBe(200);
      expect(taskRes.body.data.milestoneId).toBeNull();
    });
  });

  // ================================================================
  // CROSS-PROJECT ISOLATION
  // ================================================================

  describe('Cross-project isolation', () => {
    it('cannot access milestone from a different project', async () => {
      // Create a milestone in foreign project
      const fmsRes = await request(app)
        .post(`/api/v1/organizations/${foreignOrgId}/projects/${foreignProjectId}/milestones`)
        .set('Authorization', `Bearer ${foreignToken}`)
        .send({ title: 'Foreign Milestone' });
      foreignMilestoneId = fmsRes.body.data.id;

      // Owner of testProject should not access foreign milestone using their project's endpoint
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/milestones/${foreignMilestoneId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
    });
  });
});
