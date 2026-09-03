import { MilestoneStatus, TaskStatus } from '@prisma/client';
import { BaseRepository } from './base.repository.js';

/** Progress calculation rule:
 *  progress = DONE_count / (total - CANCELLED_count) * 100
 *  Empty milestone → 0%.
 *  All-cancelled milestone → 0%.
 */
function computeProgress(totalCount: number, cancelledCount: number, doneCount: number): number {
  const denominator = totalCount - cancelledCount;
  if (denominator <= 0) return 0;
  return Math.round((doneCount / denominator) * 100);
}

/** Health calculation rule (deterministic, date-based):
 *  COMPLETED  → status = COMPLETED
 *  OVERDUE    → today > dueDate AND status ≠ COMPLETED AND status ≠ CLOSED
 *  AT_RISK    → within 3 days of dueDate AND progress < 75% AND not OVERDUE, not COMPLETED
 *  ON_TRACK   → has a dueDate and not any of the above
 *  NO_DATE    → no dueDate
 */
function computeHealth(status: MilestoneStatus, dueDate: Date | null, progress: number): string {
  if (status === MilestoneStatus.COMPLETED) return 'COMPLETED';
  if (!dueDate) return 'NO_DATE';

  const now = new Date();
  if (now > dueDate && status !== MilestoneStatus.CLOSED) return 'OVERDUE';

  const msInDay = 1000 * 60 * 60 * 24;
  const daysUntilDue = (dueDate.getTime() - now.getTime()) / msInDay;
  if (daysUntilDue <= 3 && progress < 75) return 'AT_RISK';

  return 'ON_TRACK';
}

export class MilestoneRepository extends BaseRepository {
  // -------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------

  private async getTaskCounts(milestoneId: string) {
    const counts = await this.db.task.groupBy({
      by: ['status'],
      where: { milestoneId },
      _count: { status: true },
    });

    const totalCount = counts.reduce((sum, r) => sum + r._count.status, 0);
    const cancelledCount = counts.find(r => r.status === TaskStatus.CANCELLED)?._count.status ?? 0;
    const doneCount = counts.find(r => r.status === TaskStatus.DONE)?._count.status ?? 0;
    return { totalCount, cancelledCount, doneCount };
  }

  private enrichMilestone(
    m: {
      id: string;
      projectId: string;
      title: string;
      description: string | null;
      startDate: Date | null;
      dueDate: Date | null;
      status: MilestoneStatus;
      displayOrder: number;
      createdAt: Date;
      updatedAt: Date;
    },
    totalCount: number,
    cancelledCount: number,
    doneCount: number
  ) {
    const progress = computeProgress(totalCount, cancelledCount, doneCount);
    const health = computeHealth(m.status, m.dueDate, progress);
    return {
      id: m.id,
      projectId: m.projectId,
      title: m.title,
      description: m.description,
      startDate: m.startDate?.toISOString() ?? null,
      dueDate: m.dueDate?.toISOString() ?? null,
      status: m.status,
      displayOrder: m.displayOrder,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      taskCount: totalCount,
      completedTaskCount: doneCount,
      progress,
      health,
    };
  }

  // -------------------------------------------------------
  // Create
  // -------------------------------------------------------

  async create(
    projectId: string,
    data: {
      title: string;
      description?: string | null;
      startDate?: Date | null;
      dueDate?: Date | null;
      status?: MilestoneStatus;
      displayOrder?: number;
    }
  ) {
    const m = await this.db.milestone.create({
      data: {
        projectId,
        title: data.title,
        description: data.description ?? null,
        startDate: data.startDate ?? null,
        dueDate: data.dueDate ?? null,
        status: data.status ?? MilestoneStatus.OPEN,
        displayOrder: data.displayOrder ?? 0,
      },
    });
    return this.enrichMilestone(m, 0, 0, 0);
  }

  // -------------------------------------------------------
  // Find by project — efficient: single groupBy for all counts
  // -------------------------------------------------------

