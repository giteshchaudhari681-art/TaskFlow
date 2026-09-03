import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../server.js';
import { aiClient, AIProviderError } from '../integrations/ai/aiClient.js';
import { aiContextBuilder } from '../services/aiContext.builder.js';
import type { AIAnalysisResponse } from '@taskflow/shared';

describe('TaskFlow PR 20: AI-Powered Project Intelligence & Recommendations', () => {
  const app = createServer();
  const defaultPassword = 'Password123!';
  const timestamp = Date.now();

  let orgToken: string;
  let orgId: string;
  let projectId: string;

  const mockProjectInsightResponse: AIAnalysisResponse = {
    request_id: 'test-insight-req-999',
    operation: 'PROJECT_INSIGHT',
    summary:
      'Project Alpha exhibits strong milestone velocity but requires mitigation on 2 critical path blockers.',
    recommendations: [
      {
        title: 'Resolve API Gateway Blocker',
        description: 'Engage platform team to unblock payment service integration.',
        priority: 'CRITICAL',
        category: 'BLOCKER',
      },
      {
        title: 'Reassign Unowned Milestone',
        description: 'Assign tech lead to ownership of the database migration milestone.',
        priority: 'HIGH',
        category: 'OWNERSHIP',
      },
      {
        title: 'Prioritize Overdue Sprint Tasks',
        description: 'Rebalance sprint workload to address 3 tasks past their due dates.',
        priority: 'MEDIUM',
        category: 'DELIVERY_RISK',
      },
    ],
    attention_areas: [
      {
        title: 'Critical Path Dependency Blocker',
        description: 'Task ALPHA-42 is blocking 3 dependent tasks in milestone Sprint 3.',
        severity: 'CRITICAL',
      },
      {
        title: '2 Overdue High-Priority Tasks',
        description: 'Tasks ALPHA-12 and ALPHA-15 have exceeded target completion dates.',
        severity: 'HIGH',
      },
    ],
    metadata: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      prompt_tokens: 320,
      completion_tokens: 140,
    },
  };

  beforeAll(async () => {
    // 1. Register Owner & Org
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'AI Intelligence Lead',
        email: `ai_intelligence_${timestamp}@taskflow.io`,
        password: defaultPassword,
        organizationName: `Intelligence Org ${timestamp}`,
      });
    expect(reg.status).toBe(201);
    orgToken = reg.body.data.accessToken;
    orgId = reg.body.data.defaultOrganization.id;

    // 2. Create Project
    const projRes = await request(app)
      .post(`/api/v1/organizations/${orgId}/projects`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({
        name: 'Project Intelligence Target',
        key: `PIT${String(timestamp).slice(-3)}`,
        description: 'Project used for PR 20 AI Project Intelligence verification',
      });
    expect(projRes.status).toBe(201);
    projectId = projRes.body.data.id;

    // 3. Create a task in the project
    await request(app)
      .post(`/api/v1/organizations/${orgId}/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({
        title: 'Initial critical task',
        priority: 'HIGH',
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Authoritative Deterministic Context Builder (PR 14 Integration)', () => {
    it('builds context including deterministic health state, score, and delivery risks', async () => {
      const context = await aiContextBuilder.buildProjectContext(projectId);

      expect(context.project).toBeDefined();
      expect(context.project?.project_id).toBe(projectId);
      expect(context.metrics).toBeDefined();
      expect(context.metrics?.total_tasks).toBeGreaterThanOrEqual(1);

      // Verify PR 14 deterministic health signals in context
      expect(context.health).toBeDefined();
      expect(context.health?.state).toBeDefined();
      expect(typeof context.health?.score).toBe('number');
      expect(Array.isArray(context.health?.reasons)).toBe(true);

      // Verify delivery risks in context
      expect(Array.isArray(context.delivery_risks)).toBe(true);
    });
  });

  describe('2. AI Project Intelligence API Endpoint', () => {
    it('returns structured recommendations and attention areas with 200', async () => {
      const spy = vi.spyOn(aiClient, 'analyze').mockResolvedValue(mockProjectInsightResponse);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/projects/${projectId}/ai/analyze`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ operation: 'PROJECT_INSIGHT' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.operation).toBe('PROJECT_INSIGHT');
      expect(data.summary).toContain('milestone velocity');

      // Recommendations validation
      expect(Array.isArray(data.recommendations)).toBe(true);
      expect(data.recommendations.length).toBe(3);
      expect(data.recommendations[0].priority).toBe('CRITICAL');
      expect(data.recommendations[0].category).toBe('BLOCKER');

      // Attention areas validation
      expect(Array.isArray(data.attention_areas)).toBe(true);
      expect(data.attention_areas.length).toBe(2);
      expect(data.attention_areas[0].severity).toBe('CRITICAL');
      expect(data.attention_areas[0].title).toBe('Critical Path Dependency Blocker');

      expect(spy).toHaveBeenCalledOnce();
    });

    it('passes user prompt refinement to AI service', async () => {
      const spy = vi.spyOn(aiClient, 'analyze').mockResolvedValue(mockProjectInsightResponse);

      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/projects/${projectId}/ai/analyze`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({
          operation: 'PROJECT_INSIGHT',
          user_prompt: 'Focus on milestone delivery and unassigned risks.',
        });

      expect(res.status).toBe(200);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'PROJECT_INSIGHT',
          user_prompt: 'Focus on milestone delivery and unassigned risks.',
        }),
        expect.any(String)
      );
    });

    it('handles AI client error gracefully with standard error envelope', async () => {
      vi.spyOn(aiClient, 'analyze').mockRejectedValue(
        new AIProviderError('Upstream provider rate limited', 502, 'AI_PROVIDER_ERROR')
      );

      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/projects/${projectId}/ai/analyze`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ operation: 'PROJECT_INSIGHT' });

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AI_PROVIDER_ERROR');
    });
  });

  describe('3. Defense-in-Depth Node Zod Validation', () => {
    it('rejects malformed response from Python service via Zod schema check', async () => {
      // Mocking fetch directly to simulate Python returning invalid payload
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          request_id: 'bad-response-uuid',
          operation: 'PROJECT_INSIGHT',
          // Missing required 'summary'
          recommendations: [{ title: 'Missing description', priority: 'INVALID_PRIORITY' }],
        }),
      } as unknown as Response);

      try {
        await expect(
          aiClient.analyze({
            operation: 'PROJECT_INSIGHT',
            context: {},
          })
        ).rejects.toThrow(/failing schema validation/i);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
