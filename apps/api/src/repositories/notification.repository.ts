import { NotificationType, Prisma } from '@prisma/client';
import { JobType } from '@taskflow/shared';
import { BaseRepository } from './base.repository.js';
import { jobRepository } from './job.repository.js';

export class NotificationRepository extends BaseRepository {
  private readonly defaultInclude = {
    actor: {
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    },
    task: {
      select: {
        id: true,
        taskNumber: true,
        issueKey: true,
        title: true,
      },
    },
    project: {
      select: {
        id: true,
        name: true,
        key: true,
        organizationId: true,
      },
    },
  };

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    linkUrl?: string | null;
    taskId?: string | null;
    projectId?: string | null;
    actorId?: string | null;
    metadata?: Record<string, any> | null;
  }) {
    const notification = await this.db.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        linkUrl: data.linkUrl ?? null,
        taskId: data.taskId ?? null,
        projectId: data.projectId ?? null,
        actorId: data.actorId ?? null,
        metadata: (data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
      include: this.defaultInclude,
    });

    try {
      await jobRepository.enqueue({
        type: JobType.NOTIFICATION_DELIVERY,
        organizationId: notification.project?.organizationId ?? null,
        idempotencyKey: `notification-delivery-${notification.id}`,
        payload: {
          notificationId: notification.id,
          userId: notification.userId,
          organizationId: notification.project?.organizationId ?? null,
          projectId: notification.projectId,
          channel: 'IN_APP',
        },
      });
    } catch {
      // Secondary delivery enqueue failure must not abort authoritative notification creation
    }

    return notification;
  }

  async listByUser(
    userId: string,
    options?: {
      limit?: number;
      unreadOnly?: boolean;
    }
  ) {
    const limit = Math.min(Math.max(options?.limit ?? 30, 1), 100);
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(options?.unreadOnly ? { isRead: false } : {}),
    };

    return this.db.notification.findMany({
      where,
      include: this.defaultInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.db.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async findById(id: string, userId: string) {
    return this.db.notification.findFirst({
      where: {
        id,
        userId,
      },
      include: this.defaultInclude,
    });
  }

  async markRead(id: string, userId: string) {
    // Only update if it belongs to the user
    const existing = await this.findById(id, userId);
    if (!existing) return null;

    return this.db.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: this.defaultInclude,
    });
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.db.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }
}

export const notificationRepository = new NotificationRepository();
