export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum JobType {
  NOTIFICATION_DELIVERY = 'NOTIFICATION_DELIVERY',
  ACTIVITY_FANOUT = 'ACTIVITY_FANOUT',
}

export interface NotificationDeliveryPayload {
  notificationId: string;
  userId: string;
  organizationId?: string | null;
  projectId?: string | null;
  channel?: 'IN_APP' | 'EMAIL' | 'WEBHOOK';
}

export interface ActivityFanoutPayload {
  activityId: string;
  organizationId: string;
  projectId?: string | null;
  taskId?: string | null;
}

export interface JobPayloadMap {
  [JobType.NOTIFICATION_DELIVERY]: NotificationDeliveryPayload;
  [JobType.ACTIVITY_FANOUT]: ActivityFanoutPayload;
  [key: string]: unknown;
}

export interface JobRecord<T = Record<string, unknown>> {
  id: string;
  type: string;
  status: JobStatus;
  organizationId?: string | null;
  payload: T;
  idempotencyKey?: string | null;
  attempts: number;
  maxAttempts: number;
  availableAt: Date | string;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  failedAt?: Date | string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  lockedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface JobSummaryCounts {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface JobSummary {
  organizationId?: string | null;
  counts: JobSummaryCounts;
  oldestPendingAt: string | null;
  recentFailedCount: number;
}
