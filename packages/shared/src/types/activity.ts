import { ActivityActionType } from './domain.js';

export interface ActivityActor {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface ActivityTaskSummary {
  id: string;
  taskNumber: number;
  issueKey: string | null;
  title: string;
}

export interface ActivityItem {
  id: string;
  projectId: string | null;
  taskId: string | null;
  actorId: string | null;
  actionType: ActivityActionType;
  fieldChanged: string | null;
  oldValue: string | null;
  newValue: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  actor: ActivityActor | null;
  task?: ActivityTaskSummary | null;
}

export interface TaskActivityResponse {
  activities: ActivityItem[];
  total: number;
}

export interface ProjectActivityResponse {
  activities: ActivityItem[];
  total: number;
}
