export type AIOperation = 'PROJECT_SUMMARY' | 'TASK_SUMMARY' | 'PROJECT_INSIGHT';

export type RecommendationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RecommendationCategory =
  'RISK_MITIGATION' | 'PROCESS' | 'RESOURCE' | 'PLANNING' | 'QUALITY';

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
  metadata: Record<string, unknown>;
}

export interface AIAnalysisParams {
  organizationId: string;
  projectId: string;
}

export interface AIAnalysisRequestBody {
  operation: AIOperation;
  user_prompt?: string;
}
