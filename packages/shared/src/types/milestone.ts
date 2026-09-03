import { MilestoneStatus, TaskStatus, TaskPriority } from './domain.js';

export { MilestoneStatus };

/** Derived health state — never stored in DB, always computed */
export enum MilestoneHealth {
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
  AT_RISK = 'AT_RISK',
  ON_TRACK = 'ON_TRACK',
  NO_DATE = 'NO_DATE',
}

/** Brief milestone reference embedded in task responses */
export interface MilestoneSummary {
  id: string;
  title: string;
  status: MilestoneStatus;
}

/** Full milestone in list view — includes aggregated task counts */
export interface MilestoneListItem {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  startDate: string | null;
  dueDate: string | null;
  status: MilestoneStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  completedTaskCount: number;
  /** 0–100 integer. 0 when no tasks or all cancelled */
  progress: number;
  health: MilestoneHealth;
}

/** Single task row inside milestone detail view */
export interface MilestoneTaskItem {
  id: string;
  taskNumber: number;
  issueKey: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  assignee?: { id: string; name: string; email: string; avatarUrl: string | null } | null;
  dueDate: string | null;
  completedAt: string | null;
}

/** Full milestone detail — includes task list */
export interface MilestoneDetail extends MilestoneListItem {
  tasks: MilestoneTaskItem[];
}

/** Timeline data — one entry per milestone suitable for bar rendering */
export interface TimelineMilestone {
  id: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  status: MilestoneStatus;
  progress: number;
  health: MilestoneHealth;
  taskCount: number;
  completedTaskCount: number;
  displayOrder: number;
}

export interface ProjectTimelineResponse {
  projectId: string;
  milestones: TimelineMilestone[];
  /** earliest startDate across all milestones (or today if none) */
  rangeStart: string;
  /** latest dueDate across all milestones (or today if none) */
  rangeEnd: string;
}

export interface CreateMilestonePayload {
  title: string;
  description?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  status?: MilestoneStatus;
  displayOrder?: number;
}

export interface UpdateMilestonePayload {
  title?: string;
  description?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  status?: MilestoneStatus;
  displayOrder?: number;
}
