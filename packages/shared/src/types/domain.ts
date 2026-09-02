/**
 * Domain Types and Enums for TaskFlow Core Entities
 */

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
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
