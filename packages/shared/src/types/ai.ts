export type AIOperation = 'PROJECT_SUMMARY' | 'TASK_SUMMARY' | 'PROJECT_INSIGHT';

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

export interface AIAnalysisResponse {
  request_id: string;
  operation: AIOperation;
  summary: string;
  recommendations: AIRecommendation[];
  attention_areas?: AIAttentionArea[];
  dependency_impact?: AIDependencyImpact;
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
