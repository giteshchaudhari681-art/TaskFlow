import { Plan, FeatureKey, PlanLimits } from '@taskflow/shared';

export const PLAN_DEFINITIONS: Record<Plan, PlanLimits> = {
  [Plan.FREE]: {
    maxMembers: 10,
    maxProjects: 10,
    maxActiveTasks: 1000,
    aiRequestsPerPeriod: 100,
    features: {
      [FeatureKey.AI_PROJECT_INSIGHTS]: true,
      [FeatureKey.AI_TASK_INTELLIGENCE]: true,
      [FeatureKey.AI_TASK_DECOMPOSITION]: true,
      [FeatureKey.AI_TASK_ACTIONS]: true,
      [FeatureKey.AUDIT_LOG]: true,
      [FeatureKey.BACKGROUND_JOBS]: true,
    },
  },
  [Plan.PRO]: {
    maxMembers: 50,
    maxProjects: 50,
    maxActiveTasks: 10000,
    aiRequestsPerPeriod: 1000,
    features: {
      [FeatureKey.AI_PROJECT_INSIGHTS]: true,
      [FeatureKey.AI_TASK_INTELLIGENCE]: true,
      [FeatureKey.AI_TASK_DECOMPOSITION]: true,
      [FeatureKey.AI_TASK_ACTIONS]: true,
      [FeatureKey.AUDIT_LOG]: true,
      [FeatureKey.BACKGROUND_JOBS]: true,
    },
  },
  [Plan.BUSINESS]: {
    maxMembers: 500,
    maxProjects: 500,
    maxActiveTasks: 50000,
    aiRequestsPerPeriod: 5000,
    features: {
      [FeatureKey.AI_PROJECT_INSIGHTS]: true,
      [FeatureKey.AI_TASK_INTELLIGENCE]: true,
      [FeatureKey.AI_TASK_DECOMPOSITION]: true,
      [FeatureKey.AI_TASK_ACTIONS]: true,
      [FeatureKey.AUDIT_LOG]: true,
      [FeatureKey.BACKGROUND_JOBS]: true,
    },
  },
};
