/**
 * Domain Types and Enums for TaskFlow Core Entities
 */

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

export enum ProjectRole {
  LEAD = 'LEAD',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export enum MilestoneStatus {
  OPEN = 'OPEN',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
}

export enum ObjectiveStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ACHIEVED = 'ACHIEVED',
  CANCELLED = 'CANCELLED',
}

export enum RecommendationStatus {
  ACTIVE = 'ACTIVE',
  APPLIED = 'APPLIED',
  DISMISSED = 'DISMISSED',
}

export enum ActivityActionType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ASSIGNED = 'ASSIGNED',
  COMMENTED = 'COMMENTED',

  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
  TASK_PRIORITY_CHANGED = 'TASK_PRIORITY_CHANGED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_UNASSIGNED = 'TASK_UNASSIGNED',
  TASK_LABEL_ADDED = 'TASK_LABEL_ADDED',
  TASK_LABEL_REMOVED = 'TASK_LABEL_REMOVED',
  TASK_MILESTONE_CHANGED = 'TASK_MILESTONE_CHANGED',
  TASK_DEPENDENCY_ADDED = 'TASK_DEPENDENCY_ADDED',
  TASK_DEPENDENCY_REMOVED = 'TASK_DEPENDENCY_REMOVED',
  COMMENT_CREATED = 'COMMENT_CREATED',
  COMMENT_UPDATED = 'COMMENT_UPDATED',
  COMMENT_DELETED = 'COMMENT_DELETED',
  MILESTONE_CREATED = 'MILESTONE_CREATED',
  MILESTONE_UPDATED = 'MILESTONE_UPDATED',
  MILESTONE_COMPLETED = 'MILESTONE_COMPLETED',
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  BLOCKED = 'BLOCKED',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  URGENT = 'URGENT',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  NONE = 'NONE',
}

export enum DependencyType {
  BLOCKS = 'BLOCKS',
  BLOCKED_BY = 'BLOCKED_BY',
  RELATES_TO = 'RELATES_TO',
}

export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_UNASSIGNED = 'TASK_UNASSIGNED',
  COMMENT_CREATED = 'COMMENT_CREATED',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
  TASK_PRIORITY_CHANGED = 'TASK_PRIORITY_CHANGED',
  TASK_MILESTONE_CHANGED = 'TASK_MILESTONE_CHANGED',
  TASK_DEPENDENCY_ADDED = 'TASK_DEPENDENCY_ADDED',
  TASK_DEPENDENCY_REMOVED = 'TASK_DEPENDENCY_REMOVED',
  MILESTONE_COMPLETED = 'MILESTONE_COMPLETED',
  SYSTEM = 'SYSTEM',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  status: ProjectStatus;
  organizationId: string;
}

export interface TaskSummary {
  id: string;
  taskNumber: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assigneeId?: string | null;
  dueDate?: string | null;
}
