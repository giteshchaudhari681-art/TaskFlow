import { TaskStatus, TaskPriority, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository.js';

export class TaskRepository extends BaseRepository {
  /**
   * Concurrency-safe task creation using PostgreSQL row-level locking on the parent Project.
   * `SELECT id, key FROM projects WHERE id = $1 FOR UPDATE` serializes concurrent creations
   * within the same project, ensuring sequential task numbers (e.g. CORE-1, CORE-2) without collision.
   */
  async create(
    projectId: string,
    data: {
      title: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string | null;
      dueDate?: Date | null;
      estimateHours?: number | null;
    },
    reporterUserId: string
  ) {
    return this.db.$transaction(async tx => {
      // 1. Lock the project row for update to serialize task creation within this project
      const projectRows = await tx.$queryRaw<Array<{ id: string; key: string }>>`
        SELECT id, key FROM projects WHERE id = ${projectId}::uuid FOR UPDATE
      `;
      const project = projectRows[0];
      if (!project) {
        throw new Error('PROJECT_NOT_FOUND');
      }

      // 2. Query the next sequential task number
      const maxRows = await tx.$queryRaw<Array<{ nextNumber: number | bigint }>>`
        SELECT COALESCE(MAX("taskNumber"), 0) + 1 AS "nextNumber"
        FROM tasks
        WHERE "projectId" = ${projectId}::uuid
      `;
      const taskNumber = Number(maxRows[0]?.nextNumber ?? 1);
      const issueKey = `${project.key}-${taskNumber}`;

      // 3. Create the task with monotonic issueKey and taskNumber
      const task = await tx.task.create({
        data: {
          taskNumber,
          issueKey,
          projectId,
          title: data.title,
          description: data.description ?? null,
          status: data.status ?? TaskStatus.TODO,
          priority: data.priority ?? TaskPriority.MEDIUM,
          assigneeId: data.assigneeId ?? null,
          reporterId: reporterUserId,
          dueDate: data.dueDate ?? null,
          estimateHours: data.estimateHours ?? null,
          completedAt: data.status === TaskStatus.DONE ? new Date() : null,
        },
        include: {
          assignee: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          reporter: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          subtasks: {
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            include: {
              assignee: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
          },
        },
      });

      return task;
    });
  }

  async findById(id: string, projectId: string) {
    const task = await this.db.task.findFirst({
      where: {
        id,
        projectId,
      },
      include: {
        project: {
          select: {
            id: true,
            key: true,
            name: true,
            organizationId: true,
          },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        reporter: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        subtasks: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          include: {
            assignee: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        labels: {
          include: {
            label: true,
          },
        },
        dependenciesAsPredecessor: {
          select: {
            id: true,
            type: true,
            successor: { select: { id: true, status: true } },
          },
        },
        dependenciesAsSuccessor: {
          select: {
            id: true,
            type: true,
            predecessor: { select: { id: true, status: true } },
          },
        },
        milestone: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    if (!task) return null;

    const blockedBy = task.dependenciesAsSuccessor.filter(d => d.type === 'BLOCKS');
    const blocking = task.dependenciesAsPredecessor.filter(d => d.type === 'BLOCKS');
    const related = [
      ...task.dependenciesAsPredecessor.filter(d => d.type === 'RELATES_TO'),
      ...task.dependenciesAsSuccessor.filter(d => d.type === 'RELATES_TO'),
    ];
    const hasUnresolvedBlockers = blockedBy.some(
      d => d.predecessor.status !== TaskStatus.DONE && d.predecessor.status !== TaskStatus.CANCELLED
    );

    const dependencySummary = {
      blockedByCount: blockedBy.length,
      blockingCount: blocking.length,
      relatedCount: related.length,
      totalDependencies: blockedBy.length + blocking.length + related.length,
      hasUnresolvedBlockers,
    };

    const { labels, dependenciesAsPredecessor: _dp, dependenciesAsSuccessor: _ds, ...rest } = task;

    return {
      ...rest,
      milestoneId: task.milestoneId,
      milestone: task.milestone ?? null,
      labels: labels.map(tl => tl.label),
      dependencySummary,
    };
  }

  async listByProject(
    projectId: string,
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
    const where: Prisma.TaskWhereInput = {
      projectId,
    };

    // Filter by archived status
    if (filter?.archived === true) {
      where.archivedAt = { not: null };
    } else {
      where.archivedAt = null;
    }

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.priority) {
      where.priority = filter.priority;
    }

    if (filter?.assigneeId) {
      where.assigneeId = filter.assigneeId;
    }

    if (filter?.search && filter.search.trim().length > 0) {
      const q = filter.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { issueKey: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (filter?.labelIds && filter.labelIds.length > 0) {
      if (filter.labelMatch === 'ALL') {
        where.AND = [
          ...((where.AND as any[]) || []),
          ...filter.labelIds.map(labelId => ({
            labels: { some: { labelId } },
          })),
        ];
      } else {
        where.labels = {
          some: {
            labelId: { in: filter.labelIds },
          },
        };
      }
    }

    if (filter?.milestoneId !== undefined) {
      if (filter.milestoneId === 'none') {
        where.milestoneId = null;
      } else {
        where.milestoneId = filter.milestoneId;
      }
    }

    const tasks = await this.db.task.findMany({
      where,
      orderBy: [{ taskNumber: 'desc' }],
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        subtasks: {
          select: { id: true, isCompleted: true },
        },
        labels: {
          include: {
            label: true,
          },
        },
        dependenciesAsPredecessor: {
          select: {
            id: true,
            type: true,
          },
        },
        dependenciesAsSuccessor: {
          select: {
            id: true,
            type: true,
            predecessor: { select: { status: true } },
          },
        },
        milestone: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    return tasks.map(task => {
      const subtaskCount = task.subtasks.length;
      const completedSubtaskCount = task.subtasks.filter(s => s.isCompleted).length;

      const blockedBy = task.dependenciesAsSuccessor.filter(d => d.type === 'BLOCKS');
      const blocking = task.dependenciesAsPredecessor.filter(d => d.type === 'BLOCKS');
      const related = [
        ...task.dependenciesAsPredecessor.filter(d => d.type === 'RELATES_TO'),
        ...task.dependenciesAsSuccessor.filter(d => d.type === 'RELATES_TO'),
      ];
      const hasUnresolvedBlockers = blockedBy.some(
        d =>
          d.predecessor.status !== TaskStatus.DONE && d.predecessor.status !== TaskStatus.CANCELLED
      );

      const dependencySummary = {
        blockedByCount: blockedBy.length,
        blockingCount: blocking.length,
        relatedCount: related.length,
        totalDependencies: blockedBy.length + blocking.length + related.length,
        hasUnresolvedBlockers,
      };

      const {
        subtasks: _,
        labels,
        dependenciesAsPredecessor: _dp,
        dependenciesAsSuccessor: _ds,
        ...rest
      } = task;

      return {
        ...rest,
        milestoneId: task.milestoneId,
        milestone: task.milestone ?? null,
        subtaskCount,
        completedSubtaskCount,
        labels: labels.map(tl => tl.label),
        dependencySummary,
      };
    });
  }

  async update(
    id: string,
    projectId: string,
    data: {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string | null;
      dueDate?: Date | null;
      estimateHours?: number | null;
      milestoneId?: string | null;
    }
  ) {
    // Check if status is transitioning to DONE
    const updateData: Prisma.TaskUpdateInput = {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && {
        status: data.status,
        completedAt: data.status === TaskStatus.DONE ? new Date() : null,
      }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.estimateHours !== undefined && { estimateHours: data.estimateHours }),
    };

    if (data.milestoneId !== undefined) {
      if (data.milestoneId === null) {
        updateData.milestone = { disconnect: true };
      } else {
        updateData.milestone = { connect: { id: data.milestoneId } };
      }
    }

    if (data.assigneeId !== undefined) {
      if (data.assigneeId === null) {
        updateData.assignee = { disconnect: true };
      } else {
        updateData.assignee = { connect: { id: data.assigneeId } };
      }
    }

    return this.db.task.update({
      where: {
        id,
        projectId,
      },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        reporter: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        subtasks: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          include: {
            assignee: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  async updateStatus(id: string, projectId: string, status: TaskStatus) {
    return this.db.task.update({
      where: { id, projectId },
      data: {
        status,
        completedAt: status === TaskStatus.DONE ? new Date() : null,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        reporter: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        subtasks: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          include: {
            assignee: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  async archive(id: string, projectId: string) {
    return this.db.task.update({
      where: { id, projectId },
      data: {
        archivedAt: new Date(),
      },
    });
  }

  async unarchive(id: string, projectId: string) {
    return this.db.task.update({
      where: { id, projectId },
      data: {
        archivedAt: null,
      },
    });
  }

  async delete(id: string, projectId: string) {
    return this.db.task.delete({
      where: { id, projectId },
    });
  }

  // ========================================================================
  // Subtasks
  // ========================================================================

  async createSubtask(
    taskId: string,
    data: {
      title: string;
      assigneeId?: string | null;
    }
  ) {
    // Count existing subtasks to determine order
    const count = await this.db.subtask.count({ where: { taskId } });

    return this.db.subtask.create({
      data: {
        taskId,
        title: data.title,
        order: count,
        assigneeId: data.assigneeId ?? null,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async listSubtasks(taskId: string) {
    return this.db.subtask.findMany({
      where: { taskId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async findSubtaskById(subtaskId: string, taskId: string) {
    return this.db.subtask.findFirst({
      where: { id: subtaskId, taskId },
      include: {
        task: {
          select: {
            id: true,
            projectId: true,
          },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async updateSubtask(
    subtaskId: string,
    taskId: string,
    data: {
      title?: string;
      isCompleted?: boolean;
      assigneeId?: string | null;
    }
  ) {
    const updateData: Prisma.SubtaskUpdateInput = {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.isCompleted !== undefined && {
        isCompleted: data.isCompleted,
        completedAt: data.isCompleted ? new Date() : null,
      }),
    };

    if (data.assigneeId !== undefined) {
      if (data.assigneeId === null) {
        updateData.assignee = { disconnect: true };
      } else {
        updateData.assignee = { connect: { id: data.assigneeId } };
      }
    }

    return this.db.subtask.update({
      where: { id: subtaskId, taskId },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async deleteSubtask(subtaskId: string, taskId: string) {
    return this.db.subtask.delete({
      where: { id: subtaskId, taskId },
    });
  }

  // ========================================================================
  // Task Labels
  // ========================================================================

  async assignLabel(taskId: string, labelId: string) {
    return this.db.taskLabel.upsert({
      where: {
        taskId_labelId: { taskId, labelId },
      },
      update: {},
      create: {
        taskId,
        labelId,
      },
      include: {
        label: true,
      },
    });
  }

  async removeLabel(taskId: string, labelId: string) {
    return this.db.taskLabel.deleteMany({
      where: { taskId, labelId },
    });
  }

  async findTaskLabel(taskId: string, labelId: string) {
    return this.db.taskLabel.findUnique({
      where: {
        taskId_labelId: { taskId, labelId },
      },
    });
  }
}

export const taskRepository = new TaskRepository();
