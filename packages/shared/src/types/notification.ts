import { NotificationType } from './domain.js';

export interface NotificationActor {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface NotificationTaskSummary {
  id: string;
  taskNumber: number;
  issueKey?: string | null;
  title: string;
}

export interface NotificationProjectSummary {
  id: string;
  name: string;
  key: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  taskId?: string | null;
  projectId?: string | null;
  actorId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  actor?: NotificationActor | null;
  task?: NotificationTaskSummary | null;
  project?: NotificationProjectSummary | null;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface NotificationPreferences {
  taskAssigned: boolean;
  comments: boolean;
  statusChanges: boolean;
  milestones: boolean;
  dependencies: boolean;
}

export type UpdateNotificationPreferencesPayload = Partial<NotificationPreferences>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  taskAssigned: true,
  comments: true,
  statusChanges: false,
  milestones: true,
  dependencies: true,
};
