import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../server.js';
import {
  aiClient,
  AIClient,
  AIClientUnavailableError,
  AIClientTimeoutError,
  AIProviderError,
  AIClientError,
} from '../integrations/ai/aiClient.js';
import type { AIAnalysisResponse } from '@taskflow/shared';

describe('TaskFlow PR 16: Node.js ↔ Python AI Integration & Architecture Hardening', () => {
  const app = createServer();
  const defaultPassword = 'Password123!';
  const timestamp = Date.now();

  // Tenant A
  const orgAEmail = `ai_owner_a_${timestamp}@taskflow.io`;
  const adminAEmail = `ai_admin_a_${timestamp}@taskflow.io`;
  const memberAEmail = `ai_member_a_${timestamp}@taskflow.io`;
  const viewerAEmail = `ai_viewer_a_${timestamp}@taskflow.io`;
  const nonMemberEmail = `ai_nonproj_a_${timestamp}@taskflow.io`;

  let orgAToken: string;
  let orgAId: string;
  let adminToken: string;
  let memberToken: string;
  let viewerToken: string;
  let nonMemberToken: string;
  let projectId: string;

  // Tenant B (Foreign Organization)
  const orgBEmail = `ai_owner_b_${timestamp}@taskflow.io`;
  let orgBToken: string;
  let orgBId: string;
  let foreignProjectId: string;

  const mockSuccessfulResponse: AIAnalysisResponse = {
    request_id: 'test-correlation-id-1234',
    operation: 'PROJECT_SUMMARY',
    summary: 'Project Alpha is progressing on schedule with 80% completion rate.',
    recommendations: [
      {
        title: 'Resolve blocker on payment gateway',
        description: 'Critical path dependency requires immediate engineering focus.',
        priority: 'HIGH',
        category: 'RISK_MITIGATION',
      },
    ],
    metadata: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      prompt_tokens: 120,
      completion_tokens: 65,
    },
  };

  beforeAll(async () => {
    // 1. Register Org A Owner
    const regA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Owner Alice',
        email: orgAEmail,
        password: defaultPassword,
        organizationName: `AI Corp ${timestamp}`,
      });
    expect(regA.status).toBe(201);
    orgAToken = regA.body.data.accessToken;
    orgAId = regA.body.data.defaultOrganization.id;

    // 2. Register Org A Admin
    const regAdmin = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Admin Bob',
        email: adminAEmail,
        password: defaultPassword,
        organizationName: `Admin Workspace ${timestamp}`,
      });
    adminToken = regAdmin.body.data.accessToken;
    await request(app)
      .post(`/api/v1/organizations/${orgAId}/members`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ email: adminAEmail, role: 'ADMIN' });

    // 3. Register Org A Regular Member
    const regMember = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Member Charlie',
        email: memberAEmail,
        password: defaultPassword,
        organizationName: `Member Workspace ${timestamp}`,
      });
    memberToken = regMember.body.data.accessToken;
    const memberUserId = regMember.body.data.user.id;
    await request(app)
      .post(`/api/v1/organizations/${orgAId}/members`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ email: memberAEmail, role: 'MEMBER' });

    // 4. Register Org A Viewer
    const regViewer = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Viewer Dave',
        email: viewerAEmail,
        password: defaultPassword,
        organizationName: `Viewer Workspace ${timestamp}`,
      });
    viewerToken = regViewer.body.data.accessToken;
    const viewerUserId = regViewer.body.data.user.id;
    await request(app)
      .post(`/api/v1/organizations/${orgAId}/members`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ email: viewerAEmail, role: 'MEMBER' });

    // 5. Register Org A Non-Project Member
    const regNonMember = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Non Project Eve',
        email: nonMemberEmail,
        password: defaultPassword,
        organizationName: `Non Project Workspace ${timestamp}`,
      });
    nonMemberToken = regNonMember.body.data.accessToken;
    await request(app)
      .post(`/api/v1/organizations/${orgAId}/members`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ email: nonMemberEmail, role: 'MEMBER' });

    // 6. Register Org B Owner
    const regB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Owner Zara',
        email: orgBEmail,
        password: defaultPassword,
        organizationName: `Foreign Corp ${timestamp}`,
      });
    orgBToken = regB.body.data.accessToken;
    orgBId = regB.body.data.defaultOrganization.id;

    // 7. Create Project in Org A
    const projRes = await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        name: 'Project Intelligence',
        key: 'PRJAI',
        description: 'Core AI operations testing project',
      });
    expect(projRes.status).toBe(201);
    projectId = projRes.body.data.id;

    // Add Charlie as MEMBER on Project
    await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ userId: memberUserId, role: 'MEMBER' });

    // Add Dave as VIEWER on Project
    await request(app)
      .post(`/api/v1/organizations/${orgAId}/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({ userId: viewerUserId, role: 'VIEWER' });

    // 8. Create Project in Foreign Org B
    const foreignProjRes = await request(app)
      .post(`/api/v1/organizations/${orgBId}/projects`)
      .set('Authorization', `Bearer ${orgBToken}`)
      .send({
        name: 'Foreign Project',
        key: 'FORGN',
        description: 'Isolated tenant project',
      });
    expect(foreignProjRes.status).toBe(201);
    foreignProjectId = foreignProjRes.body.data.id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Authentication & Security Boundary', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects/${projectId}/ai/analyze`)
        .send({ operation: 'PROJECT_SUMMARY' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects cross-tenant access to foreign project with 404', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects/${foreignProjectId}/ai/analyze`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .send({ operation: 'PROJECT_SUMMARY' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('rejects user who does not belong to the organization with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects/${projectId}/ai/analyze`)
        .set('Authorization', `Bearer ${orgBToken}`)
        .send({ operation: 'PROJECT_SUMMARY' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Project RBAC Enforcement', () => {
    it('rejects project viewer with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects/${projectId}/ai/analyze`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ operation: 'PROJECT_SUMMARY' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/viewers are not authorized/i);
    });

    it('rejects non-project member with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects/${projectId}/ai/analyze`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send({ operation: 'PROJECT_SUMMARY' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/not a member of this project/i);
    });

    it('allows authorized project member with role MEMBER to run AI analysis', async () => {
      const spy = vi.spyOn(aiClient, 'analyze').mockResolvedValue(mockSuccessfulResponse);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects/${projectId}/ai/analyze`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ operation: 'PROJECT_SUMMARY' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toContain('Project Alpha is progressing');
      expect(spy).toHaveBeenCalledOnce();
    });

    it('allows organization owner / admin to run AI analysis', async () => {
      const spy = vi.spyOn(aiClient, 'analyze').mockResolvedValue(mockSuccessfulResponse);

      const resOwner = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects/${projectId}/ai/analyze`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .send({ operation: 'PROJECT_INSIGHT' });

      expect(resOwner.status).toBe(200);
      expect(resOwner.body.success).toBe(true);

      const resAdmin = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects/${projectId}/ai/analyze`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ operation: 'PROJECT_INSIGHT' });

      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.success).toBe(true);
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('3. Validation & Parameter Handling', () => {
    it('rejects invalid AI operation with 400', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects/${projectId}/ai/analyze`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .send({ operation: 'INVALID_OP' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects user prompt exceeding 2000 characters with 400', async () => {
      const longPrompt = 'a'.repeat(2001);
      const res = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects/${projectId}/ai/analyze`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .send({
          operation: 'PROJECT_SUMMARY',
          user_prompt: longPrompt,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/2000 characters/i);
    });

    it('propagates request_id from X-Request-ID header to client and preserves it', async () => {
      const customTraceId = 'express-trace-test-uuid-9876';
      const spy = vi.spyOn(aiClient, 'analyze').mockImplementation(async (payload, reqId) => ({
        ...mockSuccessfulResponse,
        request_id: reqId || payload.request_id || 'generated-id',
      }));

      const res = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects/${projectId}/ai/analyze`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .set('X-Request-ID', customTraceId)
        .send({ operation: 'TASK_SUMMARY' });

      expect(res.status).toBe(200);
      expect(res.body.data.request_id).toBe(customTraceId);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'TASK_SUMMARY',
          context: expect.objectContaining({
            project: expect.objectContaining({
              project_key: 'PRJAI',
            }),
          }),
        }),
        customTraceId
      );
    });
  });

  describe('4. Failure Modes & Controlled Degradation', () => {
    it('maps Python service unavailable (ECONNREFUSED) to 503', async () => {
      vi.spyOn(aiClient, 'analyze').mockRejectedValue(
        new AIClientUnavailableError('Could not establish connection to Python AI service')
      );

      const res = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects/${projectId}/ai/analyze`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .send({ operation: 'PROJECT_SUMMARY' });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AI_SERVICE_UNAVAILABLE');
    });

    it('maps AI client timeout to 504 Gateway Timeout', async () => {
      vi.spyOn(aiClient, 'analyze').mockRejectedValue(
        new AIClientTimeoutError('AI service request exceeded timeout')
      );

      const res = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects/${projectId}/ai/analyze`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .send({ operation: 'PROJECT_SUMMARY' });

      expect(res.status).toBe(504);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AI_GATEWAY_TIMEOUT');
    });

    it('maps upstream provider error to 502 Bad Gateway', async () => {
      vi.spyOn(aiClient, 'analyze').mockRejectedValue(
        new AIProviderError('Upstream AI provider error occurred', 502, 'AI_PROVIDER_ERROR')
      );

      const res = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects/${projectId}/ai/analyze`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .send({ operation: 'PROJECT_SUMMARY' });

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AI_PROVIDER_ERROR');
    });

    it('maps upstream provider unconfigured to 503', async () => {
      vi.spyOn(aiClient, 'analyze').mockRejectedValue(
        new AIProviderError(
          'AI service is not configured with valid provider credentials.',
          503,
          'AI_PROVIDER_NOT_CONFIGURED'
        )
      );

      const res = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects/${projectId}/ai/analyze`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .send({ operation: 'PROJECT_SUMMARY' });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AI_PROVIDER_NOT_CONFIGURED');
    });

    it('maps internal service token failure to 500 without leaking token', async () => {
      vi.spyOn(aiClient, 'analyze').mockRejectedValue(
        new AIClientError(
          'Internal AI service authentication failed',
          500,
          'INTERNAL_SERVICE_AUTH_ERROR'
        )
      );

      const res = await request(app)
        .post(`/api/v1/organizations/${orgAId}/projects/${projectId}/ai/analyze`)
        .set('Authorization', `Bearer ${orgAToken}`)
        .send({ operation: 'PROJECT_SUMMARY' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INTERNAL_SERVICE_AUTH_ERROR');
      expect(JSON.stringify(res.body)).not.toContain('taskflow-internal');
    });
  });

  describe('5. Unit Tests for AIClient HTTP Transport', () => {
    it('forwards internal service token and request_id headers', async () => {
      const originalFetch = global.fetch;
      let interceptedHeaders: HeadersInit | undefined;
      let interceptedBody: string | undefined;

      global.fetch = vi.fn().mockImplementation(async (_url, init) => {
        interceptedHeaders = init?.headers;
        interceptedBody = init?.body;
        return {
          ok: true,
          status: 200,
          json: async () => mockSuccessfulResponse,
        } as Response;
      });

      const client = new AIClient('http://127.0.0.1:8000', 'super-secret-token', 5000);
      const result = await client.analyze(
        {
          operation: 'PROJECT_SUMMARY',
          context: {},
        },
        'custom-trace-uuid'
      );

      expect(result.summary).toBe(mockSuccessfulResponse.summary);
      expect(interceptedHeaders).toEqual(
        expect.objectContaining({
          'X-TaskFlow-Service-Token': 'super-secret-token',
          'X-Request-ID': 'custom-trace-uuid',
        })
      );

      const parsedBody = JSON.parse(interceptedBody as string);
      expect(parsedBody.request_id).toBe('custom-trace-uuid');

      global.fetch = originalFetch;
    });

    it('rejects when service returns 401 internal auth failure', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: { code: 'UNAUTHORIZED_SERVICE', message: 'Invalid token' },
        }),
      } as Response);

      const client = new AIClient('http://127.0.0.1:8000', 'wrong-token', 5000);
      await expect(client.analyze({ operation: 'PROJECT_SUMMARY', context: {} })).rejects.toThrow(
        /Internal AI service authentication failed/
      );

      global.fetch = originalFetch;
    });

    it('rejects with timeout when request takes longer than timeoutMs', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((_url, init) => {
        return new Promise((_, reject) => {
          const signal = init?.signal;
          if (signal) {
            signal.addEventListener('abort', () => {
              const abortErr = new Error('The operation was aborted');
              abortErr.name = 'AbortError';
              reject(abortErr);
            });
          }
        });
      });

      const client = new AIClient('http://127.0.0.1:8000', 'token', 50); // 50ms timeout
      await expect(client.analyze({ operation: 'PROJECT_SUMMARY', context: {} })).rejects.toThrow(
        /exceeded timeout of 50ms/
      );

      global.fetch = originalFetch;
    });
  });
});
