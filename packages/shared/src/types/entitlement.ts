export type Plan = 'FREE' | 'PRO' | 'BUSINESS';

export const Plan = {
  FREE: 'FREE',
  PRO: 'PRO',
  BUSINESS: 'BUSINESS',
} as const;

export type SubscriptionStatus = 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED';

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  TRIALING: 'TRIALING',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
} as const;

export type FeatureKey =
  | 'AI_PROJECT_INSIGHTS'
  | 'AI_TASK_INTELLIGENCE'
  | 'AI_TASK_DECOMPOSITION'
  | 'AI_TASK_ACTIONS'
  | 'AUDIT_LOG'
  | 'BACKGROUND_JOBS';

export const FeatureKey = {
  AI_PROJECT_INSIGHTS: 'AI_PROJECT_INSIGHTS',
  AI_TASK_INTELLIGENCE: 'AI_TASK_INTELLIGENCE',
  AI_TASK_DECOMPOSITION: 'AI_TASK_DECOMPOSITION',
  AI_TASK_ACTIONS: 'AI_TASK_ACTIONS',
  AUDIT_LOG: 'AUDIT_LOG',
  BACKGROUND_JOBS: 'BACKGROUND_JOBS',
} as const;

export type LimitKey =
  'MAX_MEMBERS' | 'MAX_PROJECTS' | 'MAX_ACTIVE_TASKS' | 'AI_REQUESTS_PER_PERIOD';

export const LimitKey = {
  MAX_MEMBERS: 'MAX_MEMBERS',
  MAX_PROJECTS: 'MAX_PROJECTS',
  MAX_ACTIVE_TASKS: 'MAX_ACTIVE_TASKS',
  AI_REQUESTS_PER_PERIOD: 'AI_REQUESTS_PER_PERIOD',
} as const;

export interface PlanLimits {
  maxMembers: number;
  maxProjects: number;
  maxActiveTasks: number;
  aiRequestsPerPeriod: number;
  features: Record<FeatureKey, boolean>;
}

export interface UsageMetric {
  current: number;
  limit: number;
  remaining: number;
}

export interface OrganizationUsage {
  organizationId: string;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  periodStart: string;
  periodEnd: string;
  members: UsageMetric;
  projects: UsageMetric;
  activeTasks: UsageMetric;
  aiRequests: UsageMetric;
  features: Record<FeatureKey, boolean>;
}

export interface EntitlementErrorDetails {
  feature: FeatureKey | LimitKey;
  limit?: number;
  current?: number;
  remaining?: number;
  plan?: Plan;
}
