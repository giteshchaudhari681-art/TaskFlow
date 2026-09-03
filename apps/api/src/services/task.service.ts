import {
  TaskStatus,
  TaskPriority,
  UserRole,
  ProjectRole,
  ActivityActionType,
} from '@prisma/client';
import { taskRepository } from '../repositories/task.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { activityRepository } from '../repositories/activity.repository.js';
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
      actorUserId
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

    return taskRepository.archive(taskId, projectId);
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
