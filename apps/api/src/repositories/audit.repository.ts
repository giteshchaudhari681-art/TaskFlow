import { Prisma, AuditAction, ActorType, AuditSource } from '@prisma/client';
import { BaseRepository } from './base.repository.js';
import type { AuditEventsFilter } from '@taskflow/shared';

export interface CreateAuditData {
  organizationId: string;
  projectId?: string | null;
  actorUserId?: string | null;
  actorType?: ActorType;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  requestId?: string | null;
  source?: AuditSource;
  metadata?: Prisma.InputJsonValue;
}

export interface AuditFindManyOptions extends AuditEventsFilter {
  projectIds?: string[];
}

export class AuditRepository extends BaseRepository {
  private readonly actorSelect = {
    id: true,
    name: true,
    email: true,
    avatarUrl: true,
  };

  private readonly projectSelect = {
    id: true,
    name: true,
    key: true,
  };

  async create(data: CreateAuditData, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.db;
    return client.auditEvent.create({
      data: {
        organizationId: data.organizationId,
        projectId: data.projectId ?? null,
        actorUserId: data.actorUserId ?? null,
        actorType: data.actorType ?? ActorType.USER,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId ?? null,
        requestId: data.requestId ?? null,
        source: data.source ?? AuditSource.USER,
        metadata: data.metadata ?? Prisma.JsonNull,
      },
      include: {
        actorUser: { select: this.actorSelect },
        project: { select: this.projectSelect },
      },
    });
  }

  async findMany(organizationId: string, options: AuditFindManyOptions) {
    const page = Math.max(options.page ?? 1, 1);
    const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AuditEventWhereInput = {
      organizationId,
    };

    if (options.action) {
      where.action = options.action;
    }

    if (options.actorUserId) {
      where.actorUserId = options.actorUserId;
    }

    if (options.resourceType) {
      where.resourceType = options.resourceType;
    }

    if (options.projectId) {
      where.projectId = options.projectId;
    } else if (options.projectIds !== undefined) {
      // Scoped to allowed project IDs for Project Admins
      where.projectId = { in: options.projectIds };
    }

    if (options.from || options.to) {
      where.createdAt = {};
      if (options.from) {
        where.createdAt.gte = new Date(options.from);
      }
      if (options.to) {
        where.createdAt.lte = new Date(options.to);
      }
    }

    const [items, total] = await Promise.all([
      this.db.auditEvent.findMany({
        where,
        include: {
          actorUser: { select: this.actorSelect },
          project: { select: this.projectSelect },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.auditEvent.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const auditRepository = new AuditRepository();
