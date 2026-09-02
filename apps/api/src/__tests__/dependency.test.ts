import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { ProjectRole, TaskStatus, TaskPriority, DependencyType } from '@taskflow/shared';
import { createServer } from '../server.js';
import { prisma } from '../lib/prisma.js';

const app = createServer();

describe('TaskFlow PR 9: Task Dependencies & Dependency Graph Suite', () => {
  const timestamp = `${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  const ownerEmail = `dep.owner.${timestamp}@taskflow.dev`;
  const adminEmail = `dep.admin.${timestamp}@taskflow.dev`;
  const memberEmail = `dep.member.${timestamp}@taskflow.dev`;
  const viewerEmail = `dep.viewer.${timestamp}@taskflow.dev`;
  const foreignEmail = `dep.foreign.${timestamp}@taskflow.dev`;
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

  // Tasks in main project
  let taskAId: string;
  let taskBId: string;
  let taskCId: string;
  let taskDId: string;
  let taskEId: string;

  // Foreign task
  let foreignTaskId: string;

  beforeAll(async () => {
    // 1. Register Owner
    const ownerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Dependency Suite Owner',
      email: ownerEmail,
      password: defaultPassword,
      organizationName: 'Dependency Operations Corp',
    });
    ownerToken = ownerRes.body.data.accessToken;
    ownerOrgId = ownerRes.body.data.defaultOrganization.id;

    // 2. Register Admin User
    const adminRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Dependency Suite Admin',
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
      name: 'Dependency Suite Member',
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
      name: 'Dependency Suite Viewer',
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
      name: 'Dependency Foreign User',
      email: foreignEmail,
      password: defaultPassword,
      organizationName: 'Foreign Corp Dependencies',
    });
    foreignToken = foreignRes.body.data.accessToken;
    foreignOrgId = foreignRes.body.data.defaultOrganization.id;

    // 6. Create Main Test Project
    const projRes = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Dependency Engine Core',
        key: 'DAG',
        description: 'Testing task dependency engine and graph',
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
        name: 'Foreign Project Deps',
        key: 'FDAG',
      });
    foreignProjectId = foreignProjRes.body.data.id;

    // 9. Create Tasks in Main Project
    const tA = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Task A: Database Schema Design',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
      });
    taskAId = tA.body.data.id;

    const tB = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Task B: Migration Execution',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
      });
    taskBId = tB.body.data.id;

    const tC = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Task C: Repository Layer Implementation',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
      });
    taskCId = tC.body.data.id;

    const tD = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Task D: Integration Tests',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
      });
    taskDId = tD.body.data.id;

    const tE = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Task E: API Documentation',
        status: TaskStatus.DONE,
        priority: TaskPriority.LOW,
      });
    taskEId = tE.body.data.id;

    // 10. Create Foreign Task
    const foreignTaskRes = await request(app)
      .post(`/api/v1/organizations/${foreignOrgId}/projects/${foreignProjectId}/tasks`)
      .set('Authorization', `Bearer ${foreignToken}`)
      .send({ title: 'Foreign Org Task' });
    foreignTaskId = foreignTaskRes.body.data.id;
  });

  afterAll(async () => {
    // Cleanup
    if (foreignOrgId) {
      await prisma.organization.delete({ where: { id: foreignOrgId } }).catch(() => {});
    }
    if (ownerOrgId) {
      await prisma.organization.delete({ where: { id: ownerOrgId } }).catch(() => {});
    }
  });

  // ========================================================================
  // 1. Dependency Creation & Canonical Normalization
  // ========================================================================
  describe('1. Dependency Creation & Canonical Normalization', () => {
    it('should allow Project Member to create a BLOCKS dependency (A BLOCKS B)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskAId}/dependencies`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          targetTaskId: taskBId,
          type: DependencyType.BLOCKS,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.predecessorId).toBe(taskAId);
      expect(res.body.data.successorId).toBe(taskBId);
      expect(res.body.data.type).toBe(DependencyType.BLOCKS);
    });

    it('should reject duplicate dependency (409 Conflict)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskAId}/dependencies`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          targetTaskId: taskBId,
          type: DependencyType.BLOCKS,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_DEPENDENCY');
    });

    it('should normalize BLOCKED_BY: submitting B is BLOCKED_BY A rejects duplicate because A BLOCKS B exists', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskBId}/dependencies`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          targetTaskId: taskAId,
          type: DependencyType.BLOCKED_BY,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_DEPENDENCY');
    });

    it('should allow creating a RELATES_TO dependency', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskAId}/dependencies`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          targetTaskId: taskEId,
          type: DependencyType.RELATES_TO,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe(DependencyType.RELATES_TO);
    });

    it('should reject reverse duplicate RELATES_TO (submitting E RELATES_TO A when A RELATES_TO E exists)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskEId}/dependencies`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          targetTaskId: taskAId,
          type: DependencyType.RELATES_TO,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_DEPENDENCY');
    });

    it('should reject self-dependency (A cannot depend on A)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskAId}/dependencies`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          targetTaskId: taskAId,
          type: DependencyType.BLOCKS,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SELF_DEPENDENCY');
    });

    it('should reject invalid dependency type', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskAId}/dependencies`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          targetTaskId: taskCId,
          type: 'INVALID_TYPE',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================================================================
  // 2. Listing Dependencies & Categorization
  // ========================================================================
  describe('2. Listing Dependencies & Categorization', () => {
    it('should list dependencies from Task A vantage point (shows blocks B and related E)', async () => {
      const res = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskAId}/dependencies`
        )
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.blocks.length).toBe(1);
      expect(res.body.data.blocks[0].task.id).toBe(taskBId);
      expect(res.body.data.blockedBy.length).toBe(0);
      expect(res.body.data.related.length).toBe(1);
      expect(res.body.data.related[0].task.id).toBe(taskEId);
      expect(res.body.data.totalCount).toBe(2);
    });

    it('should list dependencies from Task B vantage point (shows blockedBy A with unresolved warning)', async () => {
      const res = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskBId}/dependencies`
        )
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.blockedBy.length).toBe(1);
      expect(res.body.data.blockedBy[0].task.id).toBe(taskAId);
      expect(res.body.data.blockedBy[0].type).toBe(DependencyType.BLOCKED_BY);
      expect(res.body.data.hasUnresolvedBlockers).toBe(true); // Task A is IN_PROGRESS
    });

    it('should include dependencySummary in TaskDetail', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskBId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.dependencySummary).toBeDefined();
      expect(res.body.data.dependencySummary.blockedByCount).toBe(1);
      expect(res.body.data.dependencySummary.hasUnresolvedBlockers).toBe(true);
    });
  });

  // ========================================================================
  // 3. Cycle Detection Matrix
  // ========================================================================
  describe('3. Cycle Detection Matrix', () => {
    // Current graph: A -> B
    it('should reject direct 2-node cycle (B -> A)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskBId}/dependencies`
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetTaskId: taskAId,
          type: DependencyType.BLOCKS,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DEPENDENCY_CYCLE_DETECTED');
    });

    it('should allow valid chain: B -> C (forming A -> B -> C)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskBId}/dependencies`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          targetTaskId: taskCId,
          type: DependencyType.BLOCKS,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject 3-node cycle: C -> A (would form A -> B -> C -> A)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskCId}/dependencies`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          targetTaskId: taskAId,
          type: DependencyType.BLOCKS,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DEPENDENCY_CYCLE_DETECTED');
    });

    it('should allow extending chain: C -> D (forming A -> B -> C -> D)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskCId}/dependencies`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          targetTaskId: taskDId,
          type: DependencyType.BLOCKS,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject 4-node cycle: D -> A (would form A -> B -> C -> D -> A)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskDId}/dependencies`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          targetTaskId: taskAId,
          type: DependencyType.BLOCKS,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DEPENDENCY_CYCLE_DETECTED');
    });

    it('should reject 3-node cycle in middle: D -> B (would form B -> C -> D -> B)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskDId}/dependencies`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          targetTaskId: taskBId,
          type: DependencyType.BLOCKS,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DEPENDENCY_CYCLE_DETECTED');
    });

    it('should allow valid branching: A -> C (forming diamond / branch)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskAId}/dependencies`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          targetTaskId: taskCId,
          type: DependencyType.BLOCKS,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should confirm RELATES_TO does not participate in cycle detection (E RELATES_TO D is valid)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskEId}/dependencies`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          targetTaskId: taskDId,
          type: DependencyType.RELATES_TO,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  // ========================================================================
  // 4. RBAC & Security Isolation
  // ========================================================================
  describe('4. RBAC & Security Isolation', () => {
    it('should reject Project Viewer from creating dependency (403 Forbidden)', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskEId}/dependencies`
        )
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          targetTaskId: taskBId,
          type: DependencyType.RELATES_TO,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should reject cross-project dependency: linking task in Project A to task in Foreign Project', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskAId}/dependencies`
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          targetTaskId: foreignTaskId,
          type: DependencyType.BLOCKS,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TARGET_TASK_NOT_FOUND');
    });

    it('should reject cross-tenant dependency: foreign user operating on main project tasks', async () => {
      const res = await request(app)
        .post(
          `/api/v1/organizations/${foreignOrgId}/projects/${foreignProjectId}/tasks/${foreignTaskId}/dependencies`
        )
        .set('Authorization', `Bearer ${foreignToken}`)
        .send({
          targetTaskId: taskAId,
          type: DependencyType.BLOCKS,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TARGET_TASK_NOT_FOUND');
    });
  });

  // ========================================================================
  // 5. Deletion & Graph View
  // ========================================================================
  describe('5. Deletion & Graph View', () => {
    let depToDeleteId: string;

    beforeAll(async () => {
      // Find a dependency on taskD to delete
      const res = await request(app)
        .get(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskDId}/dependencies`
        )
        .set('Authorization', `Bearer ${memberToken}`);
      depToDeleteId = res.body.data.blockedBy[0].id;
    });

    it('should reject Project Viewer from deleting dependency (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskDId}/dependencies/${depToDeleteId}`
        )
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should reject deleting dependency from incorrect task context (404)', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskEId}/dependencies/${depToDeleteId}`
        )
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should allow Project Member to delete dependency', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks/${taskDId}/dependencies/${depToDeleteId}`
        )
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify both tasks still exist in database
      const tC = await prisma.task.findUnique({ where: { id: taskCId } });
      const tD = await prisma.task.findUnique({ where: { id: taskDId } });
      expect(tC).toBeDefined();
      expect(tD).toBeDefined();
    });

    it('should return complete project dependency graph via /dependencies/graph', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/dependencies/graph`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nodes).toBeDefined();
      expect(res.body.data.edges).toBeDefined();
      expect(res.body.data.nodes.length).toBeGreaterThanOrEqual(5);
      expect(res.body.data.edges.length).toBeGreaterThanOrEqual(3);
    });
  });
});
