import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { ProjectRole, TaskStatus, TaskPriority } from '@taskflow/shared';
import { createServer } from '../server.js';
import { prisma } from '../lib/prisma.js';

const app = createServer();

describe('TaskFlow PR 8: Task Labels & Organization Suite', () => {
  const timestamp = `${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  const ownerEmail = `label.owner.${timestamp}@taskflow.dev`;
  const adminEmail = `label.admin.${timestamp}@taskflow.dev`;
  const memberEmail = `label.member.${timestamp}@taskflow.dev`;
  const viewerEmail = `label.viewer.${timestamp}@taskflow.dev`;
  const foreignEmail = `label.foreign.${timestamp}@taskflow.dev`;
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

  let testTaskId: string;
  let secondTaskId: string;
  let foreignTaskId: string;

  let bugLabelId: string;
  let frontendLabelId: string;
  let backendLabelId: string;
  let foreignLabelId: string;

  beforeAll(async () => {
    // 1. Register Owner
    const ownerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Label Suite Owner',
      email: ownerEmail,
      password: defaultPassword,
      organizationName: 'Label Operations Corp',
    });
    ownerToken = ownerRes.body.data.accessToken;
    ownerOrgId = ownerRes.body.data.defaultOrganization.id;

    // 2. Register Admin User
    const adminRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Label Suite Admin',
      email: adminEmail,
      password: defaultPassword,
    });
    adminToken = adminRes.body.data.accessToken;
    adminUserId = adminRes.body.data.user.id;
    await prisma.organizationMember.create({
      data: {
        organizationId: ownerOrgId,
        userId: adminUserId,
        role: 'MEMBER',
      },
    });

    // 3. Register Member User
    const memberRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Label Suite Member',
      email: memberEmail,
      password: defaultPassword,
    });
    memberToken = memberRes.body.data.accessToken;
    memberUserId = memberRes.body.data.user.id;
    await prisma.organizationMember.create({
      data: {
        organizationId: ownerOrgId,
        userId: memberUserId,
        role: 'MEMBER',
      },
    });

    // 4. Register Viewer User
    const viewerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Label Suite Viewer',
      email: viewerEmail,
      password: defaultPassword,
    });
    viewerToken = viewerRes.body.data.accessToken;
    viewerUserId = viewerRes.body.data.user.id;
    await prisma.organizationMember.create({
      data: {
        organizationId: ownerOrgId,
        userId: viewerUserId,
        role: 'MEMBER',
      },
    });

    // 5. Register Foreign Organization & User
    const foreignRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Label Foreign User',
      email: foreignEmail,
      password: defaultPassword,
      organizationName: 'Foreign Corp Labels',
    });
    foreignToken = foreignRes.body.data.accessToken;
    foreignOrgId = foreignRes.body.data.defaultOrganization.id;

    // 6. Create Main Test Project
    const projRes = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Label Engine Core',
        key: 'TAG',
        description: 'Testing task labels and tag management',
      });
    testProjectId = projRes.body.data.id;

    // 7. Add Users to Project with explicit roles
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

    // 8. Create Foreign Project
    const foreignProjRes = await request(app)
      .post(`/api/v1/organizations/${foreignOrgId}/projects`)
      .set('Authorization', `Bearer ${foreignToken}`)
      .send({
        name: 'Foreign Project Tags',
        key: 'FTAG',
      });
    foreignProjectId = foreignProjRes.body.data.id;

    // 9. Create Main Project Tasks
    const taskRes1 = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Fix Authentication Token Leak',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
      });
    testTaskId = taskRes1.body.data.id;

    const taskRes2 = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Build Dark Mode Color Switcher',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
      });
    secondTaskId = taskRes2.body.data.id;

    // 10. Create Foreign Task
    const foreignTaskRes = await request(app)
      .post(`/api/v1/organizations/${foreignOrgId}/projects/${foreignProjectId}/tasks`)
      .set('Authorization', `Bearer ${foreignToken}`)
      .send({
        title: 'Foreign Org Task',
      });
    foreignTaskId = foreignTaskRes.body.data.id;
  });

  afterAll(async () => {
    // Cleanup foreign and test orgs
    if (foreignOrgId) {
      await prisma.organization.delete({ where: { id: foreignOrgId } }).catch(() => {});
    }
    if (ownerOrgId) {
      await prisma.organization.delete({ where: { id: ownerOrgId } }).catch(() => {});
    }
  });

  // ========================================================================
  // 1. Label Creation & Validation
  // ========================================================================
  describe('1. Label Creation & Validation', () => {
    it('should allow Project Lead / Admin to create a label with normalized whitespace', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/labels`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '  Bug Fix  ',
          color: 'rose',
          description: 'Defects requiring fixes',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Bug Fix');
      expect(res.body.data.normalizedName).toBe('bug fix');
      expect(res.body.data.color).toBe('rose');
      expect(res.body.data.projectId).toBe(testProjectId);
      bugLabelId = res.body.data.id;
    });

    it('should reject duplicate label name case-insensitively (409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/labels`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'BUG FIX',
          color: 'red',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('LABEL_ALREADY_EXISTS');
    });

    it('should reject invalid color token (400 Validation Error)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/labels`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Security Vulnerability',
          color: 'unsafe-executable-script',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject label creation by Project Member (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/labels`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Frontend',
          color: 'cyan',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should reject label creation by Project Viewer (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/labels`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Research',
          color: 'violet',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  // ========================================================================
  // 2. Label CRUD & Listing
  // ========================================================================
  describe('2. Label CRUD & Listing', () => {
    it('should create additional labels for testing', async () => {
      const feRes = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/labels`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Frontend', color: 'cyan' });
      frontendLabelId = feRes.body.data.id;

      const beRes = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/labels`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Backend', color: 'indigo' });
      backendLabelId = beRes.body.data.id;

      expect(feRes.status).toBe(201);
      expect(beRes.status).toBe(201);
    });

    it('should allow all project members (including Viewers) to list labels with task counts', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/labels`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);

      const bugLabel = res.body.data.find((l: any) => l.id === bugLabelId);
      expect(bugLabel).toBeDefined();
      expect(bugLabel.taskCount).toBe(0);
    });

    it('should allow Project Admin to update a label', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/labels/${backendLabelId}`
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Backend API',
          color: 'blue',
          description: 'Core REST & GraphQL services',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Backend API');
      expect(res.body.data.normalizedName).toBe('backend api');
      expect(res.body.data.color).toBe('blue');
    });

    it('should reject label update if new name duplicates another label in project', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/labels/${backendLabelId}`
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Frontend', // conflicts with existing frontend label
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('LABEL_ALREADY_EXISTS');
    });
  });

  // ========================================================================
  // 3. Task Label Assignment & Removal
  // ========================================================================
  describe('3. Task Label Assignment & Removal', () => {
    it('should allow Project Member to assign label to a task', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/labels`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ labelId: bugLabelId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.labels).toBeDefined();
      expect(res.body.data.labels.some((l: any) => l.id === bugLabelId)).toBe(true);
    });

    it('should handle duplicate label assignment idempotently without duplicate rows', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/labels`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ labelId: bugLabelId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify task in database has exactly 1 task_label row
      const count = await prisma.taskLabel.count({
        where: { taskId: testTaskId, labelId: bugLabelId },
      });
      expect(count).toBe(1);
    });

    it('should assign a second label to the same task', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/labels`
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ labelId: frontendLabelId });

      expect(res.status).toBe(201);
      expect(res.body.data.labels.length).toBe(2);
    });

    it('should assign a label to second task', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${secondTaskId}/labels`
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ labelId: frontendLabelId });

      expect(res.status).toBe(201);
      expect(res.body.data.labels.length).toBe(1);
    });

    it('should reflect updated taskCount when listing labels', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/labels`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      const frontendLabel = res.body.data.find((l: any) => l.id === frontendLabelId);
      expect(frontendLabel.taskCount).toBe(2);
      const bugLabel = res.body.data.find((l: any) => l.id === bugLabelId);
      expect(bugLabel.taskCount).toBe(1);
    });

    it('should reject Project Viewer from assigning label (403 Forbidden)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/labels`
        )
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ labelId: backendLabelId });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow Project Member to remove a label from a task', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/labels/${frontendLabelId}`
        )
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.labels.some((l: any) => l.id === frontendLabelId)).toBe(false);
      expect(res.body.data.labels.some((l: any) => l.id === bugLabelId)).toBe(true);
    });

    it('should reject Project Viewer from removing a label (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/labels/${bugLabelId}`
        )
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  // ========================================================================
  // 4. Cross-Project & Cross-Tenant Security Isolation
  // ========================================================================
  describe('4. Cross-Project & Cross-Tenant Security Isolation', () => {
    beforeAll(async () => {
      // Create label in foreign project
      const res = await request(app)
        .post(`/api/v1/organizations/${foreignOrgId}/projects/${foreignProjectId}/labels`)
        .set('Authorization', `Bearer ${foreignToken}`)
        .send({ name: 'Foreign Label', color: 'pink' });
      foreignLabelId = res.body.data.id;
    });

    it('should reject attaching Foreign Project Label to Main Project Task (404/400)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/labels`
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ labelId: foreignLabelId });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('LABEL_NOT_FOUND');
    });

    it('should reject attaching Main Project Label to Foreign Project Task (404/400)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${foreignOrgId}/projects/${foreignProjectId}/tasks/${foreignTaskId}/labels`
        )
        .set('Authorization', `Bearer ${foreignToken}`)
        .send({ labelId: bugLabelId });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('LABEL_NOT_FOUND');
    });

    it('should reject removing a label from another project (404)', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}/labels/${foreignLabelId}`
        )
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================================================================
  // 5. Task Filtering by Labels
  // ========================================================================
  describe('5. Task Filtering by Labels', () => {
    beforeAll(async () => {
      // Setup task labels:
      // testTask: has [bugLabel]
      // secondTask: has [frontendLabel, bugLabel]
      await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${secondTaskId}/labels`
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ labelId: bugLabelId });
    });

    it('should filter tasks by a single label', async () => {
      const res = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks?labelIds=${frontendLabelId}`
        )
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(secondTaskId);
    });

    it('should filter tasks with ANY semantics across multiple labels', async () => {
      const res = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks?labelIds=${bugLabelId},${frontendLabelId}&labelMatch=ANY`
        )
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should filter tasks with ALL semantics across multiple labels', async () => {
      const res = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks?labelIds=${bugLabelId},${frontendLabelId}&labelMatch=ALL`
        )
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(secondTaskId);
    });

    it('should combine label filter with status and search filters', async () => {
      const res = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks?labelIds=${bugLabelId}&status=TODO&search=Authentication`
        )
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(testTaskId);
    });
  });

  // ========================================================================
  // 6. Label Deletion & Task Preservation
  // ========================================================================
  describe('6. Label Deletion & Task Preservation', () => {
    it('should delete a label and preserve tasks (cascading only task_labels)', async () => {
      const deleteRes = await request(app)
        .delete(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/labels/${bugLabelId}`
        )
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify task still exists
      const taskRes = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(taskRes.status).toBe(200);
      expect(taskRes.body.data.id).toBe(testTaskId);
      expect(taskRes.body.data.labels.some((l: any) => l.id === bugLabelId)).toBe(false);
    });
  });
});
