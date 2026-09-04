import {
  TaskStatus,
  TaskPriority,
  UserRole,
  ProjectRole,
  ActivityActionType,
  AuditAction,
  ActorType,
  AuditSource,
} from '@prisma/client';
import { taskRepository } from '../repositories/task.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { activityRepository } from '../repositories/activity.repository.js';
import { auditService } from './audit.service.js';
import { notificationService } from './notification.service.js';
import { entitlementService } from './entitlement.service.js';
import { LimitKey } from '@taskflow/shared';
import { AppError } from '../middleware/errorHandler.js';

const RANK_SUPER = 5;
const RANK_LEAD = 4;
const RANK_ADMIN = 3;
const RANK_MEMBER = 2;
const RANK_VIEWER = 1;

const getRankForRole = (role: ProjectRole | 'SUPER_ORG_ADMIN'): number => {
  if (role === 'SUPER_ORG_ADMIN') return RANK_SUPER;
  if (role === ProjectRole.LEAD) return RANK_LEAD;
  if (role === ProjectRole.ADMIN) return RANK_ADMIN;
  if (role === ProjectRole.MEMBER) return RANK_MEMBER;
  if (role === ProjectRole.VIEWER) return RANK_VIEWER;
  return 0;
};

export class TaskService {
  /**
   * Verifies that the project exists, belongs to the specified organization,
   * and that the actor has appropriate project-level authorization.
   */
  private async getActorProjectPermissions(
    organizationId: string,
    projectId: string,
    actorUserId: string
  ) {
    const project = await projectRepository.findById(projectId, organizationId);
    if (!project) {
      throw new AppError('PROJECT_NOT_FOUND', 'Project not found in this organization', 404);
    }

    // Check organization membership first
    const orgMember = await organizationRepository.findMember(organizationId, actorUserId);
    if (!orgMember) {
      throw new AppError(
        'NOT_ORGANIZATION_MEMBER',
        'User is not a member of this organization',
        403
      );
    }

    // Org OWNER / ADMIN enjoy super-admin privileges over all projects
    if (orgMember.role === UserRole.OWNER || orgMember.role === UserRole.ADMIN) {
      return {
        project,
        role: 'SUPER_ORG_ADMIN' as const,
        rank: RANK_SUPER,
      };
    }

    // Otherwise, must be an explicit project member
    const projMember = await projectRepository.findMember(projectId, actorUserId);
    if (!projMember) {
      throw new AppError('NOT_PROJECT_MEMBER', 'User is not a member of this project', 403);
    }

    return {
      project,
      role: projMember.role,
      rank: getRankForRole(projMember.role),
    };
  }

  /**
   * Validates that an assignee belongs to the project.
   */
  private async validateAssignee(projectId: string, assigneeId: string | null | undefined) {
    if (!assigneeId) return;

    const member = await projectRepository.findMember(projectId, assigneeId);
    if (!member) {
      throw new AppError(
        'ASSIGNEE_NOT_IN_PROJECT',
        'Task assignee must be an authorized member of this project',
        400
      );
    }
  }

  async createTask(
    organizationId: string,
    projectId: string,
    actorUserId: string,
    data: {
      title: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string | null;
      dueDate?: string | null;
      estimateHours?: number | null;
    }
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    if (rank < RANK_MEMBER) {
      throw new AppError(
        'INSUFFICIENT_PERMISSIONS',
        'Viewers cannot create tasks in this project',
        403
      );
    }

    await this.validateAssignee(projectId, data.assigneeId);

    // Entitlement enforcement: Verify organization active task limit if task is active
    if (data.status !== TaskStatus.CANCELLED) {
      await entitlementService.requireCapacity(
        organizationId,
        LimitKey.MAX_ACTIVE_TASKS,
        1,
        actorUserId
      );
    }
    const planInfo = await entitlementService.getOrganizationPlan(organizationId, true);

    const task = await taskRepository.create(
      projectId,
      {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        assigneeId: data.assigneeId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimateHours: data.estimateHours,
      },
      actorUserId,
      organizationId,
      planInfo.limits.maxActiveTasks
    );

    // Record activity
    await activityRepository.create({
      projectId,
      taskId: task.id,
      actorId: actorUserId,
      actionType: ActivityActionType.TASK_CREATED,
      metadata: {
        taskNumber: task.taskNumber,
        issueKey: task.issueKey,
        taskTitle: task.title,
      },
    });

    // Notify assigned user if assigned at creation
    if (task.assigneeId) {
      await notificationService.notifyTaskAssigned({
        taskId: task.id,
        projectId,
        taskNumber: task.taskNumber,
        issueKey: task.issueKey,
        taskTitle: task.title,
        assigneeId: task.assigneeId,
        actorId: actorUserId,
      });
    }

    // Record audit event
    await auditService.record({
      organizationId,
      projectId,
      actorUserId,
      actorType: ActorType.USER,
      action: AuditAction.TASK_CREATED,
      resourceType: 'Task',
      resourceId: task.id,
      source: AuditSource.USER,
      metadata: {
        taskId: task.id,
        taskNumber: task.taskNumber,
        issueKey: task.issueKey,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
      },
    });

    return task;
  }