  async findByProject(projectId: string) {
    const milestones = await this.db.milestone.findMany({
      where: { projectId },
      orderBy: [{ displayOrder: 'asc' }, { startDate: 'asc' }, { createdAt: 'asc' }],
    });

    if (milestones.length === 0) return [];

    // Batch all task counts in ONE query across all milestone IDs
    const milestoneIds = milestones.map(m => m.id);

    // Use raw SQL-style aggregation to avoid Prisma groupBy multi-column typing issues
    const allCounts = await this.db.task.groupBy({
      by: ['milestoneId', 'status'] as const,
      where: { milestoneId: { in: milestoneIds } },
      _count: { status: true },
    });

    // Build per-milestone lookup
    const countMap = new Map<string, { total: number; cancelled: number; done: number }>();
    for (const row of allCounts) {
      if (!row.milestoneId) continue;
      const existing = countMap.get(row.milestoneId) ?? { total: 0, cancelled: 0, done: 0 };
      existing.total += row._count.status;
      if (row.status === TaskStatus.CANCELLED) existing.cancelled += row._count.status;
      if (row.status === TaskStatus.DONE) existing.done += row._count.status;
      countMap.set(row.milestoneId, existing);
    }

    return milestones.map(m => {
      const c = countMap.get(m.id) ?? { total: 0, cancelled: 0, done: 0 };
      return this.enrichMilestone(m, c.total, c.cancelled, c.done);
    });
  }

  // -------------------------------------------------------
  // Find by ID (detail view with tasks)
  // -------------------------------------------------------

  async findById(milestoneId: string, projectId: string) {
    const m = await this.db.milestone.findFirst({
      where: { id: milestoneId, projectId },
      include: {
        tasks: {
          where: { archivedAt: null },
          select: {
            id: true,
            taskNumber: true,
            issueKey: true,
            title: true,
            status: true,
            priority: true,
            assigneeId: true,
            dueDate: true,
            completedAt: true,
            assignee: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
          orderBy: [{ status: 'asc' }, { taskNumber: 'asc' }],
        },
      },
    });

    if (!m) return null;

    const { totalCount, cancelledCount, doneCount } = await this.getTaskCounts(milestoneId);
    const base = this.enrichMilestone(m, totalCount, cancelledCount, doneCount);

    return {
      ...base,
      tasks: m.tasks.map(t => ({
        id: t.id,
        taskNumber: t.taskNumber,
        issueKey: t.issueKey ?? `#${t.taskNumber}`,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assigneeId,
        dueDate: t.dueDate?.toISOString() ?? null,
        completedAt: t.completedAt?.toISOString() ?? null,
        assignee: t.assignee,
      })),
    };
  }

  // -------------------------------------------------------
  // Update
  // -------------------------------------------------------

  async update(
    milestoneId: string,
    _projectId: string,
    data: {
      title?: string;
      description?: string | null;
      startDate?: Date | null;
      dueDate?: Date | null;
      status?: MilestoneStatus;
      displayOrder?: number;
    }
  ) {
    const m = await this.db.milestone.update({
      where: { id: milestoneId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
      },
    });
    const { totalCount, cancelledCount, doneCount } = await this.getTaskCounts(milestoneId);
    return this.enrichMilestone(m, totalCount, cancelledCount, doneCount);
  }

  // -------------------------------------------------------
  // Delete — tasks preserved via SetNull FK in schema
  // -------------------------------------------------------

  async delete(milestoneId: string, _projectId: string) {
    await this.db.milestone.delete({
      where: { id: milestoneId },
    });
  }

  // -------------------------------------------------------
  // Exists check (used by service for authorization)
  // -------------------------------------------------------

  async exists(milestoneId: string, projectId: string): Promise<boolean> {
    const count = await this.db.milestone.count({
      where: { id: milestoneId, projectId },
    });
    return count > 0;
  }
}

export const milestoneRepository = new MilestoneRepository();
