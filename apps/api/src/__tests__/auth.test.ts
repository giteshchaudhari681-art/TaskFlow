import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { UserRole, ProjectRole } from '@taskflow/shared';
import express from 'express';
import { createServer } from '../server.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireOrgRole } from '../middleware/requireOrgRole.js';
import { requireProjectRole } from '../middleware/requireProjectRole.js';
import { REFRESH_COOKIE_NAME } from '../lib/auth/session.js';

const app = createServer();

// Sub-app for isolated authorization middleware testing (before 404 catch-all)
const testApp = express();
testApp.use(express.json());
testApp.get('/test/org-admin-only', requireAuth, requireOrgRole(UserRole.ADMIN), (_req, res) => {
  res.json({ success: true, message: 'Admin access granted' });
});
testApp.get(
  '/test/projects/:projectId/member-only',
  requireAuth,
  requireProjectRole(ProjectRole.MEMBER),
  (_req, res) => {
    res.json({ success: true, message: 'Project member access granted' });
  }
);

describe('TaskFlow Authentication & Multi-Tenant Authorization Suite', () => {
  const testEmail = `test.user.${Date.now()}.${Math.random().toString(36).substring(2, 7)}@taskflow.dev`;
  const testPassword = 'Password123!';
  let accessToken: string;
  let refreshTokenCookie: string;
  let createdUserId: string;
  let createdOrgId: string;

  afterAll(async () => {
    // Cleanup test records
    if (createdUserId) {
      await prisma.user.deleteMany({
        where: { email: { contains: 'test.user.' } },
      });
    }
    await prisma.$disconnect();
  });

  describe('1. User Registration (POST /api/v1/auth/register)', () => {
    it('should successfully register a user and provision initial organization as OWNER', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Test Engineer',
        email: testEmail,
        password: testPassword,
        organizationName: 'Test Workspace Corp',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.data.user.name).toBe('Test Engineer');
      expect(res.body.data.user.passwordHash).toBeUndefined(); // Crucial security check
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.defaultOrganization.role).toBe(UserRole.OWNER);

      createdUserId = res.body.data.user.id;
      createdOrgId = res.body.data.defaultOrganization.id;

      // Verify HTTP-only refresh cookie is set
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find(c => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
    });

    it('should reject registration with duplicate email address', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Another User',
        email: testEmail,
        password: testPassword,
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should reject registration with weak password (missing uppercase/number)', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Weak Password User',
        email: 'weak.pw@taskflow.dev',
        password: 'password',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. User Login (POST /api/v1/auth/login)', () => {
    it('should successfully login with valid credentials and return access token + cookie', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testEmail,
        password: testPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.passwordHash).toBeUndefined();

      accessToken = res.body.data.accessToken;

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const cookie = cookies.find(c => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
      expect(cookie).toBeDefined();
      refreshTokenCookie = cookie ? (cookie.split(';')[0] as string) : '';
    });

    it('should reject login with incorrect password with generic error', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testEmail,
        password: 'WrongPassword999!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should reject login with non-existent email with generic error', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent.user@taskflow.dev',
        password: testPassword,
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('3. Current User Context (GET /api/v1/auth/me)', () => {
    it('should return user details and organization memberships with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(Array.isArray(res.body.data.organizations)).toBe(true);
      expect(res.body.data.organizations.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.organizations[0].role).toBe(UserRole.OWNER);
    });

    it('should reject requests with missing Authorization header', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with invalid/tampered token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-string-here');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Refresh Token Rotation & Session Lifecycle (POST /api/v1/auth/refresh)', () => {
    let secondRefreshTokenCookie = '';

    it('should rotate refresh token and issue a fresh access token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [refreshTokenCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const cookie = cookies.find(c => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
      expect(cookie).toBeDefined();
      secondRefreshTokenCookie = cookie ? (cookie.split(';')[0] as string) : '';

      // Refresh cookie must be different from previous cookie (token rotated)
      expect(secondRefreshTokenCookie).not.toBe(refreshTokenCookie);
    });

    it('should trigger reuse detection when old rotated refresh token is used again', async () => {
      // Presenting the already-rotated first refresh token
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [refreshTokenCookie]);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Suspicious session activity detected');

      // Subsequent attempt with second token should now also fail (token family revoked)
      const res2 = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [secondRefreshTokenCookie]);

      expect(res2.status).toBe(401);
    });
  });

  describe('5. Logout (POST /api/v1/auth/logout)', () => {
    it('should revoke session and clear refresh cookie', async () => {
      // Re-login to get an active session
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword });

      const cookies = loginRes.headers['set-cookie'] as unknown as string[];
      const foundCookie = cookies.find(c => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
      const activeCookie: string = foundCookie ? (foundCookie.split(';')[0] as string) : '';

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', [activeCookie]);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Attempting refresh after logout should fail
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [activeCookie]);

      expect(refreshRes.status).toBe(401);
    });
  });

  describe('6. Multi-Tenant Authorization (requireOrgRole & requireProjectRole)', () => {
    let memberUserToken: string;
    let memberUserId: string;
    let sampleProjectId: string;

    beforeAll(async () => {
      // 1. Create a MEMBER user in the organization
      const memberRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Regular Member',
          email: `regular.member.${Date.now()}.${Math.random().toString(36).substring(2, 7)}@taskflow.dev`,
          password: testPassword,
        });

      memberUserToken = memberRes.body.data.accessToken;
      memberUserId = memberRes.body.data.user.id;

      // Add as MEMBER to createdOrgId
      await prisma.organizationMember.create({
        data: {
          organizationId: createdOrgId,
          userId: memberUserId,
          role: UserRole.MEMBER,
        },
      });

      // 2. Create a project in createdOrgId and add member
      const project = await prisma.project.create({
        data: {
          organizationId: createdOrgId,
          name: 'Auth Test Project',
          key: `ATP${Math.floor(Math.random() * 1000)}`,
        },
      });
      sampleProjectId = project.id;

      await prisma.projectMember.create({
        data: {
          projectId: sampleProjectId,
          userId: memberUserId,
          role: ProjectRole.MEMBER,
        },
      });
    });

    it('should allow organization OWNER to access admin-only route', async () => {
      const res = await request(testApp)
        .get('/test/org-admin-only')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', createdOrgId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should deny organization MEMBER from accessing admin-only route (403)', async () => {
      const res = await request(testApp)
        .get('/test/org-admin-only')
        .set('Authorization', `Bearer ${memberUserToken}`)
        .set('x-organization-id', createdOrgId);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should deny user not belonging to organization (403)', async () => {
      const nonExistentOrgId = '00000000-0000-0000-0000-000000000000';
      const res = await request(testApp)
        .get('/test/org-admin-only')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', nonExistentOrgId);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow project member to access project-scoped route', async () => {
      const res = await request(testApp)
        .get(`/test/projects/${sampleProjectId}/member-only`)
        .set('Authorization', `Bearer ${memberUserToken}`)
        .set('x-organization-id', createdOrgId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject project access when cross-tenant organization ID does not match', async () => {
      const foreignOrgId = '00000000-0000-0000-0000-000000000000';
      const res = await request(testApp)
        .get(`/test/projects/${sampleProjectId}/member-only`)
        .set('Authorization', `Bearer ${memberUserToken}`)
        .set('x-organization-id', foreignOrgId);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CROSS_TENANT_FORBIDDEN');
    });
  });
});