  async listTasks(
    organizationId: string,
    projectId: string,
    actorUserId: string,
    filter?: {
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string;
      search?: string;
      archived?: boolean;
      labelIds?: string[];
      labelMatch?: 'ANY' | 'ALL';
      milestoneId?: string | 'none';
    }
  ) {
    // Read access requires org membership + project membership (or org admin)
    await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    return taskRepository.listByProject(projectId, filter);
  }

  async getTask(organizationId: string, projectId: string, taskId: string, actorUserId: string) {
    await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    const task = await taskRepository.findById(taskId, projectId);
    if (!task) {
      throw new AppError('TASK_NOT_FOUND', 'Task not found in this project', 404);
    }

    const subtaskCount = task.subtasks.length;
    const completedSubtaskCount = task.subtasks.filter(s => s.isCompleted).length;

    return {
      ...task,
      subtaskCount,
      completedSubtaskCount,
    };
  }

  async updateTask(
    organizationId: string,
    projectId: string,
    taskId: string,
    actorUserId: string,
    data: {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string | null;
      dueDate?: string | null;
      estimateHours?: number | null;
      milestoneId?: string | null;
      source?: 'USER' | 'SYSTEM' | 'AI' | 'AI_ASSISTED';
      expectedCurrentState?: {
        status?: TaskStatus;
        priority?: TaskPriority;
        dueDate?: string | null;
        assigneeId?: string | null;
      };
    }
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    if (rank < RANK_MEMBER) {
      throw new AppError('INSUFFICIENT_PERMISSIONS', 'Viewers cannot modify tasks', 403);
    }

    const task = await taskRepository.findById(taskId, projectId);
    if (!task) {
      throw new AppError('TASK_NOT_FOUND', 'Task not found in this project', 404);
    }

    // Guard against stale updates if expectedCurrentState was provided
    if (data.expectedCurrentState) {
      const exp = data.expectedCurrentState;
      let isStale = false;
      let staleReason = '';

      if (exp.status !== undefined && task.status !== exp.status) {
        isStale = true;
        staleReason = `Task status has changed from ${exp.status} to ${task.status}. Please refresh.`;
      } else if (exp.priority !== undefined && task.priority !== exp.priority) {
        isStale = true;
        staleReason = `Task priority has changed from ${exp.priority} to ${task.priority}. Please refresh.`;
      } else if (exp.assigneeId !== undefined && task.assigneeId !== exp.assigneeId) {
        isStale = true;
        staleReason = 'Task assignee has changed. Please refresh.';
      } else if (exp.dueDate !== undefined) {
        const taskDueIso = task.dueDate ? new Date(task.dueDate).toISOString() : null;
        const expDueIso = exp.dueDate ? new Date(exp.dueDate).toISOString() : null;
        if (taskDueIso !== expDueIso) {
          isStale = true;
          staleReason = 'Task due date has changed. Please refresh.';
        }
      }

      if (isStale) {
        await auditService.record({
          organizationId,
          projectId,
          actorUserId,
          actorType: ActorType.USER,
          action: AuditAction.AI_ACTION_REJECTED,
          resourceType: 'Task',
          resourceId: taskId,
          source: AuditSource.AI_ASSISTED,
          metadata: {
            taskId,
            reasonCode: 'STALE_TASK_STATE',
          },
        });

        throw new AppError('STALE_TASK_STATE', staleReason, 409);
      }
    }

    if (data.assigneeId !== undefined) {
      await this.validateAssignee(projectId, data.assigneeId);
    }

    const updated = await taskRepository.update(taskId, projectId, {
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      assigneeId: data.assigneeId,
      dueDate:
        data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
      estimateHours: data.estimateHours,
      milestoneId: data.milestoneId,
    });

    // Detect changes and generate relevant activities
    if (data.status && data.status !== task.status) {
      await activityRepository.create({
        projectId,
        taskId,
        actorId: actorUserId,
        actionType: ActivityActionType.TASK_STATUS_CHANGED,
        fieldChanged: 'status',
        oldValue: task.status,
        newValue: data.status,
        metadata: {
          taskNumber: task.taskNumber,
          issueKey: task.issueKey,
          taskTitle: task.title,
          from: task.status,
          to: data.status,
        },
      });

      // Notify assignee if status changed
      await notificationService.notifyTaskStatusChanged({
        taskId: task.id,
        projectId,
        taskNumber: task.taskNumber,
        issueKey: task.issueKey,
        taskTitle: task.title,
        fromStatus: task.status,
        toStatus: data.status,
        assigneeId: task.assigneeId,
        actorId: actorUserId,
      });
    }

    if (data.priority && data.priority !== task.priority) {
      await activityRepository.create({
        projectId,
        taskId,
        actorId: actorUserId,
        actionType: ActivityActionType.TASK_PRIORITY_CHANGED,
        fieldChanged: 'priority',
        oldValue: task.priority,
        newValue: data.priority,
        metadata: {
          taskNumber: task.taskNumber,
          issueKey: task.issueKey,
          taskTitle: task.title,
          from: task.priority,
          to: data.priority,
        },
      });
    }

    if (data.assigneeId !== undefined && data.assigneeId !== task.assigneeId) {
      const isUnassign = !data.assigneeId;
      await activityRepository.create({
        projectId,
        taskId,
        actorId: actorUserId,
        actionType: isUnassign
          ? ActivityActionType.TASK_UNASSIGNED
          : ActivityActionType.TASK_ASSIGNED,
        fieldChanged: 'assigneeId',
        oldValue: task.assigneeId,
        newValue: data.assigneeId ?? null,
        metadata: {
          taskNumber: task.taskNumber,
          issueKey: task.issueKey,
          taskTitle: task.title,
          previousAssigneeId: task.assigneeId,
          newAssigneeId: data.assigneeId ?? null,
        },
      });

      // Notify previous assignee of unassignment if previously assigned
      if (task.assigneeId) {
        await notificationService.notifyTaskUnassigned({
          taskId: task.id,
          projectId,
          taskNumber: task.taskNumber,
          issueKey: task.issueKey,
          taskTitle: task.title,
          previousAssigneeId: task.assigneeId,
          actorId: actorUserId,
        });
      }

      // Notify new assignee of assignment if newly assigned
      if (data.assigneeId) {
        await notificationService.notifyTaskAssigned({
          taskId: task.id,
          projectId,
          taskNumber: task.taskNumber,
          issueKey: task.issueKey,
          taskTitle: task.title,
          assigneeId: data.assigneeId,
          actorId: actorUserId,
        });
      }
    }

    if (data.milestoneId !== undefined && data.milestoneId !== task.milestoneId) {
      await activityRepository.create({
        projectId,
        taskId,
        actorId: actorUserId,
        actionType: ActivityActionType.TASK_MILESTONE_CHANGED,
        fieldChanged: 'milestoneId',
        oldValue: task.milestoneId,
        newValue: data.milestoneId ?? null,
        metadata: {
          taskNumber: task.taskNumber,
          issueKey: task.issueKey,
          taskTitle: task.title,
          previousMilestoneId: task.milestoneId,
          newMilestoneId: data.milestoneId ?? null,
        },
      });
    }

    if (
      !data.status &&
      !data.priority &&
      data.assigneeId === undefined &&
      data.milestoneId === undefined &&
      (data.title ||
        data.description !== undefined ||
        data.dueDate !== undefined ||
        data.estimateHours !== undefined)
    ) {
      await activityRepository.create({
        projectId,
        taskId,
        actorId: actorUserId,
        actionType: ActivityActionType.TASK_UPDATED,
        metadata: {
          taskNumber: task.taskNumber,
          issueKey: task.issueKey,
          taskTitle: updated.title,
        },
      });
    }

    // Compute change delta for audit trail
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (data.status && data.status !== task.status) {
      changes.status = { from: task.status, to: data.status };
    }
    if (data.priority && data.priority !== task.priority) {
      changes.priority = { from: task.priority, to: data.priority };
    }
    if (data.assigneeId !== undefined && data.assigneeId !== task.assigneeId) {
      changes.assigneeId = { from: task.assigneeId, to: data.assigneeId };
    }
    if (data.title && data.title !== task.title) {
      changes.title = { from: task.title, to: data.title };
    }
    if (data.dueDate !== undefined) {
      const oldDue = task.dueDate ? new Date(task.dueDate).toISOString() : null;
      const newDue = data.dueDate ? new Date(data.dueDate).toISOString() : null;
      if (oldDue !== newDue) {
        changes.dueDate = { from: oldDue, to: newDue };
      }
    }
    if (data.estimateHours !== undefined && data.estimateHours !== task.estimateHours) {
      changes.estimateHours = { from: task.estimateHours, to: data.estimateHours };
    }

    const isAiAssisted = data.source === 'AI_ASSISTED' || !!data.expectedCurrentState;
    if (isAiAssisted) {
      await auditService.record({
        organizationId,
        projectId,
        actorUserId,
        actorType: ActorType.USER,
        action: AuditAction.AI_ACTION_APPLIED,
        resourceType: 'Task',
        resourceId: taskId,
        source: AuditSource.AI_ASSISTED,
        metadata: {
          taskId,
          changes,
        },
      });
    } else if (Object.keys(changes).length > 0) {
      let action: AuditAction = AuditAction.TASK_UPDATED;
      if (changes.status && Object.keys(changes).length === 1) {
        action = AuditAction.TASK_STATUS_CHANGED;
      } else if (changes.assigneeId && Object.keys(changes).length === 1) {
        action = !data.assigneeId ? AuditAction.TASK_UNASSIGNED : AuditAction.TASK_ASSIGNED;
      }

      await auditService.record({
        organizationId,
        projectId,
        actorUserId,
        actorType: ActorType.USER,
        action,
        resourceType: 'Task',
        resourceId: taskId,
        source: AuditSource.USER,
        metadata: {
          taskId,
          changes,
        },
      });
    }

    return updated;
  }

