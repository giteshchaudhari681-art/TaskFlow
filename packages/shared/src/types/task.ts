import { TaskStatus, TaskPriority } from './domain.js';
import { LabelItem } from './label.js';
import { TaskDependencySummary } from './dependency.js';
import { MilestoneSummary } from './milestone.js';

export { TaskStatus, TaskPriority };

export interface TaskUserSummary {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface SubtaskItem {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  order: number;
  assigneeId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: TaskUserSummary | null;
}

export interface TaskDetail {
  id: string;
  taskNumber: number;
  issueKey: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  reporterId: string | null;
  milestoneId: string | null;
  dueDate: string | null;
  estimateHours: number | null;
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: TaskUserSummary | null;
  reporter?: TaskUserSummary | null;
  milestone?: MilestoneSummary | null;
  subtasks: SubtaskItem[];
  subtaskCount: number;
  completedSubtaskCount: number;
  labels?: LabelItem[];
  dependencySummary?: TaskDependencySummary;
}

export interface TaskListItem {
  id: string;
  taskNumber: number;
  issueKey: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  reporterId: string | null;
  milestoneId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: TaskUserSummary | null;
  subtaskCount: number;
  completedSubtaskCount: number;
  labels?: LabelItem[];
  dependencySummary?: TaskDependencySummary;
  milestone?: MilestoneSummary | null;
}

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  estimateHours?: number | null;
  milestoneId?: string | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  estimateHours?: number | null;
  milestoneId?: string | null;
}

export interface CreateSubtaskPayload {
  title: string;
  assigneeId?: string | null;
}

export interface UpdateSubtaskPayload {
  title?: string;
  isCompleted?: boolean;
  assigneeId?: string | null;
}

export interface TaskFilterParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  search?: string;
  archived?: boolean;
  labelIds?: string[];
  labelMatch?: 'ANY' | 'ALL';
  milestoneId?: string | 'none';
}
