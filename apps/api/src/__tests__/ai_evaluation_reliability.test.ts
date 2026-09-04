import { describe, it, expect, beforeEach, vi } from 'vitest';
import { aiService } from '../services/ai.service.js';
import { aiClient } from '../integrations/ai/aiClient.js';
import { aiContextBuilder } from '../services/aiContext.builder.js';
import { taskRepository } from '../repositories/task.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { activityRepository } from '../repositories/activity.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { taskService } from '../services/task.service.js';
import { TaskPriority, TaskStatus } from '@taskflow/shared';
import { AppError } from '../middleware/errorHandler.js';

describe('PR24: AI Evaluation, Reliability & Safety Invariant Suite', () => {
  const orgId = '11111111-1111-1111-1111-111111111111';
  const projId = '22222222-2222-2222-2222-222222222222';
  const taskId = '33333333-3333-3333-3333-333333333333';
  const userId = '44444444-4444-4444-4444-444444444444';
  const eligibleMemberId = '55555555-5555-5555-5555-555555555555';
  const unauthorizedUserId = '99999999-9999-9999-9999-999999999999';

  const mockTask = {
    id: taskId,
    projectId: projId,
    taskNumber: 24,
    issueKey: 'PROJ-24',
    title: 'Deploy microservice architecture to production',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    dueDate: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
    description: 'Initial deployment task',
    assigneeId: null,
    assignee: null,
    project: { id: projId, key: 'PROJ', name: 'Project Safe' },
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
      userId: eligibleMemberId,
      role: 'MEMBER',
      user: { id: eligibleMemberId, name: 'Bob Member', email: 'bob@example.com' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(aiService as any, 'checkProjectAccess').mockResolvedValue(undefined);
    vi.spyOn(activityRepository, 'create').mockResolvedValue({} as any);
    vi.spyOn(auditRepository, 'create').mockResolvedValue({} as any);
  });

  // ============================================================================
  // 1. MUTATION INVARIANT (Section 13)
  // Hard test invariant: AI analysis alone MUST NOT mutate database state.
  // ============================================================================
  describe('Invariant 1: Zero-Mutation Authority (AI Analysis Read-Only)', () => {
    it('TASK_DECOMPOSITION analysis produces proposals without modifying tasks in database', async () => {
      vi.spyOn(taskRepository, 'findById').mockResolvedValue(mockTask as any);
      vi.spyOn(aiContextBuilder, 'buildTaskContext').mockResolvedValue({} as any);
      vi.spyOn(projectRepository, 'listMembers').mockResolvedValue(mockMembers as any);

      const createSpy = vi.spyOn(taskRepository, 'create');
      const updateSpy = vi.spyOn(taskRepository, 'update');
      const deleteSpy = vi.spyOn(taskRepository, 'delete');

      vi.spyOn(aiClient, 'analyze').mockResolvedValue({
        request_id: 'eval-req-decomp',
        operation: 'TASK_DECOMPOSITION',
        summary: 'Proposed 3 sequential implementation subtasks.',
        recommendations: [],
        subtasks: [
          {
            title: 'Verify signature',
            description: 'Stripe webhook signature validation',
            order: 1,
          },
          {
            title: 'Record ledger entry',
            description: 'Idempotent insert into database',
            order: 2,
          },
        ],
        notes: ['Read-only proposal'],
        metadata: {},
      });

      const response = await aiService.analyzeProject(
        orgId,
        projId,
        userId,
        'TASK_DECOMPOSITION',
        undefined,
        'req-decomp-inv',
        taskId
      );

      // Verify AI returned structured suggestions
      expect(response.subtasks).toHaveLength(2);

      // Verify ZERO database mutations were invoked
      expect(createSpy).not.toHaveBeenCalled();
      expect(updateSpy).not.toHaveBeenCalled();
      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it('TASK_ACTIONS analysis produces action proposals without applying them', async () => {
      vi.spyOn(taskRepository, 'findById').mockResolvedValue(mockTask as any);
      vi.spyOn(aiContextBuilder, 'buildTaskContext').mockResolvedValue({} as any);
      vi.spyOn(projectRepository, 'listMembers').mockResolvedValue(mockMembers as any);

      const updateSpy = vi.spyOn(taskRepository, 'update');

      vi.spyOn(aiClient, 'analyze').mockResolvedValue({
        request_id: 'eval-req-actions',
        operation: 'TASK_ACTIONS',
        summary: 'Proposes assigning task and updating priority.',
        recommendations: [],
        actions: [
          {
            actionId: 'act-assign-01',
            type: 'ASSIGN_TASK',
            title: 'Assign to Bob Member',
            reason: 'Bob has backend engineering bandwidth.',
            confidence: 'HIGH',
            target: { taskId },
            expectedCurrentState: { assigneeId: null },
            parameters: { assigneeId: eligibleMemberId, assigneeName: 'Bob Member' },
          },
        ],
        metadata: {},
      });

      const response = await aiService.analyzeProject(
        orgId,
        projId,
        userId,
        'TASK_ACTIONS',
        undefined,
        'req-act-inv',
        taskId
      );

      expect(response.actions).toHaveLength(1);
      // AI analysis alone MUST NOT mutate the task repository
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 2. HUMAN APPROVAL INVARIANT (Section 14)
  // AI proposal != mutation. Human must explicitly execute mutation API.
  // ============================================================================
  describe('Invariant 2: Human Approval Invariant (Proposal != Mutation)', () => {
    it('requires explicit user action to mutate state following an AI proposal', async () => {
      // Step A: Generate proposal via AI
      vi.spyOn(taskRepository, 'findById').mockResolvedValue(mockTask as any);
      vi.spyOn(aiContextBuilder, 'buildTaskContext').mockResolvedValue({} as any);
      vi.spyOn(projectRepository, 'listMembers').mockResolvedValue(mockMembers as any);
      const updateSpy = vi.spyOn(taskRepository, 'update');

      vi.spyOn(aiClient, 'analyze').mockResolvedValue({
        request_id: 'eval-req-human-approval',
        operation: 'TASK_ACTIONS',
        summary: 'Propose assigning unassigned task.',
        recommendations: [],
        actions: [
          {
            actionId: 'act-1',
            type: 'ASSIGN_TASK',
            title: 'Assign to Alice Lead',
            reason: 'Task is unassigned.',
            confidence: 'HIGH',
            target: { taskId },
            expectedCurrentState: { assigneeId: null },
            parameters: { assigneeId: userId, assigneeName: 'Alice Lead' },
          },
        ],
        metadata: {},
      });

      const proposal = await aiService.analyzeProject(
        orgId,
        projId,
        userId,
        'TASK_ACTIONS',
        undefined,
        'req-prop',
        taskId
      );

      expect(proposal.actions).toHaveLength(1);
      expect(updateSpy).not.toHaveBeenCalled();

      // Step B: Human explicitly approves and applies the proposal via taskService.updateTask
      vi.spyOn(taskService as any, 'getActorProjectPermissions').mockResolvedValue({ rank: 2 });
      vi.spyOn(projectRepository, 'findMember').mockResolvedValue(mockMembers[0] as any);
      updateSpy.mockResolvedValue({
        ...mockTask,
        assigneeId: userId,
      } as any);

      const approvedMutation = await taskService.updateTask(orgId, projId, taskId, userId, {
        assigneeId: proposal.actions![0]!.parameters.assigneeId,
        expectedCurrentState: proposal.actions![0]!.expectedCurrentState,
      });

      expect(updateSpy).toHaveBeenCalledWith(
        taskId,
        projId,
        expect.objectContaining({ assigneeId: userId })
      );
      expect(approvedMutation.assigneeId).toBe(userId);
    });
  });

  // ============================================================================
  // 3. STALE ACTION EVALUATION (Section 15)
  // Regression test: Stale proposal fails with 409 STALE_TASK_STATE and preserves newer state.
  // ============================================================================
  describe('Invariant 3: Stale Proposal Rejection with 409 Conflict', () => {
    it('rejects stale action proposal when task state changed concurrently', async () => {
      vi.spyOn(taskService as any, 'getActorProjectPermissions').mockResolvedValue({ rank: 2 });

      // Action proposal was generated when task priority was LOW
      const proposalExpectedState = { priority: TaskPriority.LOW };

      // Meanwhile, another user/human updated task priority to URGENT
      vi.spyOn(taskRepository, 'findById').mockResolvedValue({
        ...mockTask,
        priority: TaskPriority.URGENT,
      } as any);

      const updateSpy = vi.spyOn(taskRepository, 'update');

      // Attempt applying the older proposal
      await expect(
        taskService.updateTask(orgId, projId, taskId, userId, {
          priority: TaskPriority.HIGH,
          expectedCurrentState: proposalExpectedState,
        })
      ).rejects.toThrowError(AppError);

      try {
        await taskService.updateTask(orgId, projId, taskId, userId, {
          priority: TaskPriority.HIGH,
          expectedCurrentState: proposalExpectedState,
        });
      } catch (err: any) {
        expect(err.statusCode).toBe(409);
        expect(err.code).toBe('STALE_TASK_STATE');
      }

      // Assert newer database state remains untouched
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 4. NO-INVENTION & RUNTIME ASSIGNEE BOUNDING (Section 10 & 12)
  // Runtime filtering must drop uneligible/external assignees proposed by model.
  // ============================================================================
  describe('Invariant 4: Runtime Defense-in-Depth Against Hallucinated Assignees', () => {
    it('filters out unauthorized/external candidate from AI action proposals', async () => {
      vi.spyOn(taskRepository, 'findById').mockResolvedValue(mockTask as any);
      vi.spyOn(aiContextBuilder, 'buildTaskContext').mockResolvedValue({} as any);
      // Project only has Alice and Bob
      vi.spyOn(projectRepository, 'listMembers').mockResolvedValue(mockMembers as any);

      // Model hallucinated or was injected to assign Mallory (not in project)
      vi.spyOn(aiClient, 'analyze').mockResolvedValue({
        request_id: 'eval-req-injection',
        operation: 'TASK_ACTIONS',
        summary: 'Assign task proposal',
        recommendations: [],
        actions: [
          {
            actionId: 'act-mallory',
            type: 'ASSIGN_TASK',
            title: 'Assign to Mallory External',
            reason: 'Attacker injection attempt',
            confidence: 'HIGH',
            target: { taskId },
            expectedCurrentState: {},
            parameters: { assigneeId: unauthorizedUserId, assigneeName: 'Mallory External' },
          },
          {
            actionId: 'act-valid',
            type: 'ASSIGN_TASK',
            title: 'Assign to Bob Member',
            reason: 'Eligible member',
            confidence: 'HIGH',
            target: { taskId },
            expectedCurrentState: {},
            parameters: { assigneeId: eligibleMemberId, assigneeName: 'Bob Member' },
          },
        ],
        metadata: {},
      });

      const response = await aiService.analyzeProject(
        orgId,
        projId,
        userId,
        'TASK_ACTIONS',
        undefined,
        'req-filter-test',
        taskId
      );

      // The unauthorized candidate was safely dropped by Node runtime validation!
      expect(response.actions).toHaveLength(1);
      expect(response.actions![0]!.parameters.assigneeId).toBe(eligibleMemberId);
    });
  });

  // ============================================================================
  // 5. PROVIDER FAILURE HANDLING (Section 20 & 22)
  // Safely maps provider timeout, 429, 500 without leaking secrets.
  // ============================================================================
  describe('Invariant 5: Safe Failure Mapping & Telemetry Boundaries', () => {
    it('maps downstream 429 rate limit to safe application error', async () => {
      vi.spyOn(taskRepository, 'findById').mockResolvedValue(mockTask as any);
      vi.spyOn(aiContextBuilder, 'buildTaskContext').mockResolvedValue({} as any);
      vi.spyOn(projectRepository, 'listMembers').mockResolvedValue(mockMembers as any);

      vi.spyOn(aiClient, 'analyze').mockRejectedValue(
        new AppError('AI_RATE_LIMIT', 'AI provider rate limit exceeded. Please retry shortly.', 429)
      );

      try {
        await aiService.analyzeProject(
          orgId,
          projId,
          userId,
          'TASK_ACTIONS',
          undefined,
          'req-rate-limit',
          taskId
        );
        expect.unreachable('Should have thrown rate limit error');
      } catch (err: any) {
        expect(err.statusCode).toBe(429);
        expect(err.message).toContain('rate limit');
      }
    });

    it('maps downstream timeout to 504 Gateway Timeout cleanly', async () => {
      vi.spyOn(taskRepository, 'findById').mockResolvedValue(mockTask as any);
      vi.spyOn(aiContextBuilder, 'buildTaskContext').mockResolvedValue({} as any);
      vi.spyOn(projectRepository, 'listMembers').mockResolvedValue(mockMembers as any);

      vi.spyOn(aiClient, 'analyze').mockRejectedValue(
        new AppError('AI_GATEWAY_TIMEOUT', 'AI subsystem request timed out after 15000ms', 504)
      );

      try {
        await aiService.analyzeProject(
          orgId,
          projId,
          userId,
          'TASK_SUMMARY',
          undefined,
          'req-timeout',
          taskId
        );
        expect.unreachable('Should have thrown timeout error');
      } catch (err: any) {
        expect(err.statusCode).toBe(504);
        expect(err.message).toContain('timed out');
        // Verify no API token was exposed in the error message
        expect(err.message).not.toContain('sk-');
        expect(err.message).not.toContain('Bearer');
      }
    });
  });
});