  async updateTaskStatus(
    organizationId: string,
    projectId: string,
    taskId: string,
    actorUserId: string,
    status: TaskStatus
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    if (rank < RANK_MEMBER) {
      throw new AppError('INSUFFICIENT_PERMISSIONS', 'Viewers cannot modify task status', 403);
    }

    const task = await taskRepository.findById(taskId, projectId);
    if (!task) {
      throw new AppError('TASK_NOT_FOUND', 'Task not found in this project', 404);
    }

    const updated = await taskRepository.updateStatus(taskId, projectId, status);

    if (status !== task.status) {
      await activityRepository.create({
        projectId,
        taskId,
        actorId: actorUserId,
        actionType: ActivityActionType.TASK_STATUS_CHANGED,
        fieldChanged: 'status',
        oldValue: task.status,
        newValue: status,
        metadata: {
          taskNumber: task.taskNumber,
          issueKey: task.issueKey,
          taskTitle: task.title,
          from: task.status,
          to: status,
        },
      });

      // Notify assignee if status changed
      await notificationService.notifyTaskStatusChanged({
        taskId: task.id,
        projectId,
        taskNumber: task.taskNumber,
        issueKey: task.issueKey,
        taskTitle: task.title,
        fromStatus: task.status,
        toStatus: status,
        assigneeId: task.assigneeId,
        actorId: actorUserId,
      });

      await auditService.record({
        organizationId,
        projectId,
        actorUserId,
        actorType: ActorType.USER,
        action: AuditAction.TASK_STATUS_CHANGED,
        resourceType: 'Task',
        resourceId: taskId,
        source: AuditSource.USER,
        metadata: {
          taskId,
          changes: {
            status: { from: task.status, to: status },
          },
        },
      });
    }

    return updated;
  }

