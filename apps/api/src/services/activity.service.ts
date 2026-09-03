import { UserRole } from '@prisma/client';
import { activityRepository } from '../repositories/activity.repository.js';
import { taskRepository } from '../repositories/task.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { AppError } from '../middleware/errorHandler.js';
import { ActivityItem } from '@taskflow/shared';

export class ActivityService {
  private async verifyProjectAccess(
    organizationId: string,
    projectId: string,
    actorUserId: string
  ) {
    const project = await projectRepository.findById(projectId, organizationId);
    if (!project) {
      throw new AppError('PROJECT_NOT_FOUND', 'Project not found in this organization', 404);
    }

    const orgMember = await organizationRepository.findMember(organizationId, actorUserId);
    if (!orgMember) {
      throw new AppError(
        'NOT_ORGANIZATION_MEMBER',
        'User is not a member of this organization',
        403
      );
    }

    if (orgMember.role === UserRole.OWNER || orgMember.role === UserRole.ADMIN) {
      return project;
    }

    const projMember = await projectRepository.findMember(projectId, actorUserId);
    if (!projMember) {
      throw new AppError('NOT_PROJECT_MEMBER', 'User is not a member of this project', 403);
    }

    return project;
  }

  private formatActivity(a: {
    id: string;
    projectId: string | null;
    taskId: string | null;
    actorId: string | null;
    actionType: any;
    fieldChanged: string | null;
    oldValue: string | null;
    newValue: string | null;
    metadata: any;
    createdAt: Date;
    actor: {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
    } | null;
    task?: {
      id: string;
      taskNumber: number;
      issueKey: string | null;
      title: string;
    } | null;
  }): ActivityItem {
    return {
      id: a.id,
      projectId: a.projectId,
      taskId: a.taskId,
      actorId: a.actorId,
      actionType: a.actionType,
      fieldChanged: a.fieldChanged,
      oldValue: a.oldValue,
      newValue: a.newValue,
      metadata: (a.metadata as Record<string, any>) ?? null,
      createdAt: a.createdAt.toISOString(),
      actor: a.actor,
      task: a.task
        ? {
            id: a.task.id,
            taskNumber: a.task.taskNumber,
            issueKey: a.task.issueKey,
            title: a.task.title,
          }
        : null,
    };
  }

  async getTaskActivities(
    organizationId: string,
    projectId: string,
    taskId: string,
    actorUserId: string,
    options?: { limit?: number }
  ): Promise<ActivityItem[]> {
    await this.verifyProjectAccess(organizationId, projectId, actorUserId);

    const task = await taskRepository.findById(taskId, projectId);
    if (!task) {
      throw new AppError('TASK_NOT_FOUND', 'Task not found in this project', 404);
    }

    const activities = await activityRepository.listByTask(taskId, options);
    return activities.map(a => this.formatActivity(a));
  }

  async getProjectActivities(
    organizationId: string,
    projectId: string,
    actorUserId: string,
    options?: { limit?: number; filterType?: string }
  ): Promise<ActivityItem[]> {
    await this.verifyProjectAccess(organizationId, projectId, actorUserId);

    const activities = await activityRepository.listByProject(projectId, options);
    return activities.map(a => this.formatActivity(a));
  }
}

export const activityService = new ActivityService();
