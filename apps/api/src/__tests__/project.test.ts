import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { UserRole, ProjectRole, ProjectStatus } from '@taskflow/shared';
import { createServer } from '../server.js';
import { prisma } from '../lib/prisma.js';

const app = createServer();

describe('TaskFlow PR 5: Project Management Foundation Suite', () => {
  const timestamp = `${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  const ownerEmail = `proj.owner.${timestamp}@taskflow.dev`;
  const adminEmail = `proj.admin.${timestamp}@taskflow.dev`;
  const memberEmail = `proj.member.${timestamp}@taskflow.dev`;
  const externalEmail = `proj.external.${timestamp}@taskflow.dev`;
  const foreignEmail = `proj.foreign.${timestamp}@taskflow.dev`;
  const defaultPassword = 'Password123!';

  let ownerToken: string;
  let ownerUserId: string;
  let ownerOrgId: string;

  let adminUserId: string;

  let memberToken: string;
  let memberUserId: string;

  let externalUserId: string;

  let foreignToken: string;
  let foreignOrgId: string;

  let createdProjectId: string;

  beforeAll(async () => {
    // 1. Register Owner (creates initial organization)
    const ownerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Project Suite Owner',
      email: ownerEmail,
      password: defaultPassword,
      organizationName: 'Hyperflow Labs HQ',
    });
    ownerToken = ownerRes.body.data.accessToken;
    ownerUserId = ownerRes.body.data.user.id;
    ownerOrgId = ownerRes.body.data.defaultOrganization.id;

    // 2. Register Admin User and attach to ownerOrgId
    const adminRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Project Suite Admin',
      email: adminEmail,
      password: defaultPassword,
    });
    adminUserId = adminRes.body.data.user.id;
    await prisma.organizationMember.create({
      data: {
        organizationId: ownerOrgId,
        userId: adminUserId,
        role: UserRole.ADMIN,
      },
    });

    // 3. Register Member User and attach to ownerOrgId
    const memberRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Project Suite Member',
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

    // 4. Register External User (not in ownerOrgId)
    const externalRes = await request(app).post('/api/v1/auth/register').send({
      name: 'External User',
      email: externalEmail,
      password: defaultPassword,
    });
    externalUserId = externalRes.body.data.user.id;

    // 5. Register Foreign Owner in a different organization
    const foreignRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Foreign Org Owner',
      email: foreignEmail,
      password: defaultPassword,
      organizationName: 'Foreign Innovations Inc',
    });
    foreignToken = foreignRes.body.data.accessToken;
    foreignOrgId = foreignRes.body.data.defaultOrganization.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.project.deleteMany({
      where: {
        organizationId: { in: [ownerOrgId, foreignOrgId] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [ownerEmail, adminEmail, memberEmail, externalEmail, foreignEmail],
        },
      },
    });
    await prisma.organization.deleteMany({
      where: {
        id: { in: [ownerOrgId, foreignOrgId] },
      },
    });
  });

  // ========================================================================
  // 1. Project Creation (POST /api/v1/organizations/:orgId/projects)
  // ========================================================================
  describe('1. Project Creation & Key Validation', () => {
    it('should reject unauthenticated project creation (401)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects`)
        .send({ name: 'Alpha Core', key: 'ALPHA' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject project creation by user outside the organization (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects`)
        .set('Authorization', `Bearer ${foreignToken}`)
        .send({ name: 'Infiltrator Project', key: 'INFIL' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid project keys (length < 2, non-alphanumeric)', async () => {
      const res1 = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Short Key', key: 'A' });

      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Invalid Chars', key: 'KEY-123' });

      expect(res2.status).toBe(400);
    });

    it('should successfully create a project, uppercase the key, and set creator as LEAD (201)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Core Engine Platform',
          key: 'core', // lowercase input should be normalized
          description: 'High throughput pipeline engine',
          status: ProjectStatus.ACTIVE,
          color: '#06b6d4',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Core Engine Platform');
      expect(res.body.data.key).toBe('CORE'); // normalized
      expect(res.body.data.status).toBe(ProjectStatus.ACTIVE);
      expect(res.body.data.color).toBe('#06b6d4');
      expect(res.body.data.memberCount).toBe(1);

      // Verify creator holds LEAD role
      expect(res.body.data.userRole).toBe(ProjectRole.LEAD);
      expect(res.body.data.members[0].userId).toBe(ownerUserId);
      expect(res.body.data.members[0].role).toBe(ProjectRole.LEAD);

      createdProjectId = res.body.data.id;
    });

    it('should reject duplicate project key within the same organization (409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Duplicate Core Key',
          key: 'CORE',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PROJECT_KEY_EXISTS');
    });

    it('should permit identical project key in a DIFFERENT organization (tenant isolation)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${foreignOrgId}/projects`)
        .set('Authorization', `Bearer ${foreignToken}`)
        .send({
          name: 'Foreign Core Engine',
          key: 'CORE', // same key as ownerOrgId
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.key).toBe('CORE');
      expect(res.body.data.organizationId).toBe(foreignOrgId);
    });
  });

  // ========================================================================
  // 2. Project Listing (GET /api/v1/organizations/:orgId/projects)
  // ========================================================================
  describe('2. Project Listing & Filtering', () => {
    it('should list projects for authorized organization members', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const found = res.body.data.find((p: any) => p.id === createdProjectId);
      expect(found).toBeDefined();
      expect(found.key).toBe('CORE');
    });

    it('should not expose projects from another organization (cross-tenant isolation)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${foreignOrgId}/projects`)
        .set('Authorization', `Bearer ${memberToken}`); // member belongs to ownerOrgId, not foreignOrgId

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should support search and status filters on project list', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects?status=ACTIVE&search=Core`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].status).toBe(ProjectStatus.ACTIVE);
    });
  });

  // ========================================================================
  // 3. Project Inspection (GET /api/v1/organizations/:orgId/projects/:projectId)
  // ========================================================================
  describe('3. Project Retrieval by ID', () => {
    it('should retrieve project details with member directory', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdProjectId);
      expect(res.body.data.members).toBeDefined();
      expect(res.body.data.members.length).toBe(1);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${fakeId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject cross-tenant project ID access via mismatched organization URL (404)', async () => {
      // Attempting to query ownerOrgId's project using foreignOrgId in route
      const res = await request(app)
        .get(`/api/v1/organizations/${foreignOrgId}/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${foreignToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ========================================================================
  // 4. Project Update (PATCH /api/v1/organizations/:orgId/projects/:projectId)
  // ========================================================================
  describe('4. Project Update & Permissions', () => {
    it('should permit LEAD to update project name and description (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Core Engine Platform v2',
          description: 'Updated architecture and real-time execution specs',
          color: '#6366f1',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Core Engine Platform v2');
      expect(res.body.data.color).toBe('#6366f1');
    });

    it('should reject non-admin/non-lead project member from updating settings (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Hacked Project Name',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================================================================
  // 5. Project Membership Management & RBAC Matrix
  // ========================================================================
  describe('5. Project Membership & Security Invariants', () => {
    it('should add existing organization member to project (201)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${createdProjectId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: memberUserId,
          role: ProjectRole.MEMBER,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(memberUserId);
      expect(res.body.data.role).toBe(ProjectRole.MEMBER);
      expect(res.body.data.user.name).toBe('Project Suite Member');
    });

    it('should reject adding an external user who does NOT belong to the organization (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${createdProjectId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: externalUserId, // not an org member
          role: ProjectRole.MEMBER,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USER_NOT_IN_ORGANIZATION');
    });

    it('should reject duplicate project member addition (409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${createdProjectId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: memberUserId, // already added
          role: ProjectRole.MEMBER,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MEMBER_ALREADY_EXISTS');
    });

    it('should list all project members (GET .../members)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${createdProjectId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('should allow project LEAD to promote a MEMBER to ADMIN (200)', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${createdProjectId}/members/${memberUserId}`
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          role: ProjectRole.ADMIN,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(ProjectRole.ADMIN);
    });

    it('should prevent self-elevation: project member cannot modify their own role (403)', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${createdProjectId}/members/${memberUserId}`
        )
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          role: ProjectRole.LEAD,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CANNOT_MODIFY_OWN_ROLE');
    });

    it('should enforce SOLE_LEAD_PROTECTION: cannot demote sole project LEAD (400)', async () => {
      const res = await request(app)
        .patch(
          `/api/v1/organizations/${ownerOrgId}/projects/${createdProjectId}/members/${ownerUserId}`
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          role: ProjectRole.MEMBER,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SOLE_LEAD_PROTECTION');
    });

    it('should enforce SOLE_LEAD_PROTECTION: cannot remove sole project LEAD (400)', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/organizations/${ownerOrgId}/projects/${createdProjectId}/members/${ownerUserId}`
        )
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SOLE_LEAD_PROTECTION');
    });

    it('should allow removing non-lead project member (200)', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/organizations/${ownerOrgId}/projects/${createdProjectId}/members/${memberUserId}`
        )
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify member count decreased to 1
      const listRes = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/projects/${createdProjectId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(listRes.body.data.length).toBe(1);
    });
  });

  // ========================================================================
  // 6. Project Archive & Unarchive Lifecycle
  // ========================================================================
  describe('6. Project Archive & Unarchive Operations', () => {
    it('should allow project LEAD to archive a project (200)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${createdProjectId}/archive`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ProjectStatus.ARCHIVED);
      expect(res.body.data.archivedAt).not.toBeNull();
    });

    it('should allow project LEAD to unarchive a project back to ACTIVE status (200)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/projects/${createdProjectId}/unarchive`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ProjectStatus.ACTIVE);
      expect(res.body.data.archivedAt).toBeNull();
    });
  });
});
