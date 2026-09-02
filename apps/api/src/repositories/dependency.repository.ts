import { PrismaClient, Prisma, DependencyType } from '@prisma/client';
import { prisma as defaultPrisma } from '../lib/prisma.js';

export class DependencyRepository {
  constructor(private db: PrismaClient = defaultPrisma) {}

  async findExisting(predecessorId: string, successorId: string) {
    return this.db.taskDependency.findUnique({
      where: {
        predecessorId_successorId: {
          predecessorId,
          successorId,
        },
      },
    });
  }

  async findById(id: string, projectId: string) {
    return this.db.taskDependency.findFirst({
      where: {
        id,
        projectId,
      },
      include: {
        predecessor: {
          select: {
            id: true,
            taskNumber: true,
            issueKey: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        successor: {
          select: {
            id: true,
            taskNumber: true,
            issueKey: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  async findByTaskId(taskId: string, projectId: string) {
    return this.db.taskDependency.findMany({
      where: {
        projectId,
        OR: [{ predecessorId: taskId }, { successorId: taskId }],
      },
      include: {
        predecessor: {
          select: {
            id: true,
            taskNumber: true,
            issueKey: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        successor: {
          select: {
            id: true,
            taskNumber: true,
            issueKey: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByProject(projectId: string) {
    return this.db.taskDependency.findMany({
      where: { projectId },
      include: {
        predecessor: {
          select: {
            id: true,
            taskNumber: true,
            issueKey: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        successor: {
          select: {
            id: true,
            taskNumber: true,
            issueKey: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBlockingDependenciesInProject(projectId: string) {
    return this.db.taskDependency.findMany({
      where: {
        projectId,
        type: DependencyType.BLOCKS,
      },
      select: {
        predecessorId: true,
        successorId: true,
      },
    });
  }

  async create(
    data: {
      projectId: string;
      predecessorId: string;
      successorId: string;
      type: DependencyType;
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.db;
    return client.taskDependency.create({
      data: {
        projectId: data.projectId,
        predecessorId: data.predecessorId,
        successorId: data.successorId,
        type: data.type,
      },
      include: {
        predecessor: {
          select: {
            id: true,
            taskNumber: true,
            issueKey: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        successor: {
          select: {
            id: true,
            taskNumber: true,
            issueKey: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  async delete(id: string, projectId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.db;
    return client.taskDependency.deleteMany({
      where: {
        id,
        projectId,
      },
    });
  }
}
