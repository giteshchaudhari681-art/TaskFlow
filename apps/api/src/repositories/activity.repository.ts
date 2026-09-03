import { Prisma, ActivityActionType } from '@prisma/client';
import { BaseRepository } from './base.repository.js';

export interface CreateActivityData {
  projectId?: string | null;
  taskId?: string | null;
  actorId?: string | null;
  actionType: ActivityActionType;
  fieldChanged?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export class ActivityRepository extends BaseRepository {
  private readonly actorSelect = {
    id: true,
    name: true,
    email: true,
    avatarUrl: true,
  };

  private readonly taskSelect = {
    id: true,
    taskNumber: true,
    issueKey: true,
    title: true,
  };

  async create(data: CreateActivityData, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.db;
    return client.activity.create({
      data: {
        projectId: data.projectId ?? null,
        taskId: data.taskId ?? null,
        actorId: data.actorId ?? null,
        actionType: data.actionType,
        fieldChanged: data.fieldChanged ?? null,
        oldValue: data.oldValue ?? null,
        newValue: data.newValue ?? null,
        metadata: data.metadata ?? Prisma.JsonNull,
      },
      include: {
        actor: { select: this.actorSelect },
        task: { select: this.taskSelect },
      },
    });
  }

  async listByTask(taskId: string, options?: { limit?: number }) {
    const limit = Math.min(options?.limit ?? 50, 100);
    return this.db.activity.findMany({
      where: { taskId },
      include: {
        actor: { select: this.actorSelect },
        task: { select: this.taskSelect },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async listByProject(projectId: string, options?: { limit?: number; filterType?: string }) {
    const limit = Math.min(options?.limit ?? 50, 100);
    const where: Prisma.ActivityWhereInput = { projectId };

    if (options?.filterType) {
      if (options.filterType === 'TASKS') {
        where.actionType = {
          in: [
            ActivityActionType.TASK_CREATED,
            ActivityActionType.TASK_UPDATED,
            ActivityActionType.TASK_STATUS_CHANGED,
            ActivityActionType.TASK_PRIORITY_CHANGED,
            ActivityActionType.TASK_ASSIGNED,
            ActivityActionType.TASK_UNASSIGNED,
            ActivityActionType.TASK_LABEL_ADDED,
            ActivityActionType.TASK_LABEL_REMOVED,
            ActivityActionType.TASK_MILESTONE_CHANGED,
            ActivityActionType.TASK_DEPENDENCY_ADDED,
            ActivityActionType.TASK_DEPENDENCY_REMOVED,
          ],
        };
      } else if (options.filterType === 'COMMENTS') {
        where.actionType = {
          in: [
            ActivityActionType.COMMENT_CREATED,
            ActivityActionType.COMMENT_UPDATED,
            ActivityActionType.COMMENT_DELETED,
          ],
        };
      } else if (options.filterType === 'MILESTONES') {
        where.actionType = {
          in: [
            ActivityActionType.MILESTONE_CREATED,
            ActivityActionType.MILESTONE_UPDATED,
            ActivityActionType.MILESTONE_COMPLETED,
          ],
        };
      }
    }

    return this.db.activity.findMany({
      where,
      include: {
        actor: { select: this.actorSelect },
        task: { select: this.taskSelect },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const activityRepository = new ActivityRepository();
