import { Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository.js';

export class WorkRepository extends BaseRepository {
  /**
   * Fetches all active tasks assigned to the specified user across projects they have access to.
   * Includes project info, milestone info, and predecessor dependencies for block detection.
   */
  async findAssignedTasksByUser(
    userId: string,
    options?: {
      projectId?: string;
      search?: string;
      limit?: number;
      skip?: number;
    }
  ) {
    const where: Prisma.TaskWhereInput = {
      assigneeId: userId,
      archivedAt: null,
      project: {
        ...(options?.projectId ? { id: options.projectId } : {}),
        OR: [
          { members: { some: { userId } } },
          {
            organization: {
              members: {
                some: {
                  userId,
                  role: { in: ['OWNER', 'ADMIN'] },
                },
              },
            },
          },
        ],
      },
      ...(options?.search
        ? {
            OR: [
              { title: { contains: options.search, mode: 'insensitive' } },
              { issueKey: { contains: options.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const limit = Math.min(Math.max(options?.limit ?? 200, 1), 200);
    const skip = options?.skip && options.skip > 0 ? options.skip : undefined;

    return this.db.task.findMany({
      where,
      take: limit,
      skip,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            key: true,
            organizationId: true,
          },
        },
        milestone: {
          select: {
            id: true,
            title: true,
          },
        },
        dependenciesAsSuccessor: {
          where: {
            type: 'BLOCKS',
          },
          include: {
            predecessor: {
              select: {
                id: true,
                taskNumber: true,
                issueKey: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
    });
  }
}

export const workRepository = new WorkRepository();
