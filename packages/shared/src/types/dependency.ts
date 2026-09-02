import { DependencyType } from './domain.js';
import { TaskStatus, TaskPriority, TaskUserSummary } from './task.js';

export { DependencyType };
export type DependencyDirection = 'OUTGOING' | 'INCOMING' | 'MUTUAL';

export interface TaskDependencyItem {
  id: string;
  type: DependencyType;
  direction: DependencyDirection;
  task: {
    id: string;
    taskNumber: number;
    issueKey: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    assignee?: TaskUserSummary | null;
    dueDate?: string | null;
  };
  createdAt: string;
}

export interface TaskDependenciesResponse {
  blockedBy: TaskDependencyItem[];
  blocks: TaskDependencyItem[];
  related: TaskDependencyItem[];
  totalCount: number;
  hasUnresolvedBlockers: boolean;
}

export interface CreateDependencyPayload {
  targetTaskId: string;
  type: DependencyType;
}

export interface ProjectGraphNode {
  id: string;
  taskNumber: number;
  issueKey: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: TaskUserSummary | null;
  blockedByCount: number;
  blockingCount: number;
}

export interface ProjectGraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'BLOCKS' | 'RELATES_TO';
}

export interface ProjectDependencyGraph {
  nodes: ProjectGraphNode[];
  edges: ProjectGraphEdge[];
}

export interface TaskDependencySummary {
  blockedByCount: number;
  blockingCount: number;
  relatedCount: number;
  totalDependencies: number;
  hasUnresolvedBlockers: boolean;
}
