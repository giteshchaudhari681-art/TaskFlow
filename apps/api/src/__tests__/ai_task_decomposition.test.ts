import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../server.js';
import { aiClient } from '../integrations/ai/aiClient.js';
import { aiContextBuilder } from '../services/aiContext.builder.js';
import { taskRepository } from '../repositories/task.repository.js';
import { dependencyRepository } from '../repositories/dependency.repository.js';
import { commentRepository } from '../repositories/comment.repository.js';
import { projectDashboardRepository } from '../repositories/projectDashboard.repository.js';
import { TaskStatus } from '@prisma/client';

describe('TaskFlow PR 22: AI-Assisted Task Decomposition Suite', () => {
  const app = createServer();
  const projId = '22222222-2222-2222-2222-222222222222';
  const taskId = '33333333-3333-3333-3333-333333333333';

  const mockTask = {
    id: taskId,
    projectId: projId,
    taskNumber: 15,
    issueKey: 'ALPHA-15',
    title: 'Implement OAuth authentication with GitHub and Google',
    status: TaskStatus.IN_PROGRESS,
    priority: 'HIGH',
    dueDate: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
    description:
      'We need robust multi-provider OAuth login supporting account linking and JWT sessions.',
    assignee: {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Alice Engineer',
      email: 'alice@example.com',
    },
    project: { id: projId, key: 'ALPHA', name: 'Alpha Project' },
    subtasks: [
      {
        id: 'sub-existing-1',
        title: 'Design OAuth token storage schema',
        isCompleted: true,
        order: 0,
      },
    ],
    labels: [
      { id: 'lbl-1', name: 'backend' },
      { id: 'lbl-2', name: 'auth' },
    ],
  };

  const mockDependencies = [
    {
      id: 'dep-1',
      predecessorTaskId: 'dep-task-1',
      successorTaskId: taskId,
      type: 'BLOCKS',
      predecessor: {
        id: 'dep-task-1',
        issueKey: 'ALPHA-10',
        title: 'JWT secret key vault configuration',
        status: TaskStatus.DONE,
      },
      successor: {
        id: taskId,
        issueKey: 'ALPHA-15',
        title: 'Implement OAuth authentication with GitHub and Google',
        status: TaskStatus.IN_PROGRESS,
      },
    },
  ];

  const mockComments = [
    {
      id: 'comm-1',
      content: 'Make sure callback URLs are configured in Google Cloud Console.',
      createdAt: new Date(),
      author: { id: '55555555-5555-5555-5555-555555555555', name: 'Bob Dev' },
    },
  ];

  const mockDashboardData = {
    project: {
      id: projId,
      key: 'ALPHA',
      name: 'Alpha Project',
      status: 'ACTIVE',
      description: 'Core project',
    },
    tasks: [mockTask],
    milestones: [],
    recentActivity: [],
    activityChart: [],
  };

  describe('Context Builder for Task Decomposition', () => {
    it('assembles existing subtasks, dependencies, and bounded context', async () => {
      vi.spyOn(taskRepository, 'findById').mockResolvedValue(mockTask as any);
      vi.spyOn(dependencyRepository, 'findByTaskId').mockResolvedValue(mockDependencies as any);
      vi.spyOn(commentRepository, 'listByTask').mockResolvedValue(mockComments as any);
      vi.spyOn(projectDashboardRepository, 'getProjectDashboardData').mockResolvedValue(
        mockDashboardData as any
      );

      const ctx = await aiContextBuilder.buildTaskContext(projId, taskId);

      expect(ctx.target_task).toBeDefined();
      const target = ctx.target_task!;
      expect(target.task_id).toBe(taskId);
      expect(target.issue_key).toBe('ALPHA-15');
      expect(target.subtasks).toHaveLength(1);
      expect(target.subtasks![0]!.title).toBe('Design OAuth token storage schema');
      expect(target.subtasks![0]!.status).toBe('DONE');
      expect(target.dependencies).toHaveLength(1);
      expect(target.dependencies![0]!.relationship).toBe('BLOCKING_PREDECESSOR');
    });
  });

  describe('POST /api/v1/organizations/:organizationId/projects/:projectId/ai/analyze (TASK_DECOMPOSITION)', () => {
    let testOrgId: string;
    let testProjId: string;
    let memberAuthToken: string;
    let viewerAuthToken: string;

    beforeEach(async () => {
      vi.restoreAllMocks();
    });

    it('setup workspace and project for decomposition tests', async () => {
      const ts = Date.now();
      // 1. Register owner
      const regOwner = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Decomp Owner',
          email: `decomp_owner_${ts}@taskflow.io`,
          password: 'Password123!',
          organizationName: `Decomp Org ${ts}`,
        });
      expect(regOwner.status).toBe(201);
      testOrgId = regOwner.body.data.defaultOrganization.id;
      const ownerToken = regOwner.body.data.accessToken;

      // 2. Create project
      const projRes = await request(app)
        .post(`/api/v1/organizations/${testOrgId}/projects`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Decomp AI Project', key: 'DCP' });
      expect(projRes.status).toBe(201);
      testProjId = projRes.body.data.id;

      // 3. Register regular member
      const regMember = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Decomp Member',
          email: `decomp_member_${ts}@taskflow.io`,
          password: 'Password123!',
          organizationName: `Member Org ${ts}`,
        });
      memberAuthToken = regMember.body.data.accessToken;
      const memberUserId = regMember.body.data.user.id;

      // Add to org and project as MEMBER
      await request(app)
        .post(`/api/v1/organizations/${testOrgId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: `decomp_member_${ts}@taskflow.io`, role: 'MEMBER' });

      await request(app)
        .post(`/api/v1/organizations/${testOrgId}/projects/${testProjId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: memberUserId, role: 'MEMBER' });

      // 4. Register viewer
      const regViewer = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Decomp Viewer',
          email: `decomp_viewer_${ts}@taskflow.io`,
          password: 'Password123!',
          organizationName: `Viewer Org ${ts}`,
        });
      viewerAuthToken = regViewer.body.data.accessToken;
      const viewerUserId = regViewer.body.data.user.id;

      await request(app)
        .post(`/api/v1/organizations/${testOrgId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: `decomp_viewer_${ts}@taskflow.io`, role: 'MEMBER' });

      await request(app)
        .post(`/api/v1/organizations/${testOrgId}/projects/${testProjId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: viewerUserId, role: 'VIEWER' });
    });

    it('validates taskId is present for TASK_DECOMPOSITION', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${testOrgId}/projects/${testProjId}/ai/analyze`)
        .set('Authorization', `Bearer ${memberAuthToken}`)
        .send({ operation: 'TASK_DECOMPOSITION' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when taskId does not exist in the project', async () => {
      vi.spyOn(taskRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/v1/organizations/${testOrgId}/projects/${testProjId}/ai/analyze`)
        .set('Authorization', `Bearer ${memberAuthToken}`)
        .send({
          operation: 'TASK_DECOMPOSITION',
          taskId: '00000000-0000-0000-0000-000000000000',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('successfully proposes decomposed subtasks and does NOT create them in DB', async () => {
      vi.spyOn(taskRepository, 'findById').mockResolvedValue(mockTask as any);
      vi.spyOn(dependencyRepository, 'findByTaskId').mockResolvedValue(mockDependencies as any);
      vi.spyOn(commentRepository, 'listByTask').mockResolvedValue(mockComments as any);
      vi.spyOn(projectDashboardRepository, 'getProjectDashboardData').mockResolvedValue(
        mockDashboardData as any
      );

      const spyCreateSubtask = vi.spyOn(taskRepository, 'createSubtask');

      const mockAIResponse = {
        request_id: 'decomp-req-trace-456',
        operation: 'TASK_DECOMPOSITION' as const,
        summary: 'Proposed 3 sequential subtasks for OAuth integration.',
        recommendations: [],
        attention_areas: [],
        subtasks: [
          {
            title: 'Configure OAuth application credentials',
            description: 'Register Google and GitHub client secrets',
            priority: 'HIGH' as const,
            order: 1,
          },
          {
            title: 'Add OAuth callback endpoint',
            description: 'Implement exchange route in Express router',
            priority: 'HIGH' as const,
            order: 2,
          },
          {
            title: 'Add frontend login buttons',
            description: 'Render social buttons with redirect links',
            priority: 'MEDIUM' as const,
            order: 3,
          },
        ],
        notes: ['Human review is mandatory before creation.'],
        metadata: {
          model: 'gpt-4o-mini',
          provider: 'openai',
          prompt_tokens: 300,
          completion_tokens: 120,
          total_tokens: 420,
        },
      };

      const spyClient = vi.spyOn(aiClient, 'analyze').mockResolvedValue(mockAIResponse);

      const res = await request(app)
        .post(`/api/v1/organizations/${testOrgId}/projects/${testProjId}/ai/analyze`)
        .set('Authorization', `Bearer ${memberAuthToken}`)
        .send({
          operation: 'TASK_DECOMPOSITION',
          taskId,
          user_prompt: 'Focus on backend callback security',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.operation).toBe('TASK_DECOMPOSITION');
      expect(res.body.data.subtasks).toHaveLength(3);
      expect(res.body.data.subtasks[0].title).toBe('Configure OAuth application credentials');
      expect(res.body.data.subtasks[0].order).toBe(1);
      expect(res.body.data.notes).toContain('Human review is mandatory before creation.');

      // Critical Safety Invariant: AI analysis must NEVER call createSubtask in the database
      expect(spyCreateSubtask).not.toHaveBeenCalled();

      // Verify payload forwarded to aiClient
      expect(spyClient).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'TASK_DECOMPOSITION',
          user_prompt: 'Focus on backend callback security',
          context: expect.objectContaining({
            target_task: expect.objectContaining({
              task_id: taskId,
              issue_key: 'ALPHA-15',
            }),
          }),
        }),
        expect.any(String)
      );
    });

    it('rejects PROJECT VIEWER role with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${testOrgId}/projects/${testProjId}/ai/analyze`)
        .set('Authorization', `Bearer ${viewerAuthToken}`)
        .send({ operation: 'TASK_DECOMPOSITION', taskId });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
