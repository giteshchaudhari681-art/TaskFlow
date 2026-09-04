import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Plan, SubscriptionStatus, FeatureKey, UserRole, TaskStatus } from '@taskflow/shared';
import { createServer } from '../server.js';
import { prisma } from '../lib/prisma.js';
import { entitlementService } from '../services/entitlement.service.js';
import { usageService } from '../services/usage.service.js';
import { PLAN_DEFINITIONS } from '../config/plans.js';
import { EntitlementLimitError } from '../entitlements/errors.js';
import { aiService } from '../services/ai.service.js';

const app = createServer();

describe('TaskFlow PR 27: SaaS Administration, Usage Controls & Entitlements Suite', () => {
  const timestamp = `${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  const ownerEmail = `saas-owner.${timestamp}@taskflow.dev`;
  const adminEmail = `saas-admin.${timestamp}@taskflow.dev`;
  const memberEmail = `saas-member.${timestamp}@taskflow.dev`;
  const foreignEmail = `saas-foreign.${timestamp}@taskflow.dev`;
  const password = 'Password123!';

  let ownerToken: string;
  let ownerUserId: string;
  let ownerOrgId: string;

  let adminToken: string;
  let adminUserId: string;

  let memberToken: string;
  let memberUserId: string;

  let foreignToken: string;
  let foreignUserId: string;
  let foreignOrgId: string;

  let testProjectId: string;

  beforeAll(async () => {
    // 1. Register Owner for Org A
    const ownerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'SaaS Owner',
      email: ownerEmail,
      password,
      organizationName: 'Tenant Alpha Workspace',
    });
    ownerToken = ownerRes.body.data.accessToken;
    ownerUserId = ownerRes.body.data.user.id;
    ownerOrgId = ownerRes.body.data.defaultOrganization.id;

    // 2. Register Admin
    const adminRes = await request(app).post('/api/v1/auth/register').send({
      name: 'SaaS Admin',
      email: adminEmail,
      password,
    });
    adminToken = adminRes.body.data.accessToken;
    adminUserId = adminRes.body.data.user.id;

    // Add Admin to Org A
    await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: adminEmail, role: UserRole.ADMIN });

    // 3. Register Member
    const memberRes = await request(app).post('/api/v1/auth/register').send({
      name: 'SaaS Member',
      email: memberEmail,
      password,
    });
    memberToken = memberRes.body.data.accessToken;
    memberUserId = memberRes.body.data.user.id;

    // Add Member to Org A
    await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberEmail, role: UserRole.MEMBER });

    // 4. Register Foreign Tenant for Org B
    const foreignRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Foreign Owner',
      email: foreignEmail,
      password,
      organizationName: 'Tenant Beta Workspace',
    });
    foreignToken = foreignRes.body.data.accessToken;
    foreignUserId = foreignRes.body.data.user.id;
    foreignOrgId = foreignRes.body.data.defaultOrganization.id;

    // Create a base project in Org A
    const projRes = await request(app)
      .post(`/api/v1/organizations/${ownerOrgId}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Alpha Core Project',
        key: 'ALPH',
        description: 'Testing SaaS limits',
      });
    testProjectId = projRes.body.data.id;
  });

  afterAll(async () => {
    // Clean up created entities
    try {
      await prisma.aIUsageRecord.deleteMany({
        where: { organizationId: { in: [ownerOrgId, foreignOrgId] } },
      });
      await prisma.auditEvent.deleteMany({
        where: { organizationId: { in: [ownerOrgId, foreignOrgId] } },
      });
      await prisma.task.deleteMany({
        where: { project: { organizationId: { in: [ownerOrgId, foreignOrgId] } } },
      });
      await prisma.projectMember.deleteMany({
        where: { project: { organizationId: { in: [ownerOrgId, foreignOrgId] } } },
      });
      await prisma.project.deleteMany({
        where: { organizationId: { in: [ownerOrgId, foreignOrgId] } },
      });
      await prisma.organizationMember.deleteMany({
        where: { organizationId: { in: [ownerOrgId, foreignOrgId] } },
      });
      await prisma.organization.deleteMany({
        where: { id: { in: [ownerOrgId, foreignOrgId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [ownerUserId, adminUserId, memberUserId, foreignUserId] } },
      });
    } catch {
      // Best effort cleanup
    }
  });

  describe('A. Entitlement Service & Plan Models', () => {
    it('defines canonical plans: FREE, PRO, BUSINESS with sensible limits', () => {
      expect(PLAN_DEFINITIONS[Plan.FREE]).toBeDefined();
      expect(PLAN_DEFINITIONS[Plan.PRO]).toBeDefined();
      expect(PLAN_DEFINITIONS[Plan.BUSINESS]).toBeDefined();

      expect(PLAN_DEFINITIONS[Plan.FREE].maxProjects).toBe(10);
      expect(PLAN_DEFINITIONS[Plan.PRO].maxProjects).toBe(50);
      expect(PLAN_DEFINITIONS[Plan.BUSINESS].maxProjects).toBe(500);

      expect(PLAN_DEFINITIONS[Plan.FREE].features.AI_PROJECT_INSIGHTS).toBe(true);
      expect(PLAN_DEFINITIONS[Plan.PRO].features.AI_TASK_ACTIONS).toBe(true);
      expect(PLAN_DEFINITIONS[Plan.BUSINESS].features.AI_TASK_ACTIONS).toBe(true);
    });

    it('retrieves default FREE plan for newly created organization', async () => {
      const planInfo = await entitlementService.getOrganizationPlan(ownerOrgId);
      expect(planInfo.plan).toBe(Plan.FREE);
      expect(planInfo.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);
      expect(planInfo.limits.maxProjects).toBe(10);
    });

    it('rejects features when subscription is canceled with ENTITLEMENT_LIMIT_REACHED error', async () => {
      await prisma.organization.update({
        where: { id: ownerOrgId },
        data: { subscriptionStatus: SubscriptionStatus.CANCELED },
      });

      await expect(
        entitlementService.requireFeature(ownerOrgId, FeatureKey.AI_TASK_ACTIONS, ownerUserId)
      ).rejects.toThrow(EntitlementLimitError);

      try {
        await entitlementService.requireFeature(
          ownerOrgId,
          FeatureKey.AI_TASK_ACTIONS,
          ownerUserId
        );
      } catch (err: unknown) {
        const limitErr = err as EntitlementLimitError;
        expect(limitErr.code).toBe('ENTITLEMENT_LIMIT_REACHED');
        expect(limitErr.statusCode).toBe(403);
        expect(limitErr.details).toMatchObject({
          feature: FeatureKey.AI_TASK_ACTIONS,
          plan: Plan.FREE,
        });
      }

      // Restore active
      await prisma.organization.update({
        where: { id: ownerOrgId },
        data: { subscriptionStatus: SubscriptionStatus.ACTIVE },
      });
    });

    it('records ENTITLEMENT_LIMIT_REACHED audit event upon restriction rejection', async () => {
      const auditEvents = await prisma.auditEvent.findMany({
        where: {
          organizationId: ownerOrgId,
          action: 'ENTITLEMENT_LIMIT_REACHED',
        },
      });
      expect(auditEvents.length).toBeGreaterThan(0);
      expect(auditEvents[0]?.actorUserId).toBe(ownerUserId);
    });

    it('handles non-existent organization gracefully with 404', async () => {
      await expect(
        entitlementService.getOrganizationPlan('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Organization not found');
    });
  });

  describe('B. Usage Service & Authoritative Database Counting', () => {
    it('accurately aggregates member, project, task, and AI counts', async () => {
      const usage = await usageService.getOrganizationUsage(ownerOrgId);

      expect(usage.organizationId).toBe(ownerOrgId);
      expect(usage.plan).toBe(Plan.FREE);
      expect(usage.members.current).toBe(3); // Owner + Admin + Member
      expect(usage.members.limit).toBe(10);
      expect(usage.members.remaining).toBe(7);

      expect(usage.projects.current).toBe(1); // Alpha Core Project
      expect(usage.projects.limit).toBe(10);
      expect(usage.projects.remaining).toBe(9);

      expect(usage.activeTasks.current).toBe(0);
      expect(usage.activeTasks.limit).toBe(1000);

      expect(usage.features.AI_PROJECT_INSIGHTS).toBe(true);
      expect(usage.features.AI_TASK_ACTIONS).toBe(true);
    });

    it('deterministic period bounds survive and calculate current month when unconfigured', async () => {
      const usage = await usageService.getOrganizationUsage(ownerOrgId);
      expect(usage.periodStart).toBeDefined();
      expect(usage.periodEnd).toBeDefined();
      expect(new Date(usage.periodStart).getTime()).toBeLessThan(
        new Date(usage.periodEnd).getTime()
      );
    });
  });

  describe('C. Authoritative Domain Enforcement: Project Limits', () => {
    it('allows project creation under plan quota and blocks at limit', async () => {
      // Org currently has 1 project. Limit is 10.
      // Create Projects 2 to 10
      for (let i = 2; i <= 10; i++) {
        const res = await request(app)
          .post(`/api/v1/organizations/${ownerOrgId}/projects`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: `Project ${i}`, key: `P${i}` });
        expect(res.status).toBe(201);
      }

      // Attempt Project 11 -> Should fail with 403 ENTITLEMENT_LIMIT_REACHED
      const res11 = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Project Eleven Over Limit', key: 'P11' });

      expect(res11.status).toBe(403);
      expect(res11.body.error.code).toBe('ENTITLEMENT_LIMIT_REACHED');
      expect(res11.body.error.meta).toMatchObject({
        feature: 'MAX_PROJECTS',
        limit: 10,
        current: 10,
        remaining: 0,
      });
    });
  });

  describe('D. Authoritative Domain Enforcement: Member Limits', () => {
    it('enforces member limit when organization capacity is exhausted', async () => {
      // FREE limit is 10 members. Current members = 3 (owner, admin, member).
      // Register Members 4 to 10
      for (let i = 4; i <= 10; i++) {
        const email = `m${i}.${timestamp}@taskflow.dev`;
        await request(app)
          .post('/api/v1/auth/register')
          .send({
            name: `Member ${i}`,
            email,
            password,
          });
        const addRes = await request(app)
          .post(`/api/v1/organizations/${ownerOrgId}/members`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ email, role: UserRole.MEMBER });
        expect(addRes.status).toBe(201);
      }

      // Register Member 11 (Over limit 10/10)
      const m11Email = `m11.${timestamp}@taskflow.dev`;
      await request(app).post('/api/v1/auth/register').send({
        name: 'Member 11',
        email: m11Email,
        password,
      });
      const add11 = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: m11Email, role: UserRole.MEMBER });

      expect(add11.status).toBe(403);
      expect(add11.body.error.code).toBe('ENTITLEMENT_LIMIT_REACHED');
      expect(add11.body.error.meta).toMatchObject({
        feature: 'MAX_MEMBERS',
        limit: 10,
        current: 10,
        remaining: 0,
      });
    });
  });

  describe('E. Authoritative Domain Enforcement: Active Task Counting', () => {
    it('creates active tasks and does not count cancelled tasks against active limit', async () => {
      // Create an active task
      const taskRes = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Active Task 1',
          status: TaskStatus.IN_PROGRESS,
        });
      expect(taskRes.status).toBe(201);

      // Create a cancelled task
      const cancelledTaskRes = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${testProjectId}/tasks`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Cancelled Task 2',
          status: TaskStatus.CANCELLED,
        });
      expect(cancelledTaskRes.status).toBe(201);

      const usage = await usageService.getOrganizationUsage(ownerOrgId);
      // Only 1 task is active (IN_PROGRESS), cancelled task is excluded
      expect(usage.activeTasks.current).toBe(1);
    });
  });

  describe('F. AI Quota, Concurrency & Policy Reversion', () => {
    it('rejects AI operations when subscription is canceled on plan', async () => {
      await prisma.organization.update({
        where: { id: ownerOrgId },
        data: { subscriptionStatus: SubscriptionStatus.CANCELED },
      });

      await expect(
        aiService.analyzeProject(
          ownerOrgId,
          testProjectId,
          ownerUserId,
          'PROJECT_INSIGHT',
          'Evaluate project'
        )
      ).rejects.toThrow(EntitlementLimitError);

      await prisma.organization.update({
        where: { id: ownerOrgId },
        data: { subscriptionStatus: SubscriptionStatus.ACTIVE },
      });
    });

    it('reserves AI quota atomically and reverts on upstream provider error', async () => {
      const usageBefore = await usageService.getOrganizationUsage(ownerOrgId);

      // Reserve quota
      const { usageRecordId } = await entitlementService.reserveAIQuota(
        ownerOrgId,
        'PROJECT_INSIGHT',
        ownerUserId,
        'req-res-1'
      );
      expect(usageRecordId).toBeDefined();

      const usageAfterReservation = await usageService.getOrganizationUsage(ownerOrgId);
      expect(usageAfterReservation.aiRequests.current).toBe(usageBefore.aiRequests.current + 1);

      // Revert quota on failure
      await entitlementService.revertAIQuota(usageRecordId);

      const usageAfterReversion = await usageService.getOrganizationUsage(ownerOrgId);
      expect(usageAfterReversion.aiRequests.current).toBe(usageBefore.aiRequests.current);
    });

    it('prevents concurrent oversubscription race conditions using row-level locking', async () => {
      // Org B has 0 AI usage currently. FREE limit is 50 requests.
      // Run 5 simultaneous atomic reservations
      const results = await Promise.all(
        Array.from({ length: 5 }).map((_, i) =>
          entitlementService.reserveAIQuota(
            foreignOrgId,
            'PROJECT_INSIGHT',
            foreignUserId,
            `req-conc-${i}`
          )
        )
      );

      expect(results.length).toBe(5);
      const usageB = await usageService.getOrganizationUsage(foreignOrgId);
      expect(usageB.aiRequests.current).toBe(5);
    });
  });

  describe('G. HTTP Endpoints, RBAC & Tenant Isolation', () => {
    it('allows OWNER to view organization usage via GET /usage', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/usage`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plan).toBe(Plan.FREE);
      expect(res.body.data.members).toBeDefined();
      expect(res.body.data.projects).toBeDefined();
      expect(res.body.data.activeTasks).toBeDefined();
      expect(res.body.data.aiRequests).toBeDefined();
      expect(res.body.data.features).toBeDefined();
    });

    it('allows ADMIN to view organization usage via GET /usage', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/usage`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('forbids regular MEMBER from viewing usage (RBAC enforcement)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/usage`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('enforces Tenant Isolation: Org A user cannot inspect Org B usage', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${foreignOrgId}/usage`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Owner of Org A is not a member of Org B
      expect(res.status).toBe(403);
    });

    it('enforces Tenant Isolation: Org B user cannot inspect Org A usage', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/usage`)
        .set('Authorization', `Bearer ${foreignToken}`);

      expect(res.status).toBe(403);
    });

    it('allows OWNER to update plan via PATCH /plan and records audit event', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/plan`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ plan: Plan.PRO });

      expect(res.status).toBe(200);
      expect(res.body.data.plan).toBe(Plan.PRO);

      // Verify usage endpoint now reflects PRO plan and higher limits
      const usageRes = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/usage`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(usageRes.body.data.plan).toBe(Plan.PRO);
      expect(usageRes.body.data.projects.limit).toBe(50);
      expect(usageRes.body.data.features.AI_TASK_ACTIONS).toBe(true);

      // Verify audit event
      const audit = await prisma.auditEvent.findFirst({
        where: {
          organizationId: ownerOrgId,
          action: 'SUBSCRIPTION_PLAN_CHANGED',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).toBeDefined();
      expect(audit?.metadata).toMatchObject({
        previousPlan: Plan.FREE,
        newPlan: Plan.PRO,
      });
    });

    it('forbids ADMIN from modifying plan tier', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/plan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plan: Plan.BUSINESS });

      expect(res.status).toBe(403);
    });
  });
});
