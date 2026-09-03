import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createServer } from '../server.js';

describe('TaskFlow PR 14: Project Dashboard 2.0, Project Health & Delivery Insights', () => {
  const app = createServer();
  const defaultPassword = 'Password123!';
  const timestamp = Date.now();

  // Organization A (Primary Tenant)
  const orgAEmail = `dash_owner_a_${timestamp}@taskflow.io`;
  const memberAdminEmail = `dash_admin_a_${timestamp}@taskflow.io`;
  const memberRegularEmail = `dash_member_a_${timestamp}@taskflow.io`;
  const memberViewerEmail = `dash_viewer_a_${timestamp}@taskflow.io`;
  const memberNonProjectEmail = `dash_nonmember_a_${timestamp}@taskflow.io`;

  let orgAToken: string;
  let orgAId: string;

  let adminToken: string;
  let adminId: string;

  let memberToken: string;
  let memberId: string;

  let viewerToken: string;
  let viewerId: string;

  let nonProjectToken: string;

  // Organization B (Foreign Tenant)
  const orgBEmail = `dash_owner_b_${timestamp}@taskflow.io`;
  let orgBToken: string;
  let orgBId: string;
  let foreignProjectId: string;

  // Projects in Org A
  let activeProjectId: string;
  let emptyProjectId: string;
  let allCancelledProjectId: string;

  // Tasks in Active Project
  let urgentOverdueTaskId: string;
  let regularOverdueTaskId: string;
  let normalTodoTaskId: string;
  let inProgressTaskId: string;
  let inReviewTaskId: string;
  let predecessorTaskId: string;
  let blockedTaskId: string;
  let resolvedPredecessorId: string;
  let unblockedTaskId: string;
  let doneTask1Id: string;
  let doneTask2Id: string;
  let cancelledTaskId: string;

  // Milestones in Active Project
  let overdueMilestoneId: string;
  let atRiskMilestoneId: string;
  let onTrackMilestoneId: string;
  let completedMilestoneId: string;

  beforeAll(async () => {
    // 1. Register Org A Owner
    const regA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Owner Alice',
        email: orgAEmail,
        password: defaultPassword,
        organizationName: `Dash Corp ${timestamp}`,
      });
    expect(regA.status).toBe(201);
    orgAToken = regA.body.data.accessToken;
    orgAId = regA.body.data.defaultOrganization.id;

    // 2. Register Org A Admin
    const regAdmin = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Admin Bob',
        email: memberAdminEmail,
        password: defaultPassword,
        organizationName: `Admin Space ${timestamp}`,
      });
    adminToken = regAdmin.body.data.accessToken;
    adminId = regAdmin.body.data.user.id;
    await request(app)
      .post(`/api/v1/organizations/${orgAId}/members`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ email: memberAdminEmail, role: 'ADMIN' });

    // 3. Register Org A Regular Member
    const regMember = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Member Charlie',
        email: memberRegularEmail,
        password: defaultPassword,
        organizationName: `Member Space ${timestamp}`,
      });
    memberToken = regMember.body.data.accessToken;
    memberId = regMember.body.data.user.id;
    await request(app)
      .post(`/api/v1/organizations/${orgAId}/members`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ email: memberRegularEmail, role: 'MEMBER' });

    // 4. Register Org A Viewer
    const regViewer = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Viewer Dave',
        email: memberViewerEmail,
        password: defaultPassword,
        organizationName: `Viewer Space ${timestamp}`,
      });
    viewerToken = regViewer.body.data.accessToken;
    viewerId = regViewer.body.data.user.id;
    await request(app)
      .post(`/api/v1/organizations/${orgAId}/members`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ email: memberViewerEmail, role: 'MEMBER' });

    // 5. Register Org A Non-Project Member (In org, but not in active project)
    const regNonMember = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'NonMember Eve',
        email: memberNonProjectEmail,
        password: defaultPassword,
        organizationName: `NonMember Space ${timestamp}`,
      });
    nonProjectToken = regNonMember.body.data.accessToken;
    await request(app)
      .post(`/api/v1/organizations/${orgAId}/members`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ email: memberNonProjectEmail, role: 'MEMBER' });

    // 6. Register Org B Owner (Foreign Tenant)
    const regB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Foreign Owner Frank',
        email: orgBEmail,
        password: defaultPassword,
        organizationName: `Foreign Corp ${timestamp}`,
      });
    orgBToken = regB.body.data.accessToken;
    orgBId = regB.body.data.defaultOrganization.id;

    // Create Project in Org B
    const projBRes = await request(app)
      .post(`/api/v1/organizations/${orgBId}/projects`)
      .set('Authorization', `Bearer ${orgBToken}`)
      .send({
        name: 'Foreign Secret Project',
        key: 'FSEC',
        description: 'Should never leak to Org A',
      });
    foreignProjectId = projBRes.body.data.id;

    // 7. Create Primary Active Project in Org A
    const projRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        name: 'TaskFlow Operations Overhaul',
        key: 'OPS',
        description: 'Mission-critical cloud orchestration and dashboard intelligence',
      });
    expect(projRes.status).toBe(201);
    activeProjectId = projRes.body.data.id;

    // Add project memberships
    await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/members`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ userId: adminId, role: 'ADMIN' });

    await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/members`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ userId: memberId, role: 'MEMBER' });

    await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/members`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ userId: viewerId, role: 'VIEWER' });

    // 8. Create Empty Project (for NO_DATA testing)
    const emptyProjRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        name: 'Brand New Clean Slate Project',
        key: 'CLEAN',
        description: 'Zero tasks and zero milestones',
      });
    emptyProjectId = emptyProjRes.body.data.id;

    // 9. Create Project for All-Cancelled Tasks Testing
    const cancelledProjRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        name: 'Deprecated Legacy Project',
        key: 'DEP',
      });
    allCancelledProjectId = cancelledProjRes.body.data.id;

    const cancTaskRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${allCancelledProjectId}/tasks`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ title: 'Obsolete Task 1' });
    await request(app)
      .patch(
        `/api/v1/organizations/${orgAId}/projects/${allCancelledProjectId}/tasks/${cancTaskRes.body.data.id}`
      )
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ status: 'CANCELLED' });

    // 10. Seed Milestones in Active Project
    const now = new Date();
    const pastDate = new Date(now.getTime() - 5 * 86400000); // 5 days ago
    const soonDate = new Date(now.getTime() + 2 * 86400000); // 2 days from now (within 3 days)
    const futureDate = new Date(now.getTime() + 30 * 86400000); // 30 days from now

    // Overdue Milestone
    const msOverdueRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/milestones`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Q1 Core Infrastructure Cutover',
        dueDate: pastDate.toISOString(),
      });
    overdueMilestoneId = msOverdueRes.body.data.id;

    // At-Risk Milestone (due in 2 days, < 75% progress)
    const msAtRiskRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/milestones`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Beta Customer Sandbox Deployment',
        dueDate: soonDate.toISOString(),
      });
    atRiskMilestoneId = msAtRiskRes.body.data.id;

    // On-Track Milestone
    const msOnTrackRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/milestones`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'General Availability Launch',
        dueDate: futureDate.toISOString(),
      });
    onTrackMilestoneId = msOnTrackRes.body.data.id;

    // Completed Milestone
    const msCompRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/milestones`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Architecture Blueprint Review',
        dueDate: pastDate.toISOString(),
      });
    completedMilestoneId = msCompRes.body.data.id;
    await request(app)
      .patch(
        `/api/v1/organizations/${orgAId}/projects/${activeProjectId}/milestones/${completedMilestoneId}`
      )
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ status: 'COMPLETED' });

    // 11. Seed Tasks in Active Project
    // 11.1 Urgent Overdue Task
    const tUOverdueRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Fix High-Severity Auth Vulnerability',
        priority: 'URGENT',
        dueDate: pastDate.toISOString(),
        assigneeId: memberId,
        milestoneId: overdueMilestoneId,
      });
    urgentOverdueTaskId = tUOverdueRes.body.data.id;

    // 11.2 Regular Overdue Task
    const tROverdueRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Update Kubernetes Cluster Docs',
        priority: 'MEDIUM',
        dueDate: pastDate.toISOString(),
      });
    regularOverdueTaskId = tROverdueRes.body.data.id;

    // 11.3 Normal Todo Task
    const tTodoRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Implement Dark Mode Contrast Adjustments',
        priority: 'LOW',
        milestoneId: atRiskMilestoneId,
      });
    normalTodoTaskId = tTodoRes.body.data.id;

    // 11.4 In Progress Task
    const tProgRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Refactor TanStack Query Invalidation Pipelines',
        priority: 'HIGH',
      });
    inProgressTaskId = tProgRes.body.data.id;
    await request(app)
      .patch(
        `/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks/${inProgressTaskId}`
      )
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ status: 'IN_PROGRESS' });

    // 11.5 In Review Task
    const tRevRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Audit Postgres Index Utilization',
        priority: 'MEDIUM',
      });
    inReviewTaskId = tRevRes.body.data.id;
    await request(app)
      .patch(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks/${inReviewTaskId}`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ status: 'IN_REVIEW' });

    // 11.6 Dependency Predecessor (In Progress, NOT DONE)
    const tPredRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Configure Ingress Load Balancer DNS',
        priority: 'HIGH',
      });
    predecessorTaskId = tPredRes.body.data.id;
    await request(app)
      .patch(
        `/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks/${predecessorTaskId}`
      )
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ status: 'IN_PROGRESS' });

    // 11.7 Blocked Task (status = TODO, blocked by predecessorTaskId)
    const tBlockedRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Provision Production SSL Certificates',
        priority: 'HIGH',
      });
    blockedTaskId = tBlockedRes.body.data.id;

    // Add BLOCKS dependency: predecessorTaskId BLOCKS blockedTaskId
    const dep1Res = await request(app)
      .post(
        `/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks/${predecessorTaskId}/dependencies`
      )
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        targetTaskId: blockedTaskId,
        type: 'BLOCKS',
      });
    expect(dep1Res.status).toBe(201);

    // 11.8 Resolved Predecessor (status = DONE)
    const tResPredRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Setup Redis Sentinel Cluster',
        priority: 'MEDIUM',
      });
    resolvedPredecessorId = tResPredRes.body.data.id;
    await request(app)
      .patch(
        `/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks/${resolvedPredecessorId}`
      )
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ status: 'DONE' });

    // 11.9 Unblocked Task (predecessor is DONE -> not blocked!)
    const tUnblockedRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Enable Cache Warming Service',
        priority: 'LOW',
      });
    unblockedTaskId = tUnblockedRes.body.data.id;
    const dep2Res = await request(app)
      .post(
        `/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks/${resolvedPredecessorId}/dependencies`
      )
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        targetTaskId: unblockedTaskId,
        type: 'BLOCKS',
      });
    expect(dep2Res.status).toBe(201);

    // 11.10 Done Task 1
    const tDone1Res = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Initial Monorepo Setup & Lint Standards',
        priority: 'MEDIUM',
      });
    doneTask1Id = tDone1Res.body.data.id;
    await request(app)
      .patch(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks/${doneTask1Id}`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ status: 'DONE' });

    // 11.11 Done Task 2
    const tDone2Res = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Prisma Postgres Schema Migration',
        priority: 'HIGH',
      });
    doneTask2Id = tDone2Res.body.data.id;
    await request(app)
      .patch(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks/${doneTask2Id}`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ status: 'DONE' });

    // 11.12 Cancelled Task
    const tCancRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        title: 'Legacy SOAP Endpoint Integration',
        priority: 'NONE',
      });
    cancelledTaskId = tCancRes.body.data.id;
    await request(app)
      .patch(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks/${cancelledTaskId}`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ status: 'CANCELLED' });
  });

  // =========================================================================
  // SECTION 1: AUTHENTICATION & MULTI-TENANT ACCESS
  // =========================================================================
  describe('1. Authentication, Tenant Boundaries & RBAC', () => {
    it('1. should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get(
        `/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`
      );
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('2. should reject user attempting to access foreign organization project with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgBId}/projects/${foreignProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('3. should reject non-existent project with 404', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${fakeUuid}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('4. should reject project belonging to different organization with 404', async () => {
      // Trying to query Org B's project under Org A's route
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${foreignProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('5. should reject organization member who is NOT in the project with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${nonProjectToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('6. should allow Project VIEWER to access dashboard', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project.userRole).toBe('VIEWER');
    });

    it('7. should allow Project MEMBER to access dashboard', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project.userRole).toBe('MEMBER');
    });

    it('8. should allow Project ADMIN to access dashboard', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project.userRole).toBe('ADMIN');
    });

    it('9. should allow Organization OWNER to access dashboard across all org projects', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project.id).toBe(activeProjectId);
    });

    it('10. should reject invalid UUID parameters with 400 validation error', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/invalid-project-id/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // SECTION 2: METRICS & CANONICAL COMPLETION
  // =========================================================================
  describe('2. Key Project Metrics & Canonical Completion', () => {
    it('11. should accurately calculate total tasks count', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      // We seeded 12 tasks in active project
      expect(res.body.data.metrics.totalTasks).toBe(12);
    });

    it('12. should accurately calculate completed tasks count (DONE)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      // doneTask1, doneTask2, resolvedPredecessor = 3 DONE tasks
      expect(res.body.data.metrics.completedTasks).toBe(3);
    });

    it('13. should accurately calculate in-progress tasks count (IN_PROGRESS + IN_REVIEW)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      // inProgressTaskId, predecessorTaskId (IN_PROGRESS) + inReviewTaskId (IN_REVIEW) = 3
      expect(res.body.data.metrics.inProgressTasks).toBe(3);
    });

    it('14. should accurately calculate overdue tasks count', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      // urgentOverdueTaskId + regularOverdueTaskId = 2
      expect(res.body.data.metrics.overdueTasks).toBe(2);
      expect(res.body.data.overdueTasks).toHaveLength(2);
      expect(res.body.data.overdueTasks.some((t: any) => t.id === regularOverdueTaskId)).toBe(true);
    });

    it('15. should accurately calculate blocked tasks count', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      // blockedTaskId has active predecessorTaskId in IN_PROGRESS -> 1 blocked task
      // unblockedTaskId has predecessor resolvedPredecessor in DONE -> NOT blocked
      expect(res.body.data.metrics.blockedTasks).toBe(1);
      expect(res.body.data.blockedTasks).toHaveLength(1);
      expect(res.body.data.blockedTasks[0].id).toBe(blockedTaskId);
    });

    it('16. should calculate canonical completion percentage excluding cancelled tasks', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      // Total tasks = 12, Cancelled = 1 -> Denominator = 11. Done = 3 -> 3 / 11 = 27%
      expect(res.body.data.metrics.completionPercentage).toBe(27);
    });

    it('17. should handle clean slate zero-task project without division by zero or NaN', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${emptyProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.metrics.totalTasks).toBe(0);
      expect(res.body.data.metrics.completedTasks).toBe(0);
      expect(res.body.data.metrics.completionPercentage).toBe(0);
      expect(Number.isNaN(res.body.data.metrics.completionPercentage)).toBe(false);
    });

    it('18. should handle all-cancelled project without division by zero or NaN', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${allCancelledProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.metrics.totalTasks).toBe(1);
      expect(res.body.data.taskDistribution.CANCELLED).toBe(1);
      expect(res.body.data.metrics.completionPercentage).toBe(0);
      expect(Number.isNaN(res.body.data.metrics.completionPercentage)).toBe(false);
    });
  });

  // =========================================================================
  // SECTION 3: PROJECT HEALTH ENGINE & DETERMINISTIC REASONS
  // =========================================================================
  describe('3. Deterministic Project Health & Executive Summary', () => {
    it('19. should return NO_DATA state when project has 0 tasks and 0 milestones', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${emptyProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.health.state).toBe('NO_DATA');
      expect(res.body.data.health.reasons[0]).toContain('No active task or milestone data');
      expect(res.body.data.health.executiveSummary).toContain('No tasks or milestones logged yet');
    });

    it('20. should return AT_RISK or CRITICAL state based on active overdue tasks and milestones', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      // Active project has 1 urgent overdue task, 1 regular overdue task, 1 overdue milestone -> AT_RISK or CRITICAL
      expect(['AT_RISK', 'CRITICAL']).toContain(res.body.data.health.state);
      expect(res.body.data.health.score).toBeLessThan(100);
      expect(res.body.data.health.score).toBeGreaterThanOrEqual(0);
    });

    it('21. should provide explainable, human-readable reasons in health summary', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      const reasons = res.body.data.health.reasons;
      expect(Array.isArray(reasons)).toBe(true);
      expect(reasons.some((r: string) => r.includes('overdue'))).toBe(true);
      expect(reasons.some((r: string) => r.includes('blocker'))).toBe(true);
    });

    it('22. should return HEALTHY state when all deliverables are on track', async () => {
      // Create a fresh project with 2 DONE tasks
      const hProj = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .send({ name: 'Healthy Project Showcase', key: 'HLTH' });
      const hProjId = hProj.body.data.id;

      const t1 = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects/${hProjId}/tasks`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .send({ title: 'Completed First Feature' });
      await request(app)
        .patch(`/api/v1/organizations/${orgAId}/projects/${hProjId}/tasks/${t1.body.data.id}`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .send({ status: 'DONE' });

      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${hProjId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.health.state).toBe('HEALTHY');
      expect(res.body.data.health.score).toBe(100);
      expect(res.body.data.health.executiveSummary).toContain('healthy');
    });

    it('23. should accurately populate signals breakdown', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      const signals = res.body.data.health.signals;
      expect(signals.overdueTasks).toBe(2);
      expect(signals.urgentOverdueTasks).toBe(1);
      expect(signals.blockedTasks).toBe(1);
      expect(signals.atRiskMilestones).toBe(1);
      expect(signals.overdueMilestones).toBe(1);
    });
  });

  // =========================================================================
  // SECTION 4: DEPENDENCIES & DYNAMIC BLOCKERS
  // =========================================================================
  describe('4. Dependencies & Dynamic Blocker Derivation', () => {
    it('24. should dynamically compute isBlocked = true without mutating TaskStatus', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);

      const blockedItem = res.body.data.blockedTasks.find((t: any) => t.id === blockedTaskId);
      expect(blockedItem).toBeDefined();
      expect(blockedItem.isBlocked).toBe(true);
      // Status remains original (TODO)
      expect(blockedItem.status).toBe('TODO');
      expect(blockedItem.blockingDependencies.length).toBeGreaterThan(0);
      expect(blockedItem.blockingDependencies[0].id).toBe(predecessorTaskId);
    });

    it('25. should NOT mark task as blocked when predecessor is DONE', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);

      const unblockedItem = res.body.data.blockedTasks.find((t: any) => t.id === unblockedTaskId);
      expect(unblockedItem).toBeUndefined();
    });

    it('26. resolving predecessor should immediately update blocked count on next fetch', async () => {
      // Mark predecessorTaskId as DONE
      await request(app)
        .patch(
          `/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks/${predecessorTaskId}`
        )
        .set('Authorization', `Bearer ${orgAToken}`)
        .send({ status: 'DONE' });

      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);

      // Now blockedTasks count should be 0!
      expect(res.body.data.metrics.blockedTasks).toBe(0);
      expect(res.body.data.blockedTasks).toHaveLength(0);

      // Restore predecessorTaskId to IN_PROGRESS for remaining tests
      await request(app)
        .patch(
          `/api/v1/organizations/${orgAId}/projects/${activeProjectId}/tasks/${predecessorTaskId}`
        )
        .set('Authorization', `Bearer ${orgAToken}`)
        .send({ status: 'IN_PROGRESS' });
    });
  });

  // =========================================================================
  // SECTION 5: MILESTONE HEALTH INTEGRATION
  // =========================================================================
  describe('5. Milestone Health Integration', () => {
    it('27. should include all project milestones in dashboard', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.milestones.length).toBe(4);
      expect(res.body.data.milestones.some((m: any) => m.id === onTrackMilestoneId)).toBe(true);
    });

    it('28. should reuse canonical milestone health computation for OVERDUE milestone', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);

      const ms = res.body.data.milestones.find((m: any) => m.id === overdueMilestoneId);
      expect(ms).toBeDefined();
      expect(ms.health).toBe('OVERDUE');
    });

    it('29. should reuse canonical milestone health computation for AT_RISK milestone', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);

      const ms = res.body.data.milestones.find((m: any) => m.id === atRiskMilestoneId);
      expect(ms).toBeDefined();
      expect(ms.health).toBe('AT_RISK');
    });

    it('30. should reuse canonical milestone health computation for COMPLETED milestone', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);

      const ms = res.body.data.milestones.find((m: any) => m.id === completedMilestoneId);
      expect(ms).toBeDefined();
      expect(ms.health).toBe('COMPLETED');
      expect(ms.status).toBe('COMPLETED');
    });
  });

  // =========================================================================
  // SECTION 6: DELIVERY RISK ENGINE
  // =========================================================================
  describe('6. Delivery Risk Engine & Deduplication', () => {
    it('31. should generate actionable delivery risks', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.risks.length).toBeGreaterThan(0);
    });

    it('32. should order risks deterministically by severity (CRITICAL > HIGH > MEDIUM > LOW)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);

      const severities = res.body.data.risks.map((r: any) => r.severity as string);
      const weight: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      for (let i = 0; i < severities.length - 1; i++) {
        const currentWeight = weight[severities[i]] ?? 0;
        const nextWeight = weight[severities[i + 1]] ?? 0;
        expect(currentWeight).toBeGreaterThanOrEqual(nextWeight);
      }
    });

    it('33. should include affected entity and action label for risk navigation', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);

      const criticalRisk = res.body.data.risks.find((r: any) => r.severity === 'CRITICAL');
      expect(criticalRisk).toBeDefined();
      expect(criticalRisk.actionLabel).toBeDefined();
      expect(['task', 'milestone', 'dependency']).toContain(criticalRisk.entityType);
    });

    it('34. should deduplicate standard overdue risk if task is already flagged under urgent overdue', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);

      const urgentRisks = res.body.data.risks.filter(
        (r: any) => r.type === 'URGENT_OVERDUE_WORK' && r.entityId === urgentOverdueTaskId
      );
      const standardRisks = res.body.data.risks.filter(
        (r: any) => r.type === 'OVERDUE_WORK' && r.entityId === urgentOverdueTaskId
      );

      expect(urgentRisks.length).toBe(1);
      expect(standardRisks.length).toBe(0); // Deduplicated!
    });
  });

  // =========================================================================
  // SECTION 7: WORK DISTRIBUTIONS & RECENT ACTIVITY
  // =========================================================================
  describe('7. Work Distributions & Recent Activity', () => {
    it('35. should return complete task distribution across all 7 canonical statuses', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      const dist = res.body.data.taskDistribution;
      expect(dist).toHaveProperty('BACKLOG');
      expect(dist).toHaveProperty('TODO');
      expect(dist).toHaveProperty('IN_PROGRESS');
      expect(dist).toHaveProperty('IN_REVIEW');
      expect(dist).toHaveProperty('BLOCKED');
      expect(dist).toHaveProperty('DONE');
      expect(dist).toHaveProperty('CANCELLED');

      const sum =
        dist.BACKLOG +
        dist.TODO +
        dist.IN_PROGRESS +
        dist.IN_REVIEW +
        dist.BLOCKED +
        dist.DONE +
        dist.CANCELLED;
      expect(sum).toBe(res.body.data.metrics.totalTasks);
      expect(normalTodoTaskId).toBeDefined();
    });

    it('36. should return priority distribution across all 5 canonical priorities', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      const pDist = res.body.data.priorityDistribution;
      expect(pDist).toHaveProperty('URGENT');
      expect(pDist).toHaveProperty('HIGH');
      expect(pDist).toHaveProperty('MEDIUM');
      expect(pDist).toHaveProperty('LOW');
      expect(pDist).toHaveProperty('NONE');

      const pSum = pDist.URGENT + pDist.HIGH + pDist.MEDIUM + pDist.LOW + pDist.NONE;
      expect(pSum).toBe(res.body.data.metrics.totalTasks);
    });

    it('37. should include recent project activities without leaking other projects', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/projects/${activeProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgAToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.recentActivity)).toBe(true);
      expect(res.body.data.recentActivity.length).toBeGreaterThan(0);
      for (const act of res.body.data.recentActivity) {
        expect(act).toHaveProperty('id');
        expect(act).toHaveProperty('actionType');
        expect(act).toHaveProperty('createdAt');
      }
    });

    it('38. should never leak foreign organization data or activities in dashboard', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgBId}/projects/${foreignProjectId}/dashboard`)
        .set('Authorization', `Bearer ${orgBToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.project.id).toBe(foreignProjectId);
      expect(res.body.data.project.organizationId).toBe(orgBId);
      // All tasks in foreign dashboard belong to Org B
      for (const t of res.body.data.overdueTasks) {
        expect(t.id).not.toBe(urgentOverdueTaskId);
      }
    });
  });
});
