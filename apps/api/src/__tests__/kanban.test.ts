import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { UserRole, ProjectRole, TaskStatus, TaskPriority } from '@taskflow/shared';
import { createServer } from '../server.js';
import { prisma } from '../lib/prisma.js';

const app = createServer();

describe('TaskFlow PR 7: Kanban Execution Board & Status Workflow Suite', () => {
  const timestamp = `${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  const ownerEmail = `kanban.owner.${timestamp}@taskflow.dev`;
  const adminEmail = `kanban.admin.${timestamp}@taskflow.dev`;
  const memberEmail = `kanban.member.${timestamp}@taskflow.dev`;
  const viewerEmail = `kanban.viewer.${timestamp}@taskflow.dev`;
  const foreignEmail = `kanban.foreign.${timestamp}@taskflow.dev`;
  const defaultPassword = 'Password123!';

  let ownerToken: string;
  let ownerOrgId: string;

  let adminToken: string;
  let adminUserId: string;

  let memberToken: string;
  let memberUserId: string;

  let viewerToken: string;
  let viewerUserId: string;

  let foreignToken: string;
  let foreignOrgId: string;

  let testProjectId: string;
  let foreignProjectId: string;
  const projectKey = 'KANBAN';

  let testTaskId: string;

  beforeAll(async () => {
    // 1. Register Owner
    const ownerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Kanban Suite Owner',
      email: ownerEmail,
      password: defaultPassword,
      organizationName: 'Kanban Operations Corp',
    });
    ownerToken = ownerRes.body.data.accessToken;
    ownerOrgId = ownerRes.body.data.defaultOrganization.id;

    // 2. Register Admin User
    const adminRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Kanban Suite Admin',
      email: adminEmail,
      password: defaultPassword,
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

    // 3. Register Member User
    const memberRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Kanban Suite Member',
      email: memberEmail,
      password: defaultPassword,
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

    // 4. Register Viewer User
    const viewerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Kanban Suite Viewer',
      email: viewerEmail,
      password: defaultPassword,
    });
    viewerToken = viewerRes.body.data.accessToken;
    viewerUserId = viewerRes.body.data.user.id;
    await prisma.organizationMember.create({
      data: {
        organizationId: ownerOrgId,
        userId: viewerUserId,
        role: UserRole.MEMBER,
      },
    });

    // 5. Register Foreign User & Org
    const foreignRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Foreign Kanban User',
      email: foreignEmail,
      password: defaultPassword,
      organizationName: 'Cross Tenant Industries',
    });
    foreignToken = foreignRes.body.data.accessToken;
    foreignOrgId = foreignRes.body.data.defaultOrganization.id;

    // 6. Create Base Project in ownerOrgId
    const projectRes = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Kanban Board Engine',
        key: projectKey,
        description: 'Executing tasks across status columns',
      });
    testProjectId = projectRes.body.data.id;

    // 7. Create Foreign Project in foreignOrgId
    const foreignProjectRes = await request(app)
      .post(`/api/v1/organizations/${foreignOrgId}/projects`)
      .set('Authorization', `Bearer ${foreignToken}`)
      .send({
        name: 'Foreign Project',
        key: 'FORGN',
      });
    foreignProjectId = foreignProjectRes.body.data.id;

    // 8. Attach Project Memberships
    await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: adminUserId, role: ProjectRole.ADMIN });

    await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: memberUserId, role: ProjectRole.MEMBER });

    await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: viewerUserId, role: ProjectRole.VIEWER });

    // 9. Seed Initial Task for Testing
    const taskRes = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Initial Kanban Workflow Card',
        description: 'Testing transitions across all 7 statuses',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
      });
    testTaskId = taskRes.body.data.id;
  });

  afterAll(async () => {
    const orgIds = [ownerOrgId, foreignOrgId].filter(Boolean) as string[];
    if (orgIds.length > 0) {
      await prisma.project.deleteMany({
        where: { organizationId: { in: orgIds } },
      });
      await prisma.organization.deleteMany({
        where: { id: { in: orgIds } },
      });
    }
    await prisma.user.deleteMany({
      where: {
        email: { in: [ownerEmail, adminEmail, memberEmail, viewerEmail, foreignEmail] },
      },
    });
  });

  // ========================================================================
  // 1. Dedicated Task Status Endpoint (PATCH /tasks/:taskId/status)
  // ========================================================================
  describe('1. Dedicated Status Update Endpoint', () => {
    it('should allow project LEAD to transition task from TODO to IN_PROGRESS (200)', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/status`
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: TaskStatus.IN_PROGRESS });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(TaskStatus.IN_PROGRESS);
      expect(res.body.data.completedAt).toBeNull();
    });

    it('should allow project MEMBER to transition task from IN_PROGRESS to IN_REVIEW (200)', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/status`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: TaskStatus.IN_REVIEW });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(TaskStatus.IN_REVIEW);
    });

    it('should automatically set completedAt when transitioned to DONE (200)', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/status`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: TaskStatus.DONE });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(TaskStatus.DONE);
      expect(res.body.data.completedAt).not.toBeNull();
    });

    it('should clear completedAt when transitioned out of DONE back to IN_PROGRESS (200)', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/status`
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: TaskStatus.IN_PROGRESS });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(TaskStatus.IN_PROGRESS);
      expect(res.body.data.completedAt).toBeNull();
    });

    it('should allow transition to BLOCKED and CANCELLED statuses (200)', async () => {
      const blockRes = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/status`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: TaskStatus.BLOCKED });
      expect(blockRes.status).toBe(200);
      expect(blockRes.body.data.status).toBe(TaskStatus.BLOCKED);

      const cancelRes = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/status`
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: TaskStatus.CANCELLED });
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe(TaskStatus.CANCELLED);
    });

    it('should reject invalid status strings with validation error (400)', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/status`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'INVALID_STATUS_STRING' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ========================================================================
  // 2. Authorization & RBAC on Status Mutations
  // ========================================================================
  describe('2. Authorization Boundaries on Status Changes', () => {
    it('should reject VIEWER from moving task status (403)', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/status`
        )
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ status: TaskStatus.DONE });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should reject unauthenticated request from moving task status (401)', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/status`
        )
        .send({ status: TaskStatus.TODO });

      expect(res.status).toBe(401);
    });

    it('should reject foreign tenant user from moving task status (403)', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/status`
        )
        .set('Authorization', `Bearer ${foreignToken}`)
        .send({ status: TaskStatus.TODO });

      expect(res.status).toBe(403);
    });
  });

  // ========================================================================
  // 3. Multi-Tenant Containment & Cross-Project Guard
  // ========================================================================
  describe('3. Multi-Tenant Containment & Cross-Project Protection', () => {
    it('should return 404 when attempting to mutate task via wrong project ID', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${foreignOrgId}/projects/${foreignProjectId}/tasks/${testTaskId}/status`
        )
        .set('Authorization', `Bearer ${foreignToken}`)
        .send({ status: TaskStatus.DONE });

      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent task ID', async () => {
      const fakeTaskId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${fakeTaskId}/status`
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: TaskStatus.TODO });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    });
  });

  // ========================================================================
  // 4. Board Data Query & Status Mapping
  // ========================================================================
  describe('4. Board Data Querying and Status Distribution', () => {
    it('should list all tasks for the board and reflect latest status', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((t: any) => t.id === testTaskId);
      expect(found).toBeDefined();
      expect(found.status).toBe(TaskStatus.CANCELLED);
    });

    it('should filter board tasks by status parameter', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks?status=CANCELLED`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.status === TaskStatus.CANCELLED)).toBe(true);
    });
  });
});
