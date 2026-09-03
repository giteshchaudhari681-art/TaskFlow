import { TaskStatus, TaskPriority, MilestoneStatus } from './domain.js';
import { ProjectDetail } from './project.js';
import { MilestoneHealth } from './milestone.js';

export type ProjectHealthState = 'HEALTHY' | 'AT_RISK' | 'CRITICAL' | 'NO_DATA';

export type RiskSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface ProjectHealthSignals {
  overdueTasks: number;
  urgentOverdueTasks: number;
  blockedTasks: number;
  atRiskMilestones: number;
  overdueMilestones: number;
  completionPercentage: number;
}

export interface ProjectHealthSummary {
  state: ProjectHealthState;
  score: number;
  executiveSummary: string;
  reasons: string[];
  signals: ProjectHealthSignals;
}

export interface ProjectMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  completionPercentage: number;
  totalMilestones: number;
  completedMilestones: number;
}

export type TaskDistribution = Record<TaskStatus, number>;

export type PriorityDistribution = Record<TaskPriority, number>;

export interface ProjectRiskItem {
  id: string;
  type: string;
  severity: RiskSeverity;
  title: string;
  explanation: string;
  entityType: 'task' | 'milestone' | 'dependency';
  entityId?: string;
  entityKey?: string;
  actionLabel: string;
}

export interface DashboardBlockingDependency {
  id: string;
  issueKey: string | null;
  title: string;
  status: TaskStatus;
}

export interface DashboardTaskItem {
  id: string;
  taskNumber: number;
  issueKey: string | null;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  isBlocked: boolean;
  blockingDependencies: DashboardBlockingDependency[];
}

export interface DashboardMilestoneItem {
  id: string;
  title: string;
  status: MilestoneStatus;
  dueDate: string | null;
  progress: number;
  health: MilestoneHealth;
  taskCount: number;
  completedTaskCount: number;
}

export interface DashboardActivityItem {
  id: string;
  actionType: string;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  task?: {
    id: string;
    issueKey: string | null;
    title: string;
  } | null;
  fieldChanged?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface ProjectDashboardResponse {
  project: ProjectDetail;
  health: ProjectHealthSummary;
  metrics: ProjectMetrics;
  taskDistribution: TaskDistribution;
  priorityDistribution: PriorityDistribution;
  risks: ProjectRiskItem[];
  overdueTasks: DashboardTaskItem[];
  blockedTasks: DashboardTaskItem[];
  milestones: DashboardMilestoneItem[];
  recentActivity: DashboardActivityItem[];
}
