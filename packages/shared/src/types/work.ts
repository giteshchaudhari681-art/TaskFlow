import { TaskStatus, TaskPriority } from './domain.js';

export type DueDateCategory = 'OVERDUE' | 'DUE_TODAY' | 'DUE_SOON' | 'FUTURE' | 'NONE';

export type WorkCategory =
  | 'OVERDUE'
  | 'DUE_TODAY'
  | 'DUE_SOON'
  | 'BLOCKED'
  | 'IN_PROGRESS'
  | 'OTHER_ASSIGNED'
  | 'COMPLETED_RECENTLY';

export type MyWorkFilter =
  'all' | 'overdue' | 'due_today' | 'due_soon' | 'blocked' | 'in_progress' | 'completed';

export interface BlockingDependencySummary {
  predecessorId: string;
  predecessorKey?: string | null;
  predecessorTitle: string;
  predecessorStatus: TaskStatus;
}

export interface MyWorkProjectSummary {
  id: string;
  name: string;
  key: string;
  organizationId: string;
}

export interface MyWorkMilestoneSummary {
  id: string;
  title: string;
}

export interface MyWorkItem {
  id: string;
  taskNumber: number;
  issueKey?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  dueDateCategory: DueDateCategory;
  isBlocked: boolean;
  blockingDependencies: BlockingDependencySummary[];
  primaryCategory: WorkCategory;
  projectId: string;
  project: MyWorkProjectSummary;
  milestone?: MyWorkMilestoneSummary | null;
  completedAt?: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface MyWorkSummary {
  totalAssigned: number;
  overdueCount: number;
  dueSoonCount: number;
  blockedCount: number;
  inProgressCount: number;
  completedRecentlyCount: number;
}

export interface MyWorkResponse {
  summary: MyWorkSummary;
  items: MyWorkItem[];
}
