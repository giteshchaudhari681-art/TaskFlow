import type { TaskStatus, TaskPriority } from './domain.js';

export type AIOperation =
  'PROJECT_SUMMARY' | 'TASK_SUMMARY' | 'PROJECT_INSIGHT' | 'TASK_DECOMPOSITION' | 'TASK_ACTIONS';

export type RecommendationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RecommendationCategory =
  | 'BLOCKER'
  | 'DELIVERY_RISK'
  | 'MILESTONE'
  | 'PRIORITY'
  | 'OWNERSHIP'
  | 'WORKLOAD'
  | 'PROCESS'
  | 'RISK_MITIGATION'
  | 'PLANNING'
  | 'QUALITY'
  | 'RESOURCE'
  | 'DEPENDENCY'
  | 'DEADLINE'
  | 'UNBLOCK'
  | 'EXECUTION';

export interface AIAttentionArea {
  title: string;
  description: string;
  severity: RecommendationPriority;
}

export interface AIDependencyImpact {
  has_blocking_dependencies?: boolean;
  hasBlockingDependencies?: boolean;
  description: string;
}

export interface AIRecommendation {
  title: string;
  description: string;
  priority: RecommendationPriority;
  category: RecommendationCategory;
}

export interface AIDecomposedSubtask {
  title: string;
  description?: string;
  priority?: RecommendationPriority;
  order: number;
}

export type AITaskActionType =
  'UPDATE_STATUS' | 'UPDATE_PRIORITY' | 'UPDATE_DUE_DATE' | 'ASSIGN_TASK';

export type AIActionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AITaskActionExpectedState {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
}

export interface UpdateStatusParameters {
  status: TaskStatus;
}

export interface UpdatePriorityParameters {
  priority: TaskPriority;
}

export interface UpdateDueDateParameters {
  dueDate: string | null;
}

export interface AssignTaskParameters {
  assigneeId: string | null;
  assigneeName?: string | null;
}

export type AITaskActionParameters =
  | UpdateStatusParameters
  | UpdatePriorityParameters
  | UpdateDueDateParameters
  | AssignTaskParameters;

export interface AITaskActionProposal {
  actionId: string;
  type: AITaskActionType;
  title: string;
  reason: string;
  confidence: AIActionConfidence;
  target: { taskId: string };
  expectedCurrentState: AITaskActionExpectedState;
  parameters: Record<string, unknown> & {
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
    assigneeId?: string | null;
    assigneeName?: string | null;
  };
}

export interface AIAnalysisResponse {
  request_id: string;
  operation: AIOperation;
  summary: string;
  recommendations: AIRecommendation[];
  attention_areas?: AIAttentionArea[];
  dependency_impact?: AIDependencyImpact;
  subtasks?: AIDecomposedSubtask[];
  actions?: AITaskActionProposal[];
  notes?: string[];
  metadata: Record<string, unknown>;
}

export interface AIAnalysisParams {
  organizationId: string;
  projectId: string;
}

export interface AIAnalysisRequestBody {
  operation: AIOperation;
  taskId?: string;
  user_prompt?: string;
}
