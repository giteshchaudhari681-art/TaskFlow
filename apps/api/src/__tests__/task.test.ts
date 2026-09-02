import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { UserRole, ProjectRole, TaskStatus, TaskPriority } from '@taskflow/shared';
import { createServer } from '../server.js';
import { prisma } from '../lib/prisma.js';

const app = createServer();

describe('TaskFlow PR 6: Task Management Foundation Suite', () => {
  const timestamp = `${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  const ownerEmail = `task.owner.${timestamp}@taskflow.dev`;
  const adminEmail = `task.admin.${timestamp}@taskflow.dev`;
  const memberEmail = `task.member.${timestamp}@taskflow.dev`;
  const viewerEmail = `task.viewer.${timestamp}@taskflow.dev`;
  const foreignEmail = `task.foreign.${timestamp}@taskflow.dev`;
  const defaultPassword = 'Password123!';

  let ownerToken: string;
  let ownerUserId: string;
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
  const projectKey = 'TASK';

  let createdTaskId: string;
  let createdSubtaskId: string;

  beforeAll(async () => {
    // 1. Register Owner (initial org)
    const ownerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Task Suite Owner',
      email: ownerEmail,
      password: defaultPassword,
      organizationName: 'Task Engine Labs',
    });
    ownerToken = ownerRes.body.data.accessToken;
    ownerUserId = ownerRes.body.data.user.id;
    ownerOrgId = ownerRes.body.data.defaultOrganization.id;

    // 2. Register Admin User
    const adminRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Task Suite Admin',
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
      name: 'Task Suite Member',
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
      name: 'Task Suite Viewer',
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
      name: 'Foreign Task Suite Owner',
      email: foreignEmail,
      password: defaultPassword,
      organizationName: 'External Solutions HQ',
    });
    foreignToken = foreignRes.body.data.accessToken;
    foreignOrgId = foreignRes.body.data.defaultOrganization.id;

    // 6. Create Base Project in ownerOrgId
    const projectRes = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Task Operations Platform',
        key: projectKey,
        description: 'Core project for task execution tests',
      });
    testProjectId = projectRes.body.data.id;

    // 7. Attach Admin as Project ADMIN
    await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        userId: adminUserId,
        role: ProjectRole.ADMIN,
      });

    // 8. Attach Member as Project MEMBER
    await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        userId: memberUserId,
        role: ProjectRole.MEMBER,
      });

    // 9. Attach Viewer as Project VIEWER
    await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        userId: viewerUserId,
        role: ProjectRole.VIEWER,
      });
  });

  afterAll(async () => {
    // Cleanup test data
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
  // 1. Task Creation & Monotonic Sequential Numbering
  // ========================================================================
  describe('1. Task Creation & Issue Key Numbering', () => {
    it('should allow project LEAD to create the first task (TASK-1)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Implement database schema migrations',
          description: 'Define Prisma models and write initial migration',
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.taskNumber).toBe(1);
      expect(res.body.data.issueKey).toBe(`${projectKey}-1`);
      expect(res.body.data.title).toBe('Implement database schema migrations');
      expect(res.body.data.status).toBe(TaskStatus.TODO);
      expect(res.body.data.priority).toBe(TaskPriority.HIGH);
      expect(res.body.data.reporterId).toBe(ownerUserId);

      createdTaskId = res.body.data.id;
    });

    it('should increment taskNumber and issueKey sequentially for the second task (TASK-2)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Create REST endpoints for tasks',
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.taskNumber).toBe(2);
      expect(res.body.data.issueKey).toBe(`${projectKey}-2`);
      expect(res.body.data.reporterId).toBe(memberUserId);
    });

    it('should reject task creation from project VIEWER (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          title: 'Unauthorized Task by Viewer',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should reject task creation from user outside the organization (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${foreignToken}`)
        .send({
          title: 'Foreign Infiltrator Task',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================================================================
  // 2. Concurrency Safety Test (Row-Level Locking on Project)
  // ========================================================================
  describe('2. Concurrency Safety & Collision Prevention', () => {
    it('should safely serialize 10 concurrent task creations without duplicates or collisions', async () => {
      const concurrentCount = 10;
      const creationPromises = Array.from({ length: concurrentCount }, (_, i) =>
        request(app)
          .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            title: `Concurrent Automated Task #${i + 1}`,
            priority: TaskPriority.MEDIUM,
          })
      );

      const responses = await Promise.all(creationPromises);

      // Verify all 10 succeeded
      responses.forEach(res => {
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      });

      const taskNumbers = responses.map(res => res.body.data.taskNumber);
      const issueKeys = responses.map(res => res.body.data.issueKey);

      // Verify all task numbers are unique
      const uniqueNumbers = new Set(taskNumbers);
      expect(uniqueNumbers.size).toBe(concurrentCount);

      // Verify all issue keys are unique and follow TASK-X pattern
      const uniqueKeys = new Set(issueKeys);
      expect(uniqueKeys.size).toBe(concurrentCount);

      issueKeys.forEach(k => {
        expect(k).toMatch(new RegExp(`^${projectKey}-\\d+$`));
      });
    });
  });

  // ========================================================================
  // 3. Task Assignment & Verification Matrix
  // ========================================================================
  describe('3. Task Assignment Validation', () => {
    it('should successfully assign a task to an authorized project member', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Task Assigned to Member',
          assigneeId: memberUserId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.assigneeId).toBe(memberUserId);
      expect(res.body.data.assignee.name).toBe('Task Suite Member');
    });

    it('should reject assigning a task to an external user from a different organization (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Invalid Assignment Test',
          assigneeId: foreignOrgId, // invalid user ID
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ASSIGNEE_NOT_IN_PROJECT');
    });
  });

  // ========================================================================
  // 4. Task Retrieval & Multi-Tenant Boundaries
  // ========================================================================
  describe('4. Task Retrieval & Tenant Isolation', () => {
    it('should retrieve task details by ID for authorized member', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdTaskId);
      expect(res.body.data.issueKey).toBe(`${projectKey}-1`);
      expect(res.body.data.subtasks).toBeDefined();
    });

    it('should reject task access when organization does not match project (404)', async () => {
      const res = await request(app)
        .get(
          `/api/v1/organizations/${foreignOrgId}/projects/${testProjectId}/tasks/${createdTaskId}`
        )
        .set('Authorization', `Bearer ${foreignToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent task ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    });
  });

  // ========================================================================
  // 5. Task Update & Lifecycle
  // ========================================================================
  describe('5. Task Update & Completion Lifecycle', () => {
    it('should allow project MEMBER to update task details', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${createdTaskId}`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Implement database schema migrations v2',
          priority: TaskPriority.URGENT,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Implement database schema migrations v2');
      expect(res.body.data.priority).toBe(TaskPriority.URGENT);
    });

    it('should populate completedAt when task status is set to DONE', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${createdTaskId}`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          status: TaskStatus.DONE,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(TaskStatus.DONE);
      expect(res.body.data.completedAt).not.toBeNull();
    });

    it('should reject VIEWER from updating task (403)', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${createdTaskId}`
        )
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          title: 'Hacked by Viewer',
        });

      expect(res.status).toBe(403);
    });
  });

  // ========================================================================
  // 6. Subtasks Operations
  // ========================================================================
  describe('6. Subtask Management & Progress Tracking', () => {
    it('should allow member to create a subtask on the task (201)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${createdTaskId}/subtasks`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          title: 'Write SQL migration script',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Write SQL migration script');
      expect(res.body.data.isCompleted).toBe(false);
      expect(res.body.data.order).toBe(0);

      createdSubtaskId = res.body.data.id;
    });

    it('should list all subtasks for a task', async () => {
      const res = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${createdTaskId}/subtasks`
        )
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('should toggle subtask completion and set completedAt timestamp (200)', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${createdTaskId}/subtasks/${createdSubtaskId}`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          isCompleted: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isCompleted).toBe(true);
      expect(res.body.data.completedAt).not.toBeNull();
    });

    it('should allow member to delete a subtask (200)', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${createdTaskId}/subtasks/${createdSubtaskId}`
        )
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify subtask count is now 0
      const listRes = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${createdTaskId}/subtasks`
        )
        .set('Authorization', `Bearer ${memberToken}`);
      expect(listRes.body.data.length).toBe(0);
    });
  });

  // ========================================================================
  // 7. Task Filtering & Listing
  // ========================================================================
  describe('7. Task Filtering and Search Query Options', () => {
    it('should filter tasks by status and search keyword', async () => {
      const res = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks?status=DONE&search=database`
        )
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].status).toBe(TaskStatus.DONE);
    });

    it('should search tasks by issue key prefix (TASK-)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks?search=TASK-1`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const found = res.body.data.find((t: any) => t.issueKey === 'TASK-1');
      expect(found).toBeDefined();
      expect(found.issueKey).toBe('TASK-1');
    });
  });

  // ========================================================================
  // 8. Task Archival & Deletion Permissions
  // ========================================================================
  describe('8. Task Archival & Deletion Permissions', () => {
    it('should reject MEMBER from archiving a task (403)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${createdTaskId}/archive`
        )
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('should permit project ADMIN to archive a task (200)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${createdTaskId}/archive`
        )
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.archivedAt).not.toBeNull();
    });

    it('should permit project LEAD to unarchive a task (200)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${createdTaskId}/unarchive`
        )
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.archivedAt).toBeNull();
    });

    it('should permit project LEAD to permanently delete a task (200)', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${createdTaskId}`
        )
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify task no longer exists
      const getRes = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(getRes.status).toBe(404);
    });
  });
});
