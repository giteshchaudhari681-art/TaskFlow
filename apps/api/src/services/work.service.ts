import { TaskStatus, TaskPriority } from '@prisma/client';
import {
  TaskStatus as SharedTaskStatus,
  TaskPriority as SharedTaskPriority,
  MyWorkItem,
  MyWorkResponse,
  MyWorkSummary,
  MyWorkFilter,
  DueDateCategory,
  WorkCategory,
  BlockingDependencySummary,
} from '@taskflow/shared';
import { workRepository } from '../repositories/work.repository.js';

const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  [TaskPriority.URGENT]: 5,
  [TaskPriority.HIGH]: 4,
  [TaskPriority.MEDIUM]: 3,
  [TaskPriority.LOW]: 2,
  [TaskPriority.NONE]: 1,
};

const CATEGORY_ORDER: Record<WorkCategory, number> = {
  OVERDUE: 1,
  DUE_TODAY: 2,
  DUE_SOON: 3,
  BLOCKED: 4,
  IN_PROGRESS: 5,
  OTHER_ASSIGNED: 6,
  COMPLETED_RECENTLY: 7,
};

export class WorkService {
  async getMyWork(
    userId: string,
    options?: {
      filter?: MyWorkFilter;
      projectId?: string;
      search?: string;
    }
  ): Promise<MyWorkResponse> {
    const rawTasks = await workRepository.findAssignedTasksByUser(userId, {
      projectId: options?.projectId,
      search: options?.search,
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const threeDaysOut = new Date(endOfToday.getTime() + 3 * 86400000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    const allItems: MyWorkItem[] = rawTasks.map(t => {
      // 1. Evaluate direct BLOCKS predecessors
      const blockingDependencies: BlockingDependencySummary[] = [];
      let isBlocked = false;

      if (t.dependenciesAsSuccessor && t.dependenciesAsSuccessor.length > 0) {
        for (const dep of t.dependenciesAsSuccessor) {
          const pred = dep.predecessor;
          if (pred && pred.status !== TaskStatus.DONE && pred.status !== TaskStatus.CANCELLED) {
            isBlocked = true;
            blockingDependencies.push({
              predecessorId: pred.id,
              predecessorKey: pred.issueKey,
              predecessorTitle: pred.title,
              predecessorStatus: pred.status as unknown as SharedTaskStatus,
            });
          }
        }
      }

      // 2. Evaluate Due Date Category
      let dueDateCategory: DueDateCategory = 'NONE';
      const isClosed = t.status === TaskStatus.DONE || t.status === TaskStatus.CANCELLED;

      if (t.dueDate) {
        const due = new Date(t.dueDate);
        if (!isClosed) {
          if (due < startOfToday) {
            dueDateCategory = 'OVERDUE';
          } else if (due >= startOfToday && due <= endOfToday) {
            dueDateCategory = 'DUE_TODAY';
          } else if (due > endOfToday && due <= threeDaysOut) {
            dueDateCategory = 'DUE_SOON';
          } else {
            dueDateCategory = 'FUTURE';
          }
        } else {
          dueDateCategory = due < startOfToday ? 'OVERDUE' : 'FUTURE';
        }
      }

      // 3. Evaluate Primary Category
      let primaryCategory: WorkCategory;
      if (t.status === TaskStatus.DONE) {
        primaryCategory = 'COMPLETED_RECENTLY';
      } else if (dueDateCategory === 'OVERDUE') {
        primaryCategory = 'OVERDUE';
      } else if (dueDateCategory === 'DUE_TODAY') {
        primaryCategory = 'DUE_TODAY';
      } else if (dueDateCategory === 'DUE_SOON') {
        primaryCategory = 'DUE_SOON';
      } else if (isBlocked) {
        primaryCategory = 'BLOCKED';
      } else if (t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.IN_REVIEW) {
        primaryCategory = 'IN_PROGRESS';
      } else {
        primaryCategory = 'OTHER_ASSIGNED';
      }

      return {
        id: t.id,
        taskNumber: t.taskNumber,
        issueKey: t.issueKey,
        title: t.title,
        description: t.description,
        status: t.status as unknown as SharedTaskStatus,
        priority: t.priority as unknown as SharedTaskPriority,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        dueDateCategory,
        isBlocked,
        blockingDependencies,
        primaryCategory,
        projectId: t.projectId,
        project: {
          id: t.project.id,
          name: t.project.name,
          key: t.project.key,
          organizationId: t.project.organizationId,
        },
        milestone: t.milestone ? { id: t.milestone.id, title: t.milestone.title } : null,
        completedAt: t.completedAt ? t.completedAt.toISOString() : null,
        updatedAt: t.updatedAt.toISOString(),
        createdAt: t.createdAt.toISOString(),
      };
    });

    // 4. Calculate Summary Metrics
    let totalAssigned = 0;
    let overdueCount = 0;
    let dueSoonCount = 0;
    let blockedCount = 0;
    let inProgressCount = 0;
    let completedRecentlyCount = 0;

    for (const item of allItems) {
      const isClosed = item.status === TaskStatus.DONE || item.status === TaskStatus.CANCELLED;
      if (!isClosed) {
        totalAssigned++;
        if (item.dueDateCategory === 'OVERDUE') overdueCount++;
        if (item.dueDateCategory === 'DUE_TODAY' || item.dueDateCategory === 'DUE_SOON') {
          dueSoonCount++;
        }
        if (item.isBlocked) blockedCount++;
        if (item.status === TaskStatus.IN_PROGRESS || item.status === TaskStatus.IN_REVIEW) {
          inProgressCount++;
        }
      } else if (item.status === TaskStatus.DONE) {
        if (!item.completedAt || new Date(item.completedAt) >= sevenDaysAgo) {
          completedRecentlyCount++;
        }
      }
    }

    const summary: MyWorkSummary = {
      totalAssigned,
      overdueCount,
      dueSoonCount,
      blockedCount,
      inProgressCount,
      completedRecentlyCount,
    };

    // 5. Apply User Filter
    const activeFilter = options?.filter || 'all';
    let filteredItems = allItems;

    switch (activeFilter) {
      case 'overdue':
        filteredItems = allItems.filter(
          i =>
            i.dueDateCategory === 'OVERDUE' &&
            i.status !== TaskStatus.DONE &&
            i.status !== TaskStatus.CANCELLED
        );
        break;
      case 'due_today':
        filteredItems = allItems.filter(
          i =>
            i.dueDateCategory === 'DUE_TODAY' &&
            i.status !== TaskStatus.DONE &&
            i.status !== TaskStatus.CANCELLED
        );
        break;
      case 'due_soon':
        filteredItems = allItems.filter(
          i =>
            (i.dueDateCategory === 'DUE_TODAY' || i.dueDateCategory === 'DUE_SOON') &&
            i.status !== TaskStatus.DONE &&
            i.status !== TaskStatus.CANCELLED
        );
        break;
      case 'blocked':
        filteredItems = allItems.filter(
          i => i.isBlocked && i.status !== TaskStatus.DONE && i.status !== TaskStatus.CANCELLED
        );
        break;
      case 'in_progress':
        filteredItems = allItems.filter(
          i => i.status === TaskStatus.IN_PROGRESS || i.status === TaskStatus.IN_REVIEW
        );
        break;
      case 'completed':
        filteredItems = allItems.filter(i => i.status === TaskStatus.DONE);
        break;
      case 'all':
      default:
        filteredItems = allItems;
        break;
    }

    // 6. Deterministic Sort:
    // Category Order -> DueDate (ascending, nulls last) -> Priority (descending) -> UpdatedAt (descending)
    filteredItems.sort((a, b) => {
      const catA = CATEGORY_ORDER[a.primaryCategory] || 99;
      const catB = CATEGORY_ORDER[b.primaryCategory] || 99;
      if (catA !== catB) return catA - catB;

      if (a.dueDate && b.dueDate) {
        const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (diff !== 0) return diff;
      } else if (a.dueDate && !b.dueDate) {
        return -1;
      } else if (!a.dueDate && b.dueDate) {
        return 1;
      }

      const pA = PRIORITY_WEIGHTS[a.priority] || 0;
      const pB = PRIORITY_WEIGHTS[b.priority] || 0;
      if (pA !== pB) return pB - pA;

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return {
      summary,
      items: filteredItems,
    };
  }
}

export const workService = new WorkService();
