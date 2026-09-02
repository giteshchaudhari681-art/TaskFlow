import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { UserRole } from '@taskflow/shared';
import { createServer } from '../server.js';
import { prisma } from '../lib/prisma.js';
import { REFRESH_COOKIE_NAME } from '../lib/auth/session.js';

const app = createServer();

describe('TaskFlow PR 4: User Profile, Organization & Workspace Management Suite', () => {
  const timestamp = `${Date.now()}.${Math.random().toString(36).substring(2, 6)}`;
  const ownerEmail = `owner.${timestamp}@taskflow.dev`;
  const adminEmail = `admin.${timestamp}@taskflow.dev`;
  const memberEmail = `member.${timestamp}@taskflow.dev`;
  const foreignEmail = `foreign.${timestamp}@taskflow.dev`;
  const defaultPassword = 'Password123!';
  const updatedPassword = 'NewPassword456!';

  let ownerToken: string;
  let ownerUserId: string;
  let ownerOrgId: string;

  let adminToken: string;
  let adminUserId: string;

  let memberToken: string;
  let memberUserId: string;

  let foreignToken: string;
  let foreignOrgId: string;

  beforeAll(async () => {
    // 1. Register Owner (creates initial org)
    const ownerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Workspace Owner',
      email: ownerEmail,
      password: defaultPassword,
      organizationName: 'Acme Operations HQ',
    });
    ownerToken = ownerRes.body.data.accessToken;
    ownerUserId = ownerRes.body.data.user.id;
    ownerOrgId = ownerRes.body.data.defaultOrganization.id;

    // 2. Register Admin User
    const adminRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Workspace Admin',
      email: adminEmail,
      password: defaultPassword,
    });
    adminToken = adminRes.body.data.accessToken;
    adminUserId = adminRes.body.data.user.id;

    // Add Admin to ownerOrgId with ADMIN role
    await prisma.organizationMember.create({
      data: {
        organizationId: ownerOrgId,
        userId: adminUserId,
        role: UserRole.ADMIN,
      },
    });

    // 3. Register Member User
    const memberRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Regular Member',
      email: memberEmail,
      password: defaultPassword,
    });
    memberToken = memberRes.body.data.accessToken;
    memberUserId = memberRes.body.data.user.id;

    // Add Member to ownerOrgId with MEMBER role
    await prisma.organizationMember.create({
      data: {
        organizationId: ownerOrgId,
        userId: memberUserId,
        role: UserRole.MEMBER,
      },
    });

    // 4. Register Foreign User (in an isolated tenant organization)
    const foreignRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Foreign User',
      email: foreignEmail,
      password: defaultPassword,
      organizationName: 'Foreign Corp Workspace',
    });
    foreignToken = foreignRes.body.data.accessToken;
    foreignOrgId = foreignRes.body.data.defaultOrganization.id;
  });

  afterAll(async () => {
    // Clean up test records
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [ownerEmail, adminEmail, memberEmail, foreignEmail],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('1. User Profile Management (GET & PATCH /api/v1/users/me)', () => {
    it('should retrieve own profile for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(ownerUserId);
      expect(res.body.data.email).toBe(ownerEmail.toLowerCase());
      expect(res.body.data.name).toBe('Workspace Owner');
      expect(res.body.data.passwordHash).toBeUndefined(); // Security invariant
      expect(res.body.data.organizationCount).toBeGreaterThanOrEqual(1);
    });

    it('should reject unauthenticated profile request with 401', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should allow user to update their own name and avatarUrl', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Executive Owner Updated',
          avatarUrl: 'https://images.taskflow.dev/avatars/executive.png',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Executive Owner Updated');
      expect(res.body.data.avatarUrl).toBe('https://images.taskflow.dev/avatars/executive.png');
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('should reject invalid profile updates with 400', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'x', // Too short (min 2 chars)
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should ignore/prevent modification of immutable identity fields (e.g. email)', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Still Executive Owner',
          email: 'hacked.email@evil.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(ownerEmail.toLowerCase()); // Email remains unchanged
    });
  });

  describe('2. Password Change & Session Invalidation (PATCH /api/v1/users/me/password)', () => {
    let initialRefreshCookie: string;

    it('should reject password change with incorrect current password (400)', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          currentPassword: 'WrongPassword999!',
          newPassword: updatedPassword,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Current password does not match');
    });

    it('should reject password change when new password matches current password (400)', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          currentPassword: defaultPassword,
          newPassword: defaultPassword,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('identical to current password');
    });

    it('should reject weak new password (400)', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          currentPassword: defaultPassword,
          newPassword: 'weak',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should successfully change password, return fresh token, update cookie, and allow login with new password', async () => {
      // First, capture a login session
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: ownerEmail, password: defaultPassword });
      const cookieHeader = loginRes.headers['set-cookie'] as unknown as string[];
      initialRefreshCookie = cookieHeader
        .find(c => c.startsWith(`${REFRESH_COOKIE_NAME}=`))!
        .split(';')[0]!;

      // Perform password change
      const res = await request(app)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          currentPassword: defaultPassword,
          newPassword: updatedPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.message).toContain('Password changed successfully');

      // Update token for future owner requests
      ownerToken = res.body.data.accessToken;

      // Verify login with old password fails
      const oldLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: ownerEmail, password: defaultPassword });
      expect(oldLoginRes.status).toBe(401);

      // Verify login with new password succeeds
      const newLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: ownerEmail, password: updatedPassword });
      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.success).toBe(true);

      // Verify that the pre-existing session was revoked
      const refreshOldRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [initialRefreshCookie]);
      expect(refreshOldRes.status).toBe(401);
    });
  });

  describe('3. Organization & Workspace Operations', () => {
    it('should list all organizations belonging to the authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((o: { id: string }) => o.id === ownerOrgId);
      expect(found).toBeDefined();
      expect(found.role).toBe(UserRole.OWNER);
      expect(found.memberCount).toBeGreaterThanOrEqual(3);
    });

    it('should not leak foreign organizations in user workspace list', async () => {
      const res = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${ownerToken}`);

      const foreignInList = res.body.data.find((o: { id: string }) => o.id === foreignOrgId);
      expect(foreignInList).toBeUndefined();
    });

    it('should retrieve workspace details for authorized member', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(ownerOrgId);
      expect(res.body.data.role).toBe(UserRole.MEMBER);
      expect(res.body.data.memberCount).toBeGreaterThanOrEqual(3);
    });

    it('should deny foreign user from inspecting workspace details (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}`)
        .set('Authorization', `Bearer ${foreignToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow OWNER or ADMIN to update workspace metadata', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Acme Operations Global Hub',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Acme Operations Global Hub');
    });

    it('should deny regular MEMBER from updating workspace metadata (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Hacked Workspace Name',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Workspace Member Management & RBAC Matrix', () => {
    it('should list all workspace members for authorized member', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/members`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);

      const ownerMember = res.body.data.find((m: { userId: string }) => m.userId === ownerUserId);
      expect(ownerMember).toBeDefined();
      expect(ownerMember.role).toBe(UserRole.OWNER);
      expect(ownerMember.user.passwordHash).toBeUndefined(); // Zero security leaks
    });

    it('should deny non-member from listing members (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${ownerOrgId}/members`)
        .set('Authorization', `Bearer ${foreignToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow ADMIN to add a new registered user as GUEST', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: foreignEmail,
          role: UserRole.GUEST,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(UserRole.GUEST);
      expect(res.body.data.user.email).toBe(foreignEmail.toLowerCase());
    });

    it('should reject adding an already existing member with 409', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${ownerOrgId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: foreignEmail,
          role: UserRole.GUEST,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should deny ADMIN from promoting or adding anyone directly as OWNER (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/members/${memberUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: UserRole.OWNER,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain(
        'Only an organization OWNER can promote members to OWNER'
      );
    });

    it('should deny user from modifying their own role (no self-promotion) (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/members/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: UserRole.MEMBER,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Users cannot modify their own organization role');
    });

    it('should allow OWNER to promote a MEMBER to ADMIN', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/members/${memberUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          role: UserRole.ADMIN,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(UserRole.ADMIN);
    });

    it('should deny ADMIN from demoting or modifying an organization OWNER (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/members/${ownerUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: UserRole.MEMBER,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain(
        'Administrators cannot modify an organization OWNER'
      );
    });

    it('should reject demoting the sole remaining OWNER of the workspace (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${ownerOrgId}/members/${ownerUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          role: UserRole.ADMIN,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('sole remaining owner');
    });

    it('should deny ADMIN from removing an organization OWNER (403)', async () => {
      const res = await request(app)
        .delete(`/api/v1/organizations/${ownerOrgId}/members/${ownerUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain(
        'Administrators cannot remove an organization OWNER'
      );
    });

    it('should reject removing the sole remaining OWNER (400)', async () => {
      const res = await request(app)
        .delete(`/api/v1/organizations/${ownerOrgId}/members/${ownerUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('sole remaining owner');
    });

    it('should allow ADMIN to remove a non-owner member', async () => {
      // We added foreign user above; let's find the member
      const member = await prisma.user.findUnique({ where: { email: foreignEmail } });
      const delRes = await request(app)
        .delete(`/api/v1/organizations/${ownerOrgId}/members/${member!.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
    });

    it('should reject cross-tenant member removal (cannot remove member from another org)', async () => {
      const foreignUser = await prisma.user.findUnique({ where: { email: foreignEmail } });
      const res = await request(app)
        .delete(`/api/v1/organizations/${ownerOrgId}/members/${foreignUser!.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
