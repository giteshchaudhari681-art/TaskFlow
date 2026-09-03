import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createServer } from '../server.js';

describe('TaskFlow PR 13: Global Search, Command Palette & Cross-Project Navigation', () => {
  const app = createServer();
  const defaultPassword = 'Password123!';
  const timestamp = Date.now();

  // Organization A (Primary Tenant)
  const orgAEmail = `org_a_owner_${timestamp}@taskflow.io`;
  const memberA2Email = `member_a2_${timestamp}@taskflow.io`;
  const memberA3Email = `member_a3_${timestamp}@taskflow.io`;
  let orgAToken: string;
  let orgAId: string;
  let userA1Id: string;

  let memberA2Token: string;
  let memberA2Id: string;

  let memberA3Token: string;
  let memberA3Id: string;

  // Organization B (Foreign Tenant for Strict Isolation)
  const orgBEmail = `org_b_owner_${timestamp}@taskflow.io`;
  let orgBToken: string;
  let orgBId: string;

  // Project IDs
  let projectAlphaId: string;
  let projectBetaId: string;
  let projectForeignId: string;

  // Entity IDs
  let taskAlpha1Id: string;
  let taskAlpha2Id: string;
  let taskBeta1Id: string;
  let taskForeignId: string;
  let taskArchivedId: string;

  let milestoneAlphaId: string;
  let milestoneBetaId: string;
  let milestoneForeignId: string;

  let labelAlphaId: string;

  beforeAll(async () => {
    // 1. Register Org A Owner
    const regA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Owner Alice',
        email: orgAEmail,
        password: defaultPassword,
        organizationName: `Org Alpha Corp ${timestamp}`,
      });
    expect(regA.status).toBe(201);
    orgAToken = regA.body.data.accessToken;
    userA1Id = regA.body.data.user.id;
    expect(userA1Id).toBeDefined();
    orgAId = regA.body.data.defaultOrganization.id;

    // 2. Register Member A2 (Assigned only to Project Alpha)
    const regA2 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Member Bob Alpha',
        email: memberA2Email,
        password: defaultPassword,
        organizationName: `Bob Workspace ${timestamp}`,
      });
    memberA2Token = regA2.body.data.accessToken;
    memberA2Id = regA2.body.data.user.id;

    // Add Bob to Org A
    await request(app)
      .post(`/api/v1/organizations/${orgAId}/members`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        email: memberA2Email,
        role: 'MEMBER',
      });

    // 3. Register Member A3 (Assigned only to Project Beta)
    const regA3 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Member Charlie Beta',
        email: memberA3Email,
        password: defaultPassword,
        organizationName: `Charlie Workspace ${timestamp}`,
      });
    memberA3Token = regA3.body.data.accessToken;
    memberA3Id = regA3.body.data.user.id;

    // Add Charlie to Org A
    await request(app)
      .post(`/api/v1/organizations/${orgAId}/members`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        email: memberA3Email,
        role: 'MEMBER',
      });

    // 4. Register Org B Owner (Foreign Tenant)
    const regB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Owner Eve Foreign',
        email: orgBEmail,
        password: defaultPassword,
        organizationName: `Org Beta Ltd ${timestamp}`,
      });
    orgBToken = regB.body.data.accessToken;
    orgBId = regB.body.data.defaultOrganization.id;

    // 5. Create Project Alpha in Org A
    const projAlphaRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        name: 'Alpha Platform Redesign',
        key: 'ALPHA',
        description: 'Core microservices overhaul and design system upgrade',
      });
    expect(projAlphaRes.status).toBe(201);
    projectAlphaId = projAlphaRes.body.data.id;

    // Add Member Bob (A2) to Project Alpha
    await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${projectAlphaId}/members`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        userId: memberA2Id,
        role: 'MEMBER',
      });

    // 6. Create Project Beta in Org A
    const projBetaRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        name: 'Beta Cloud Infrastructure',
        key: 'BETA',
        description: 'Kubernetes orchestration and multi-region failover pipeline',
      });
    expect(projBetaRes.status).toBe(201);
    projectBetaId = projBetaRes.body.data.id;

    // Add Member Charlie (A3) to Project Beta
    await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${projectBetaId}/members`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        userId: memberA3Id,
        role: 'MEMBER',
      });

    // 7. Create Identically Named Project in Org B (Strict Isolation Test)
    const projForeignRes = await request(app)
      .post(`/api/v1/organizations/${orgBId}/projects`)
      .set('Authorization', `Bearer ${orgBToken}`)
      .send({
        name: 'Alpha Platform Redesign', // Same name as Org A
        key: 'FALPH',
        description: 'Foreign tenant secret duplicate project',
      });
    expect(projForeignRes.status).toBe(201);
    projectForeignId = projForeignRes.body.data.id;

    // 8. Create Milestones in Project Alpha
    const msAlphaRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${projectAlphaId}/milestones`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Alpha Q4 Release Milestone',
        description: 'Complete core microservices migration',
      });
    milestoneAlphaId = msAlphaRes.body.data.id;

    // Milestone in Project Beta
    const msBetaRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${projectBetaId}/milestones`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Beta Kubernetes Cluster Launch',
        description: 'Production traffic cutover',
      });
    milestoneBetaId = msBetaRes.body.data.id;

    // Milestone in Org B Project (Foreign)
    const msForeignRes = await request(app)
      .post(`/api/v1/organizations/${orgBId}/projects/${projectForeignId}/milestones`)
      .set('Authorization', `Bearer ${orgBToken}`)
      .send({
        title: 'Alpha Q4 Release Milestone', // Same title as Org A
        description: 'Foreign secret milestone',
      });
    milestoneForeignId = msForeignRes.body.data.id;

    // 9. Create Tasks in Project Alpha
    const tAlpha1Res = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${projectAlphaId}/tasks`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Implement OAuth Authentication Gateway',
        description: 'Supports JWT token rotation and session revocation',
        priority: 'HIGH',
        assigneeId: memberA2Id,
      });
    taskAlpha1Id = tAlpha1Res.body.data.id;

    const tAlpha2Res = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${projectAlphaId}/tasks`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Dashboard Performance Profiling',
        description: 'Optimize React rendering loops and TanStack queries',
        priority: 'MEDIUM',
      });
    taskAlpha2Id = tAlpha2Res.body.data.id;

    // Archived Task in Project Alpha
    const tArchivedRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${projectAlphaId}/tasks`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Archived Alpha Legacy Task',
        description: 'Should never appear in global search results',
      });
    taskArchivedId = tArchivedRes.body.data.id;
    await request(app)
      .post(
        `/api/v1/organizations/${orgAId}/projects/${projectAlphaId}/tasks/${taskArchivedId}/archive`
      )
      .set('Authorization', `Bearer ${orgAToken}`);

    // Task in Project Beta
    const tBeta1Res = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${projectBetaId}/tasks`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Kubernetes Ingress Controller Setup',
        description: 'Configure Traefik and SSL certificates',
        priority: 'URGENT',
      });
    taskBeta1Id = tBeta1Res.body.data.id;

    // Task in Foreign Org B
    const tForeignRes = await request(app)
      .post(`/api/v1/organizations/${orgBId}/projects/${projectForeignId}/tasks`)
      .set('Authorization', `Bearer ${orgBToken}`)
      .send({
        title: 'Implement OAuth Authentication Gateway', // Identical title to Org A
        description: 'Foreign confidential authentication gateway',
        priority: 'HIGH',
      });
    taskForeignId = tForeignRes.body.data.id;

    // 10. Create Label in Project Alpha
    const labelRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${projectAlphaId}/labels`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        name: 'Security Bug',
        color: 'rose',
        description: 'High risk security vulnerability',
      });
    expect(labelRes.status).toBe(201);
    labelAlphaId = labelRes.body.data.id;
  });

  // ==========================================================
  // SECTION 1: Authentication, Authorization & Validation
  // ==========================================================
  describe('1. Authentication & Query Validation', () => {
    it('should reject unauthenticated search requests with 401', async () => {
      const res = await request(app).get('/api/v1/search?q=alpha');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject requests missing organization context with 400', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=alpha')
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject user attempting to search an organization they do not belong to with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/search?q=alpha&organizationId=${orgBId}`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject queries shorter than 2 characters with 400', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=a')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('at least 2 characters');
    });

    it('should reject queries that are only whitespace with 400', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=%20%20%20')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject queries exceeding 100 characters with 400', async () => {
      const longQuery = 'x'.repeat(101);
      const res = await request(app)
        .get(`/api/v1/search?q=${longQuery}`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('cannot exceed 100 characters');
    });

    it('should reject invalid entity type filters with 400', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=alpha&type=invalid_type')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should accept valid search query via x-organization-id header', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=alpha')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.query).toBe('alpha');
      expect(Array.isArray(res.body.data.results)).toBe(true);
    });

    it('should accept valid search query via organizationId query parameter', async () => {
      const res = await request(app)
        .get(`/api/v1/search?q=alpha&organizationId=${orgAId}`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should accept valid search query via nested organization route (/api/v1/organizations/:id/search)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/search?q=alpha`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================
  // SECTION 2: Multi-Tenant Isolation
  // ==========================================================
  describe('2. Multi-Tenant Security & Tenant Isolation', () => {
    it('should NEVER return projects, tasks, or milestones from foreign organization', async () => {
      // User A searches for "OAuth" (present in both Org A and Org B)
      const resA = await request(app)
        .get('/api/v1/search?q=OAuth')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(resA.status).toBe(200);

      // Must find task in Org A
      const taskA = resA.body.data.results.find(
        (r: any) => r.type === 'task' && r.id === taskAlpha1Id
      );
      expect(taskA).toBeDefined();

      // Must NEVER contain task or milestone from Org B
      const taskForeign = resA.body.data.results.find((r: any) => r.id === taskForeignId);
      expect(taskForeign).toBeUndefined();

      const msForeign = resA.body.data.results.find((r: any) => r.id === milestoneForeignId);
      expect(msForeign).toBeUndefined();

      // Check all returned projects belong to Org A
      const projects = resA.body.data.results.filter((r: any) => r.type === 'project');
      for (const p of projects) {
        expect(p.id).not.toBe(projectForeignId);
      }
    });

    it('should search foreign organization from User B and never leak Org A entities', async () => {
      const resB = await request(app)
        .get('/api/v1/search?q=OAuth')
        .set('Authorization', `Bearer ${orgBToken}`)
        .set('x-organization-id', orgBId);
      expect(resB.status).toBe(200);

      // Must find task in Org B
      const taskB = resB.body.data.results.find(
        (r: any) => r.type === 'task' && r.id === taskForeignId
      );
      expect(taskB).toBeDefined();

      // Must NEVER contain task from Org A
      const taskA = resB.body.data.results.find((r: any) => r.id === taskAlpha1Id);
      expect(taskA).toBeUndefined();
    });

    it('should not leak users/members across organizations', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=Owner&type=user')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);

      const users = res.body.data.results;
      expect(users.some((u: any) => u.title === 'Owner Alice')).toBe(true);
      expect(users.some((u: any) => u.title === 'Owner Eve Foreign')).toBe(false);
    });
  });

  // ==========================================================
  // SECTION 3: Project Boundary & Role-Based Access Scoping
  // ==========================================================
  describe('3. Project Boundary & RBAC Scoping', () => {
    it('organization OWNER should search across all projects in the organization', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=Kubernetes')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);

      // Project Beta task found
      const task = res.body.data.results.find((r: any) => r.id === taskBeta1Id);
      expect(task).toBeDefined();

      // Project Beta milestone found
      const milestone = res.body.data.results.find((r: any) => r.id === milestoneBetaId);
      expect(milestone).toBeDefined();
    });

    it('regular MEMBER (Bob) should ONLY search projects and tasks they are explicitly assigned to', async () => {
      // Bob is only a member of Project Alpha, NOT Project Beta
      const res = await request(app)
        .get('/api/v1/search?q=Kubernetes')
        .set('Authorization', `Bearer ${memberA2Token}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);

      // Must NOT see Project Beta's tasks or milestones
      const taskBeta = res.body.data.results.find((r: any) => r.id === taskBeta1Id);
      expect(taskBeta).toBeUndefined();

      const milestoneBeta = res.body.data.results.find((r: any) => r.id === milestoneBetaId);
      expect(milestoneBeta).toBeUndefined();

      const projectBeta = res.body.data.results.find((r: any) => r.id === projectBetaId);
      expect(projectBeta).toBeUndefined();
    });

    it('regular MEMBER (Charlie) should ONLY see Project Beta, not Project Alpha', async () => {
      // Charlie is only in Project Beta
      const res = await request(app)
        .get('/api/v1/search?q=OAuth')
        .set('Authorization', `Bearer ${memberA3Token}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);

      // Must NOT see Project Alpha's task
      const taskAlpha = res.body.data.results.find((r: any) => r.id === taskAlpha1Id);
      expect(taskAlpha).toBeUndefined();
    });

    it('scoping search to specific accessible projectId should work', async () => {
      const res = await request(app)
        .get(`/api/v1/search?q=Alpha&projectId=${projectAlphaId}`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);

      for (const item of res.body.data.results) {
        if (item.metadata.projectId) {
          expect(item.metadata.projectId).toBe(projectAlphaId);
        }
      }
    });

    it('scoping search to an inaccessible projectId should return 0 results securely', async () => {
      // Bob tries to scope search to Project Beta (inaccessible to him)
      const res = await request(app)
        .get(`/api/v1/search?q=Kubernetes&projectId=${projectBetaId}`)
        .set('Authorization', `Bearer ${memberA2Token}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(0);
      expect(res.body.data.results).toHaveLength(0);
    });
  });

  // ==========================================================
  // SECTION 4: Entity Type Filtering
  // ==========================================================
  describe('4. Entity Type Filtering', () => {
    it('type=project should return only projects', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=Alpha&type=project')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);
      expect(res.body.data.results.length).toBeGreaterThan(0);
      for (const item of res.body.data.results) {
        expect(item.type).toBe('project');
      }
    });

    it('type=task should return only tasks', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=Profiling&type=task')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);
      expect(res.body.data.results.length).toBeGreaterThan(0);
      const foundTask = res.body.data.results.find((r: any) => r.id === taskAlpha2Id);
      expect(foundTask).toBeDefined();
      for (const item of res.body.data.results) {
        expect(item.type).toBe('task');
      }
    });

    it('type=milestone should return only milestones', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=Release&type=milestone')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);
      expect(res.body.data.results.length).toBeGreaterThan(0);
      const foundMs = res.body.data.results.find((r: any) => r.id === milestoneAlphaId);
      expect(foundMs).toBeDefined();
      for (const item of res.body.data.results) {
        expect(item.type).toBe('milestone');
      }
    });

    it('type=user should return only users', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=Bob&type=user')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);
      expect(res.body.data.results.length).toBeGreaterThan(0);
      for (const item of res.body.data.results) {
        expect(item.type).toBe('user');
      }
    });

    it('type=label should return only labels', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=Security&type=label')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);
      expect(res.body.data.results.length).toBeGreaterThan(0);
      const foundLabel = res.body.data.results.find((r: any) => r.id === labelAlphaId);
      expect(foundLabel).toBeDefined();
      for (const item of res.body.data.results) {
        expect(item.type).toBe('label');
      }
    });

    it('type=all should return results across multiple categories', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=Alpha&type=all')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);
      const types = new Set(res.body.data.results.map((r: any) => r.type));
      expect(types.has('project')).toBe(true);
      expect(types.has('milestone')).toBe(true);
    });
  });

  // ==========================================================
  // SECTION 5: Deterministic Ranking
  // ==========================================================
  describe('5. Deterministic Ranking & Scoring', () => {
    it('exact issue key match should receive highest rank (score 100)', async () => {
      // First get task issue key
      const taskRes = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${projectAlphaId}/tasks/${taskAlpha1Id}`)
        .set('Authorization', `Bearer ${orgAToken}`);
      const issueKey = taskRes.body.data.issueKey;
      expect(issueKey).toBeDefined();

      const res = await request(app)
        .get(`/api/v1/search?q=${issueKey}`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);

      const topResult = res.body.data.results[0];
      expect(topResult.id).toBe(taskAlpha1Id);
      expect(topResult.score).toBe(100);
    });

    it('exact project key match should receive near-top rank (score 98)', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=ALPHA')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);

      const projectMatch = res.body.data.results.find(
        (r: any) => r.type === 'project' && r.id === projectAlphaId
      );
      expect(projectMatch).toBeDefined();
      expect(projectMatch.score).toBe(98);
    });

    it('exact user email match should score 95', async () => {
      const res = await request(app)
        .get(`/api/v1/search?q=${memberA2Email}&type=user`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);

      const userMatch = res.body.data.results[0];
      expect(userMatch.id).toBe(memberA2Id);
      expect(userMatch.score).toBe(95);
    });

    it('results should be sorted strictly by score descending', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=Alpha')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);

      const scores = res.body.data.results.map((r: any) => r.score);
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }
    });
  });

  // ==========================================================
  // SECTION 6: Edge Cases, Special Characters & Archived Filtering
  // ==========================================================
  describe('6. Edge Cases, Special Characters & Archived Filtering', () => {
    it('should safely handle special SQL characters (% and _)', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=%25test_')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should safely handle quotes and apostrophes in search term', async () => {
      const res = await request(app)
        .get("/api/v1/search?q=OAuth's%20gateway")
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should be case-insensitive for search queries', async () => {
      const resUpper = await request(app)
        .get('/api/v1/search?q=AUTHENTICATION')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);

      const resLower = await request(app)
        .get('/api/v1/search?q=authentication')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);

      expect(resUpper.status).toBe(200);
      expect(resLower.status).toBe(200);
      expect(resUpper.body.data.results.length).toEqual(resLower.body.data.results.length);
    });

    it('should EXCLUDE archived tasks from search results', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=Legacy')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);

      const archivedTask = res.body.data.results.find((r: any) => r.id === taskArchivedId);
      expect(archivedTask).toBeUndefined();
    });

    it('should respect custom limit parameter and indicate hasMore', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=Alpha&limit=2')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);
      expect(res.body.data.results.length).toBeLessThanOrEqual(2);
      if (res.body.data.total > 2) {
        expect(res.body.data.hasMore).toBe(true);
      }
    });

    it('should provide complete navigation URLs in result DTOs', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=OAuth&type=task')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);

      const task = res.body.data.results[0];
      expect(task.url).toBe(`/projects/${projectAlphaId}/tasks/${taskAlpha1Id}`);
      expect(task.metadata.projectId).toBe(projectAlphaId);
      expect(task.metadata.projectName).toBe('Alpha Platform Redesign');
      expect(task.metadata.status).toBe('TODO');
      expect(task.metadata.priority).toBe('HIGH');
    });

    it('should return accurate entity breakdown counts', async () => {
      const res = await request(app)
        .get('/api/v1/search?q=Alpha')
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('x-organization-id', orgAId);
      expect(res.status).toBe(200);
      expect(res.body.data.counts).toHaveProperty('projects');
      expect(res.body.data.counts).toHaveProperty('tasks');
      expect(res.body.data.counts).toHaveProperty('milestones');
      expect(res.body.data.counts).toHaveProperty('users');
      expect(res.body.data.counts).toHaveProperty('labels');
    });
  });
});
