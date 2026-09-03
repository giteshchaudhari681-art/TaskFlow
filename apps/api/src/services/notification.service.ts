import { NotificationType } from '@prisma/client';
import {
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  UpdateNotificationPreferencesPayload,
} from '@taskflow/shared';
import { notificationRepository } from '../repositories/notification.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { taskRepository } from '../repositories/task.repository.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export class NotificationService {
  // -------------------------------------------------------------
  // Notification Retrieval & State Management
  // -------------------------------------------------------------

  async listNotifications(
    userId: string,
    options?: {
      limit?: number;
      unreadOnly?: boolean;
    }
  ) {
    const notifications = await notificationRepository.listByUser(userId, options);
    const unreadCount = await notificationRepository.countUnread(userId);

    const mapped = notifications.map(n => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      linkUrl: n.linkUrl,
      isRead: n.isRead,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      taskId: n.taskId,
      projectId: n.projectId,
      actorId: n.actorId,
      metadata: (n.metadata as Record<string, any>) ?? null,
      createdAt: n.createdAt.toISOString(),
      actor: n.actor
        ? {
            id: n.actor.id,
            name: n.actor.name,
            email: n.actor.email,
            avatarUrl: n.actor.avatarUrl,
          }
        : null,
      task: n.task
        ? {
            id: n.task.id,
            taskNumber: n.task.taskNumber,
            issueKey: n.task.issueKey,
            title: n.task.title,
          }
        : null,
      project: n.project
        ? {
            id: n.project.id,
            name: n.project.name,
            key: n.project.key,
          }
        : null,
    }));

    return {
      notifications: mapped,
      unreadCount,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return notificationRepository.countUnread(userId);
  }

  async markAsRead(userId: string, notificationId: string) {
    const updated = await notificationRepository.markRead(notificationId, userId);
    if (!updated) {
      throw new AppError(
        'NOTIFICATION_NOT_FOUND',
        'Notification not found or does not belong to user',
        404
      );
    }

    return {
      id: updated.id,
      isRead: updated.isRead,
      readAt: updated.readAt ? updated.readAt.toISOString() : null,
    };
  }

  async markAllAsRead(userId: string) {
    const count = await notificationRepository.markAllRead(userId);
    return { count };
  }

  // -------------------------------------------------------------
  // Notification Preferences
  // -------------------------------------------------------------

  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    }

    const stored = user.notificationPreferences as Partial<NotificationPreferences> | null;
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(stored || {}),
    };
  }

  async updateUserPreferences(
    userId: string,
    payload: UpdateNotificationPreferencesPayload
  ): Promise<NotificationPreferences> {
    const current = await this.getUserPreferences(userId);
    const updated = {
      ...current,
      ...payload,
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: updated,
      },
    });

    return updated;
  }

  // -------------------------------------------------------------
  // Deterministic Notification Triggers
  // -------------------------------------------------------------

  /**
   * Helper to check if a specific user accepts a notification type.
   */
  private async shouldNotify(
    userId: string,
    prefKey: keyof NotificationPreferences
  ): Promise<boolean> {
    try {
      const prefs = await this.getUserPreferences(userId);
      return prefs[prefKey] === true;
    } catch {
      return false;
    }
  }

  /**
   * Triggered when a task is assigned.
   * Recipient: the newly assigned user (unless actor is assignee).
   */
  async notifyTaskAssigned(params: {
    taskId: string;
    projectId: string;
    taskNumber: number;
    issueKey?: string | null;
    taskTitle: string;
    assigneeId: string;
    actorId: string;
    actorName?: string;
  }) {
    const { taskId, projectId, taskNumber, issueKey, taskTitle, assigneeId, actorId, actorName } =
      params;

    // Self-notification prevention
    if (assigneeId === actorId) return;

    // Preference check
    if (!(await this.shouldNotify(assigneeId, 'taskAssigned'))) return;

    const taskRef = issueKey || `#${taskNumber}`;
    const actorLabel = actorName || 'Someone';

    await notificationRepository.create({
      userId: assigneeId,
      actorId,
      taskId,
      projectId,
      type: NotificationType.TASK_ASSIGNED,
      title: 'Task Assigned',
      message: `${actorLabel} assigned ${taskRef} to you`,
      linkUrl: `/projects/${projectId}?task=${taskId}`,
      metadata: {
        taskNumber,
        issueKey,
        taskTitle,
      },
    });
  }

  /**
   * Triggered when a task is unassigned from a user.
   * Recipient: the previously assigned user (unless actor was assignee).
   */
  async notifyTaskUnassigned(params: {
    taskId: string;
    projectId: string;
    taskNumber: number;
    issueKey?: string | null;
    taskTitle: string;
    previousAssigneeId: string;
    actorId: string;
    actorName?: string;
  }) {
    const {
      taskId,
      projectId,
      taskNumber,
      issueKey,
      taskTitle,
      previousAssigneeId,
      actorId,
      actorName,
    } = params;

    if (previousAssigneeId === actorId) return;
    if (!(await this.shouldNotify(previousAssigneeId, 'taskAssigned'))) return;

    const taskRef = issueKey || `#${taskNumber}`;
    const actorLabel = actorName || 'Someone';

    await notificationRepository.create({
      userId: previousAssigneeId,
      actorId,
      taskId,
      projectId,
      type: NotificationType.TASK_UNASSIGNED,
      title: 'Task Unassigned',
      message: `${actorLabel} unassigned you from ${taskRef}`,
      linkUrl: `/projects/${projectId}?task=${taskId}`,
      metadata: {
        taskNumber,
        issueKey,
        taskTitle,
      },
    });
  }

  /**
   * Triggered when a comment is created on a task.
   * Recipients: Task assignee and task reporter/creator, excluding actor.
   */
  async notifyCommentCreated(params: {
    taskId: string;
    projectId: string;
    taskNumber: number;
    issueKey?: string | null;
    taskTitle: string;
    commentId: string;
    actorId: string;
    actorName?: string;
    commentSnippet?: string;
  }) {
    const {
      taskId,
      projectId,
      taskNumber,
      issueKey,
      taskTitle,
      commentId,
      actorId,
      actorName,
      commentSnippet,
    } = params;

    // Look up task to identify assignee and reporter
    const task = await taskRepository.findById(taskId, projectId);
    if (!task) return;

    // Deduplicate recipients, exclude actor
    const potentialRecipients = new Set<string>();
    if (task.assigneeId && task.assigneeId !== actorId) {
      potentialRecipients.add(task.assigneeId);
    }
    if (task.reporterId && task.reporterId !== actorId) {
      potentialRecipients.add(task.reporterId);
    }

    const taskRef = issueKey || `#${taskNumber}`;
    const actorLabel = actorName || 'Someone';

    for (const recipientId of potentialRecipients) {
      if (await this.shouldNotify(recipientId, 'comments')) {
        await notificationRepository.create({
          userId: recipientId,
          actorId,
          taskId,
          projectId,
          type: NotificationType.COMMENT_CREATED,
          title: 'New Comment',
          message: `${actorLabel} commented on ${taskRef}`,
          linkUrl: `/projects/${projectId}?task=${taskId}`,
          metadata: {
            taskNumber,
            issueKey,
            taskTitle,
            commentId,
            commentSnippet,
          },
        });
      }
    }
  }

  /**
   * Triggered when a task status changes.
   * Recipient: Task assignee (if statusChanges preference is enabled, opt-in).
   */
  async notifyTaskStatusChanged(params: {
    taskId: string;
    projectId: string;
    taskNumber: number;
    issueKey?: string | null;
    taskTitle: string;
    fromStatus: string;
    toStatus: string;
    assigneeId?: string | null;
    actorId: string;
    actorName?: string;
  }) {
    const {
      taskId,
      projectId,
      taskNumber,
      issueKey,
      taskTitle,
      fromStatus,
      toStatus,
      assigneeId,
      actorId,
      actorName,
    } = params;

    if (!assigneeId || assigneeId === actorId) return;
    if (!(await this.shouldNotify(assigneeId, 'statusChanges'))) return;

    const taskRef = issueKey || `#${taskNumber}`;
    const actorLabel = actorName || 'Someone';

    await notificationRepository.create({
      userId: assigneeId,
      actorId,
      taskId,
      projectId,
      type: NotificationType.TASK_STATUS_CHANGED,
      title: 'Task Status Updated',
      message: `${actorLabel} moved ${taskRef} from ${fromStatus} to ${toStatus}`,
      linkUrl: `/projects/${projectId}?task=${taskId}`,
      metadata: {
        taskNumber,
        issueKey,
        taskTitle,
        fromStatus,
        toStatus,
      },
    });
  }

  /**
   * Triggered when a BLOCKS dependency is added between tasks.
   * Recipient: Assignee of the successor (blocked) task.
   */
  async notifyDependencyAdded(params: {
    projectId: string;
    predecessorId: string;
    successorId: string;
    actorId: string;
    actorName?: string;
  }) {
    const { projectId, predecessorId, successorId, actorId, actorName } = params;

    const successorTask = await taskRepository.findById(successorId, projectId);
    const predecessorTask = await taskRepository.findById(predecessorId, projectId);
    if (!successorTask || !predecessorTask) return;

    const recipientId = successorTask.assigneeId;
    if (!recipientId || recipientId === actorId) return;

    if (!(await this.shouldNotify(recipientId, 'dependencies'))) return;

    const actorLabel = actorName || 'Someone';
    const predRef = predecessorTask.issueKey || `#${predecessorTask.taskNumber}`;
    const succRef = successorTask.issueKey || `#${successorTask.taskNumber}`;

    await notificationRepository.create({
      userId: recipientId,
      actorId,
      taskId: successorTask.id,
      projectId,
      type: NotificationType.TASK_DEPENDENCY_ADDED,
      title: 'Task Blocked by Dependency',
      message: `${actorLabel} added ${predRef} as a blocker for your task ${succRef}`,
      linkUrl: `/projects/${projectId}?task=${successorTask.id}`,
      metadata: {
        predecessorId,
        successorId,
        predecessorKey: predRef,
        successorKey: succRef,
      },
    });
  }

  /**
   * Triggered when a milestone is completed.
   * Recipients: Users who have tasks in the milestone, excluding actor.
   */
  async notifyMilestoneCompleted(params: {
    projectId: string;
    milestoneId: string;
    milestoneTitle: string;
    actorId: string;
    actorName?: string;
  }) {
    const { projectId, milestoneId, milestoneTitle, actorId, actorName } = params;

    // Find all distinct assignees of tasks within this milestone
    const milestoneTasks = await prisma.task.findMany({
      where: {
        milestoneId,
        projectId,
        assigneeId: { not: null },
      },
      select: {
        assigneeId: true,
      },
    });

    const recipientIds = new Set<string>();
    for (const t of milestoneTasks) {
      if (t.assigneeId && t.assigneeId !== actorId) {
        recipientIds.add(t.assigneeId);
      }
    }

    const actorLabel = actorName || 'Someone';

    for (const recipientId of recipientIds) {
      if (await this.shouldNotify(recipientId, 'milestones')) {
        await notificationRepository.create({
          userId: recipientId,
          actorId,
          projectId,
          type: NotificationType.MILESTONE_COMPLETED,
          title: 'Milestone Completed',
          message: `${actorLabel} marked milestone "${milestoneTitle}" as completed`,
          linkUrl: `/projects/${projectId}`,
          metadata: {
            milestoneId,
            milestoneTitle,
          },
        });
      }
    }
  }
}

export const notificationService = new NotificationService();