  async archiveTask(
    organizationId: string,
    projectId: string,
    taskId: string,
    actorUserId: string
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    if (rank < RANK_ADMIN) {
      throw new AppError(
        'INSUFFICIENT_PERMISSIONS',
        'Only project Admins and Leads can archive tasks',
        403
      );
    }

    const task = await taskRepository.findById(taskId, projectId);
    if (!task) {
      throw new AppError('TASK_NOT_FOUND', 'Task not found in this project', 404);
    }

    const archived = await taskRepository.archive(taskId, projectId);

    await auditService.record({
      organizationId,
      projectId,
      actorUserId,
      actorType: ActorType.USER,
      action: AuditAction.TASK_ARCHIVED,
      resourceType: 'Task',
      resourceId: taskId,
      source: AuditSource.USER,
      metadata: {
        taskId,
      },
    });

    return archived;
  }

  async unarchiveTask(
    organizationId: string,
    projectId: string,
    taskId: string,
    actorUserId: string
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    if (rank < RANK_ADMIN) {
      throw new AppError(
        'INSUFFICIENT_PERMISSIONS',
        'Only project Admins and Leads can restore archived tasks',
        403
      );
    }

    const task = await taskRepository.findById(taskId, projectId);
    if (!task) {
      throw new AppError('TASK_NOT_FOUND', 'Task not found in this project', 404);
    }

    return taskRepository.unarchive(taskId, projectId);
  }

