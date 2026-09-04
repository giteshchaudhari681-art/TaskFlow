export enum ActorType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  AI = 'AI',
}

export enum AuditSource {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  AI = 'AI',
  AI_ASSISTED = 'AI_ASSISTED',
}

export enum AuditAction {
  // Authentication & Session Security
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  AUTH_REFRESH_REUSE_DETECTED = 'AUTH_REFRESH_REUSE_DETECTED',
  AUTH_PASSWORD_CHANGED = 'AUTH_PASSWORD_CHANGED',

  // Organization Administration
  ORGANIZATION_CREATED = 'ORGANIZATION_CREATED',
  ORGANIZATION_MEMBER_INVITED = 'ORGANIZATION_MEMBER_INVITED',
  ORGANIZATION_MEMBER_ROLE_CHANGED = 'ORGANIZATION_MEMBER_ROLE_CHANGED',
  ORGANIZATION_MEMBER_REMOVED = 'ORGANIZATION_MEMBER_REMOVED',

  // Project Governance
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  PROJECT_ARCHIVED = 'PROJECT_ARCHIVED',
  PROJECT_MEMBER_ADDED = 'PROJECT_MEMBER_ADDED',
  PROJECT_MEMBER_ROLE_CHANGED = 'PROJECT_MEMBER_ROLE_CHANGED',
  PROJECT_MEMBER_REMOVED = 'PROJECT_MEMBER_REMOVED',

  // Task Operations
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
  TASK_PRIORITY_CHANGED = 'TASK_PRIORITY_CHANGED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_UNASSIGNED = 'TASK_UNASSIGNED',
  TASK_ARCHIVED = 'TASK_ARCHIVED',

  // Collaboration
  COMMENT_CREATED = 'COMMENT_CREATED',
  COMMENT_UPDATED = 'COMMENT_UPDATED',
  COMMENT_DELETED = 'COMMENT_DELETED',

  // AI Advisory & Action Lifecycle
  AI_ANALYSIS_REQUESTED = 'AI_ANALYSIS_REQUESTED',
  AI_ACTION_PROPOSED = 'AI_ACTION_PROPOSED',
  AI_ACTION_APPLIED = 'AI_ACTION_APPLIED',
  AI_ACTION_REJECTED = 'AI_ACTION_REJECTED',
}

export interface AuditEventActor {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface AuditEventProject {
  id: string;
  name: string;
  key: string;
}

export interface AuditEvent {
  id: string;
  organizationId: string;
  projectId: string | null;
  actorUserId: string | null;
  actorType: ActorType;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  requestId: string | null;
  source: AuditSource;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorUser?: AuditEventActor | null;
  project?: AuditEventProject | null;
}

export interface AuditEventsFilter {
  action?: AuditAction;
  actorUserId?: string;
  resourceType?: string;
  projectId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
