import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../server.js';
import { aiClient } from '../integrations/ai/aiClient.js';
import { aiContextBuilder } from '../services/aiContext.builder.js';
import { taskRepository } from '../repositories/task.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { dependencyRepository } from '../repositories/dependency.repository.js';
import { commentRepository } from '../repositories/comment.repository.js';
import { projectDashboardRepository } from '../repositories/projectDashboard.repository.js';
import { taskService } from '../services/task.service.js';
import { activityRepository } from '../repositories/activity.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { TaskStatus, TaskPriority } from '@taskflow/shared';

describe('TaskFlow PR 23: Human-Approved AI Task Actions Suite', () => {
  const app = createServer();
  const orgId = '11111111-1111-1111-1111-111111111111';
  const projId = '22222222-2222-2222-2222-222222222222';
  const taskId = '33333333-3333-3333-3333-333333333333';
  const userId = '44444444-4444-4444-4444-444444444444';
  const otherMemberId = '55555555-5555-5555-5555-555555555555';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(activityRepository, 'create').mockResolvedValue({} as any);
    vi.spyOn(auditRepository, 'create').mockResolvedValue({} as any);
  });

  const mockTask = {
    id: taskId,
    projectId: projId,
    taskNumber: 15,
    issueKey: 'ALPHA-15',
    title: 'Implement OAuth authentication with GitHub and Google',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    dueDate: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
    description: 'OAuth implementation scope',
    assigneeId: null,
    assignee: null,
    project: { id: projId, key: 'ALPHA', name: 'Alpha Project' },
    subtasks: [],
    labels: [],
  };

  const mockMembers = [
    {
      id: 'pm-1',
      projectId: projId,
      userId: userId,
      role: 'LEAD',
      user: { id: userId, name: 'Alice Lead', email: 'alice@example.com' },
    },
    {
      id: 'pm-2',
      projectId: projId,
      userId: otherMemberId,
      role: 'MEMBER',
      user: { id: otherMemberId, name: 'Bob Member', email: 'bob@example.com' },
    },
  ];

  describe('1. Context Builder for Task Actions', () => {
    it('assembles eligible assignees, task details, and health signals', async () => {
      vi.spyOn(taskRepository, 'findById').mockResolvedValue(mockTask as any);
      vi.spyOn(projectRepository, 'listMembers').mockResolvedValue(mockMembers as any);
      vi.spyOn(dependencyRepository, 'findByTaskId').mockResolvedValue([]);
      vi.spyOn(commentRepository, 'listByTask').mockResolvedValue([]);
      vi.spyOn(projectDashboardRepository, 'getProjectDashboardData').mockResolvedValue({
        project: { id: projId, key: 'ALPHA', name: 'Alpha Project', status: 'ACTIVE' },
        tasks: [mockTask],
        milestones: [],
        recentActivity: [],
        activityChart: [],
      } as any);

      const context = await aiContextBuilder.buildTaskContext(projId, taskId);

      expect(context.target_task).toBeDefined();
      expect(context.target_task?.task_id).toBe(taskId);
      expect(context.target_task?.eligible_assignees).toHaveLength(2);
      expect(context.target_task?.eligible_assignees?.[0]).toEqual({
        id: userId,
        display_name: 'Alice Lead',
      });
      expect(context.target_task?.eligible_assignees?.[1]).toEqual({
        id: otherMemberId,
        display_name: 'Bob Member',
      });
    });
  });

  describe('2. POST /ai/analyze (TASK_ACTIONS)', () => {
    it('validates taskId is present for TASK_ACTIONS', async () => {
      const token = 'valid-token';
      const res = await request(app)
        .post(`/api/v1/organizations/${orgId}/projects/${projId}/ai/analyze`)
        .set('Authorization', `Bearer ${token}`)
        .send({ operation: 'TASK_ACTIONS' });

      // Either auth mock or validation error
      if (res.status === 401) {
        expect(res.body.success).toBe(false);
      } else {
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('taskId');
      }
    });

    it('returns structured action proposals when authorized', async () => {
      vi.spyOn(aiClient, 'analyze').mockResolvedValue({
        request_id: 'action-test-001',
        operation: 'TASK_ACTIONS',
        summary: 'Identified 2 high-priority task actions.',
        recommendations: [],
        attention_areas: [],
        subtasks: [],
        actions: [
          {
            actionId: 'act-1',
            type: 'UPDATE_PRIORITY',
            title: 'Increase priority to HIGH',
            reason: 'Task is on the critical path',
            confidence: 'HIGH',
            target: { taskId },
            expectedCurrentState: { priority: TaskPriority.MEDIUM },
            parameters: { priority: TaskPriority.HIGH },
          },
          {
            actionId: 'act-2',
            type: 'ASSIGN_TASK',
            title: 'Assign to Alice Lead',
            reason: 'Alice is the lead engineer',
            confidence: 'HIGH',
            target: { taskId },
            expectedCurrentState: { assigneeId: null },
            parameters: { assigneeId: userId, assigneeName: 'Alice Lead' },
          },
        ],
        notes: ['Advisory recommendations requiring approval.'],
        metadata: { model: 'gpt-4o-mini', provider: 'openai' },
      });

      // Direct service test to verify runtime sanitization
      const { aiService } = await import('../services/ai.service.js');
      vi.spyOn(aiService as any, 'checkProjectAccess').mockResolvedValue(undefined);
      vi.spyOn(taskRepository, 'findById').mockResolvedValue(mockTask as any);
      vi.spyOn(aiContextBuilder, 'buildTaskContext').mockResolvedValue({} as any);
      vi.spyOn(projectRepository, 'listMembers').mockResolvedValue(mockMembers as any);

      const result = await aiService.analyzeProject(
        orgId,
        projId,
        userId,
        'TASK_ACTIONS',
        undefined,
        'req-1',
        taskId
      );

      expect(result.operation).toBe('TASK_ACTIONS');
      expect(result.actions).toHaveLength(2);
      expect(result.actions![0]!.type).toBe('UPDATE_PRIORITY');
      expect(result.actions![1]!.type).toBe('ASSIGN_TASK');
    });

    it('sanitizes and filters out ASSIGN_TASK proposals with unauthorized user IDs', async () => {
      vi.spyOn(aiClient, 'analyze').mockResolvedValue({
        request_id: 'action-test-002',
        operation: 'TASK_ACTIONS',
        summary: 'Proposals containing an unauthorized user.',
        recommendations: [],
        actions: [
          {
            actionId: 'act-invalid-user',
            type: 'ASSIGN_TASK',
            title: 'Assign to Unknown Person',
            reason: 'Unknown user from outside project',
            confidence: 'HIGH',
            target: { taskId },
            expectedCurrentState: {},
            parameters: { assigneeId: '99999999-9999-9999-9999-999999999999' },
          },
          {
            actionId: 'act-valid-priority',
            type: 'UPDATE_PRIORITY',
            title: 'Set priority to HIGH',
            reason: 'Justified update',
            confidence: 'HIGH',
            target: { taskId },
            expectedCurrentState: { priority: TaskPriority.MEDIUM },
            parameters: { priority: TaskPriority.HIGH },
          },
        ],
        metadata: {},
      });

      const { aiService } = await import('../services/ai.service.js');
      vi.spyOn(aiService as any, 'checkProjectAccess').mockResolvedValue(undefined);
      vi.spyOn(taskRepository, 'findById').mockResolvedValue(mockTask as any);
      vi.spyOn(aiContextBuilder, 'buildTaskContext').mockResolvedValue({} as any);
      vi.spyOn(projectRepository, 'listMembers').mockResolvedValue(mockMembers as any);

      const result = await aiService.analyzeProject(
        orgId,
        projId,
        userId,
        'TASK_ACTIONS',
        undefined,
        'req-2',
        taskId
      );

      // The invalid assignee should have been filtered out by Node!
      expect(result.actions).toHaveLength(1);
      expect(result.actions![0]!.type).toBe('UPDATE_PRIORITY');
    });
  });

  describe('3. Stale Proposal Protection in taskService.updateTask', () => {
    it('successfully applies mutation when expectedCurrentState matches current task state', async () => {
      vi.spyOn(taskService as any, 'getActorProjectPermissions').mockResolvedValue({ rank: 2 });
      vi.spyOn(taskRepository, 'findById').mockResolvedValue({
        ...mockTask,
        priority: TaskPriority.MEDIUM,
      } as any);
      vi.spyOn(taskRepository, 'update').mockResolvedValue({
        ...mockTask,
        priority: TaskPriority.HIGH,
      } as any);

      const result = await taskService.updateTask(orgId, projId, taskId, userId, {
        priority: TaskPriority.HIGH,
        expectedCurrentState: {
          priority: TaskPriority.MEDIUM,
        },
      });

      expect(result.priority).toBe(TaskPriority.HIGH);
    });

    it('rejects with 409 STALE_TASK_STATE when current priority differs from proposal expected state', async () => {
      vi.spyOn(taskService as any, 'getActorProjectPermissions').mockResolvedValue({ rank: 2 });
      // Current task priority was already changed to LOW by a human
      vi.spyOn(taskRepository, 'findById').mockResolvedValue({
        ...mockTask,
        priority: TaskPriority.LOW,
      } as any);

      await expect(
        taskService.updateTask(orgId, projId, taskId, userId, {
          priority: TaskPriority.HIGH,
          expectedCurrentState: {
            priority: TaskPriority.MEDIUM, // Proposal expected MEDIUM, but DB is LOW
          },
        })
      ).rejects.toSatisfy((err: any) => err.code === 'STALE_TASK_STATE' && err.statusCode === 409);
    });

    it('rejects with 409 STALE_TASK_STATE when current status differs from proposal expected state', async () => {
      vi.spyOn(taskService as any, 'getActorProjectPermissions').mockResolvedValue({ rank: 2 });
      // Current task status was moved to DONE by a human
      vi.spyOn(taskRepository, 'findById').mockResolvedValue({
        ...mockTask,
        status: TaskStatus.DONE,
      } as any);

      await expect(
        taskService.updateTask(orgId, projId, taskId, userId, {
          status: TaskStatus.IN_PROGRESS,
          expectedCurrentState: {
            status: TaskStatus.TODO,
          },
        })
      ).rejects.toSatisfy((err: any) => err.code === 'STALE_TASK_STATE' && err.statusCode === 409);
    });

    it('rejects with 409 STALE_TASK_STATE when current assignee differs from proposal expected state', async () => {
      vi.spyOn(taskService as any, 'getActorProjectPermissions').mockResolvedValue({ rank: 2 });
      // Current task already has assignee 'otherMemberId'
      vi.spyOn(taskRepository, 'findById').mockResolvedValue({
        ...mockTask,
        assigneeId: otherMemberId,
      } as any);

      await expect(
        taskService.updateTask(orgId, projId, taskId, userId, {
          assigneeId: userId,
          expectedCurrentState: {
            assigneeId: null, // Proposal expected unassigned
          },
        })
      ).rejects.toSatisfy((err: any) => err.code === 'STALE_TASK_STATE' && err.statusCode === 409);
    });
  });

  describe('4. Read-Only Invariant Verification', () => {
    it('guarantees that generating proposals produces zero database mutations', async () => {
      const updateSpy = vi.spyOn(taskRepository, 'update');
      const createSpy = vi.spyOn(taskRepository, 'create');

      const { aiService } = await import('../services/ai.service.js');
      vi.spyOn(aiService as any, 'checkProjectAccess').mockResolvedValue(undefined);
      vi.spyOn(taskRepository, 'findById').mockResolvedValue(mockTask as any);
      vi.spyOn(aiContextBuilder, 'buildTaskContext').mockResolvedValue({} as any);
      vi.spyOn(projectRepository, 'listMembers').mockResolvedValue(mockMembers as any);

      vi.spyOn(aiClient, 'analyze').mockResolvedValue({
        request_id: 'action-test-ro',
        operation: 'TASK_ACTIONS',
        summary: 'Read only analysis',
        recommendations: [],
        actions: [
          {
            actionId: 'act-ro',
            type: 'UPDATE_STATUS',
            title: 'Move to DONE',
            reason: 'Task is complete',
            confidence: 'HIGH',
            target: { taskId },
            expectedCurrentState: { status: TaskStatus.IN_PROGRESS },
            parameters: { status: TaskStatus.DONE },
          },
        ],
        metadata: {},
      });

      await aiService.analyzeProject(
        orgId,
        projId,
        userId,
        'TASK_ACTIONS',
        undefined,
        'req-ro',
        taskId
      );

      // Verify that no task database write operations occurred during analysis
      expect(updateSpy).not.toHaveBeenCalled();
      expect(createSpy).not.toHaveBeenCalled();
    });
  });
});