  async deleteTask(organizationId: string, projectId: string, taskId: string, actorUserId: string) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    if (rank < RANK_ADMIN) {
      throw new AppError(
        'INSUFFICIENT_PERMISSIONS',
        'Only project Admins and Leads can permanently delete tasks',
        403
      );
    }

    const task = await taskRepository.findById(taskId, projectId);
    if (!task) {
      throw new AppError('TASK_NOT_FOUND', 'Task not found in this project', 404);
    }

    await taskRepository.delete(taskId, projectId);
    return { success: true, message: 'Task permanently deleted' };
  }

  // ========================================================================
  // Subtasks Service
  // ========================================================================

  async createSubtask(
    organizationId: string,
    projectId: string,
    taskId: string,
    actorUserId: string,
    data: {
      title: string;
      assigneeId?: string | null;
    }
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    if (rank < RANK_MEMBER) {
      throw new AppError('INSUFFICIENT_PERMISSIONS', 'Viewers cannot create subtasks', 403);
    }

    const task = await taskRepository.findById(taskId, projectId);
    if (!task) {
      throw new AppError('TASK_NOT_FOUND', 'Task not found in this project', 404);
    }

    if (data.assigneeId) {
      await this.validateAssignee(projectId, data.assigneeId);
    }

    return taskRepository.createSubtask(taskId, data);
  }

  async listSubtasks(
    organizationId: string,
    projectId: string,
    taskId: string,
    actorUserId: string
  ) {
    await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    const task = await taskRepository.findById(taskId, projectId);
    if (!task) {
      throw new AppError('TASK_NOT_FOUND', 'Task not found in this project', 404);
    }

    return taskRepository.listSubtasks(taskId);
  }

  async updateSubtask(
    organizationId: string,
    projectId: string,
    taskId: string,
    subtaskId: string,
    actorUserId: string,
    data: {
      title?: string;
      isCompleted?: boolean;
      assigneeId?: string | null;
    }
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    if (rank < RANK_MEMBER) {
      throw new AppError('INSUFFICIENT_PERMISSIONS', 'Viewers cannot modify subtasks', 403);
    }

    const task = await taskRepository.findById(taskId, projectId);
    if (!task) {
      throw new AppError('TASK_NOT_FOUND', 'Task not found in this project', 404);
    }

    const subtask = await taskRepository.findSubtaskById(subtaskId, taskId);
    if (!subtask) {
      throw new AppError('SUBTASK_NOT_FOUND', 'Subtask not found on this task', 404);
    }

    if (data.assigneeId) {
      await this.validateAssignee(projectId, data.assigneeId);
    }

    return taskRepository.updateSubtask(subtaskId, taskId, data);
  }

  async deleteSubtask(
    organizationId: string,
    projectId: string,
    taskId: string,
    subtaskId: string,
    actorUserId: string
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    if (rank < RANK_MEMBER) {
      throw new AppError('INSUFFICIENT_PERMISSIONS', 'Viewers cannot delete subtasks', 403);
    }

    const task = await taskRepository.findById(taskId, projectId);
    if (!task) {
      throw new AppError('TASK_NOT_FOUND', 'Task not found in this project', 404);
    }

    const subtask = await taskRepository.findSubtaskById(subtaskId, taskId);
    if (!subtask) {
      throw new AppError('SUBTASK_NOT_FOUND', 'Subtask not found on this task', 404);
    }

    await taskRepository.deleteSubtask(subtaskId, taskId);
    return { success: true, message: 'Subtask deleted' };
  }
}

export const taskService = new TaskService();
