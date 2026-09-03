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

describe('TaskFlow PR 21: AI-Powered Task Intelligence Suite', () => {
  const app = createServer();
  const projId = '22222222-2222-2222-2222-222222222222';
  const taskId = '33333333-3333-3333-3333-333333333333';

  const mockTask = {
    id: taskId,
    projectId: projId,
    taskNumber: 12,
    issueKey: 'ALPHA-12',
    title: 'Migrate legacy auth to JWT rotation',
    status: TaskStatus.IN_PROGRESS,
    priority: 'HIGH',
    dueDate: new Date('2026-09-15T00:00:00Z'),
    createdAt: new Date('2026-09-01T00:00:00Z'),
    description: 'Update auth cookies and add refresh token rotation.',
    assignee: { name: 'Alice Engineer', email: 'alice@taskflow.io' },
    project: { key: 'ALPHA', name: 'Alpha Core' },
    subtasks: [
      { id: 'sub-1', title: 'Write unit tests', isCompleted: true },
      { id: 'sub-2', title: 'Deploy migration script', isCompleted: false },
    ],
    labels: [{ name: 'backend' }, { name: 'security' }],
  };

  const mockDependencies = [
    {
      id: 'dep-1',
      projectId: projId,
      predecessorId: 'prev-task-id',
      successorId: taskId,
      type: 'BLOCKS',
      predecessor: {
        id: 'prev-task-id',
        taskNumber: 10,
        issueKey: 'ALPHA-10',
        title: 'DB Schema Update',
        status: TaskStatus.DONE,
      },
      successor: {
        id: taskId,
        taskNumber: 12,
        issueKey: 'ALPHA-12',
        title: 'Migrate legacy auth to JWT rotation',
        status: TaskStatus.IN_PROGRESS,
      },
    },
  ];

  const mockComments = [
    {
      id: 'c-1',
      taskId,
      content: 'JWT secrets tested in staging environment.',
      createdAt: new Date('2026-09-02T10:00:00Z'),
      author: { name: 'Bob Dev' },
    },
  ];

  const mockDashboardData = {
    project: {
      id: projId,
      key: 'ALPHA',
      name: 'Alpha Core',
      status: 'ACTIVE',
      description: 'Core platform services',
    },
    tasks: [],
    milestones: [],
    activity: [],
  };

  describe('1. AIContextBuilder.buildTaskContext Unit Tests', () => {
    it('constructs sanitized task context with dependencies, subtasks, and comments', async () => {
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
      expect(target.issue_key).toBe('ALPHA-12');
      expect(target.title).toBe('Migrate legacy auth to JWT rotation');
      expect(target.assignee).toBe('Alice Engineer');
      expect(target.labels).toEqual(['backend', 'security']);

      // Subtasks
      expect(target.subtasks).toHaveLength(2);
      expect(target.subtasks![0]!.status).toBe('DONE');
      expect(target.subtasks![1]!.status).toBe('TODO');

      // Dependencies
      expect(target.dependencies).toHaveLength(1);
      expect(target.dependencies![0]!.relationship).toBe('BLOCKING_PREDECESSOR');
      expect(target.dependencies![0]!.issue_key).toBe('ALPHA-10');

      // Comments
      expect(target.recent_comments).toHaveLength(1);
      expect(target.recent_comments![0]!.author).toBe('Bob Dev');

      // Health
      expect(ctx.health).toBeDefined();
    });

    it('throws when task is not found in the project', async () => {
      vi.spyOn(taskRepository, 'findById').mockResolvedValue(null);

      await expect(aiContextBuilder.buildTaskContext(projId, 'non-existent-task')).rejects.toThrow(
        /not found in project/
      );
    });
  });

  describe('2. POST /api/v1/organizations/:orgId/projects/:projId/ai/analyze - Task Intelligence', () => {
    let testOrgId: string;
    let testProjId: string;
    let memberAuthToken: string;
    let viewerAuthToken: string;

    beforeEach(async () => {
      vi.restoreAllMocks();
    });

    it('setup workspace and project for task tests', async () => {
      const ts = Date.now();
      // 1. Register owner
      const regOwner = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Task Owner',
          email: `task_owner_${ts}@taskflow.io`,
          password: 'Password123!',
          organizationName: `Task Org ${ts}`,
        });
      expect(regOwner.status).toBe(201);
      testOrgId = regOwner.body.data.defaultOrganization.id;
      const ownerToken = regOwner.body.data.accessToken;

      // 2. Create project
      const projRes = await request(app)
        .post(`/api/v1/organizations/${testOrgId}/projects`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Task AI Project', key: 'TAI' });
      expect(projRes.status).toBe(201);
      testProjId = projRes.body.data.id;

      // 3. Register regular member
      const regMember = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Task Member',
          email: `task_member_${ts}@taskflow.io`,
          password: 'Password123!',
          organizationName: `Member Org ${ts}`,
        });
      memberAuthToken = regMember.body.data.accessToken;
      const memberUserId = regMember.body.data.user.id;

      // Add to org and project as MEMBER
      await request(app)
        .post(`/api/v1/organizations/${testOrgId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: `task_member_${ts}@taskflow.io`, role: 'MEMBER' });

      await request(app)
        .post(`/api/v1/organizations/${testOrgId}/projects/${testProjId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: memberUserId, role: 'MEMBER' });

      // 4. Register viewer
      const regViewer = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Task Viewer',
          email: `task_viewer_${ts}@taskflow.io`,
          password: 'Password123!',
          organizationName: `Viewer Org ${ts}`,
        });
      viewerAuthToken = regViewer.body.data.accessToken;
      const viewerUserId = regViewer.body.data.user.id;

      await request(app)
        .post(`/api/v1/organizations/${testOrgId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: `task_viewer_${ts}@taskflow.io`, role: 'MEMBER' });

      await request(app)
        .post(`/api/v1/organizations/${testOrgId}/projects/${testProjId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: viewerUserId, role: 'VIEWER' });
    });

    it('validates taskId is a valid UUID', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${testOrgId}/projects/${testProjId}/ai/analyze`)
        .set('Authorization', `Bearer ${memberAuthToken}`)
        .send({ operation: 'TASK_SUMMARY', taskId: 'not-a-valid-uuid' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when taskId does not exist in the project', async () => {
      vi.spyOn(taskRepository, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/v1/organizations/${testOrgId}/projects/${testProjId}/ai/analyze`)
        .set('Authorization', `Bearer ${memberAuthToken}`)
        .send({ operation: 'TASK_SUMMARY', taskId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('successfully generates TASK_SUMMARY with dependency impact and recommendations', async () => {
      vi.spyOn(taskRepository, 'findById').mockResolvedValue(mockTask as any);
      vi.spyOn(dependencyRepository, 'findByTaskId').mockResolvedValue(mockDependencies as any);
      vi.spyOn(commentRepository, 'listByTask').mockResolvedValue(mockComments as any);
      vi.spyOn(projectDashboardRepository, 'getProjectDashboardData').mockResolvedValue(
        mockDashboardData as any
      );

      const mockAIResponse = {
        request_id: 'test-req-trace-id',
        operation: 'TASK_SUMMARY' as const,
        summary: 'Task ALPHA-12 is on track. Dependency ALPHA-10 is completed.',
        recommendations: [
          {
            title: 'Deploy migration script',
            description: 'Execute subtask 2 to unblock downstream integration.',
            priority: 'HIGH' as const,
            category: 'EXECUTION' as const,
          },
        ],
        attention_areas: [
          {
            title: 'Subtask Incomplete',
            description: 'Deployment script pending execution.',
            severity: 'MEDIUM' as const,
          },
        ],
        dependency_impact: {
          has_blocking_dependencies: false,
          description: 'All blocking predecessors are resolved.',
        },
        metadata: {
          model: 'gpt-4o-mini',
          provider: 'openai',
          prompt_tokens: 250,
          completion_tokens: 80,
          total_tokens: 330,
        },
      };

      const spyClient = vi.spyOn(aiClient, 'analyze').mockResolvedValue(mockAIResponse);

      const res = await request(app)
        .post(`/api/v1/organizations/${testOrgId}/projects/${testProjId}/ai/analyze`)
        .set('Authorization', `Bearer ${memberAuthToken}`)
        .set('X-Request-ID', 'custom-trace-uuid-123')
        .send({
          operation: 'TASK_SUMMARY',
          taskId,
          user_prompt: 'Assess risk before merge',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.operation).toBe('TASK_SUMMARY');
      expect(res.body.data.summary).toContain('ALPHA-12');
      expect(res.body.data.dependency_impact).toBeDefined();
      expect(res.body.data.dependency_impact.has_blocking_dependencies).toBe(false);
      expect(res.body.data.recommendations).toHaveLength(1);
      expect(res.body.data.recommendations[0].category).toBe('EXECUTION');

      // Verify aiClient payload received target_task
      expect(spyClient).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'TASK_SUMMARY',
          user_prompt: 'Assess risk before merge',
          context: expect.objectContaining({
            target_task: expect.objectContaining({
              task_id: taskId,
              issue_key: 'ALPHA-12',
            }),
          }),
        }),
        'custom-trace-uuid-123'
      );
    });

    it('rejects PROJECT VIEWER role with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${testOrgId}/projects/${testProjId}/ai/analyze`)
        .set('Authorization', `Bearer ${viewerAuthToken}`)
        .send({ operation: 'TASK_SUMMARY', taskId });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
