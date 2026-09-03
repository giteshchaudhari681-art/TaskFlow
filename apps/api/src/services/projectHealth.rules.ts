import { ProjectHealthState, ProjectHealthSignals } from '@taskflow/shared';

export const PROJECT_HEALTH_THRESHOLDS = {
  // CRITICAL triggers
  CRITICAL_URGENT_OVERDUE: 2,
  CRITICAL_OVERDUE_COUNT: 5,
  CRITICAL_BLOCKER_COUNT: 4,
  CRITICAL_OVERDUE_RATIO: 0.35,

  // AT_RISK triggers
  AT_RISK_OVERDUE_COUNT: 1,
  AT_RISK_BLOCKER_COUNT: 1,
  AT_RISK_MILESTONES_COUNT: 1,
  AT_RISK_OVERDUE_MILESTONES_COUNT: 1,

  // Score Deductions (Base: 100)
  PENALTY_OVERDUE_TASK: 10,
  MAX_PENALTY_OVERDUE_TASKS: 40,
  PENALTY_URGENT_OVERDUE_TASK: 10,
  MAX_PENALTY_URGENT_OVERDUE: 30,
  PENALTY_BLOCKED_TASK: 10,
  MAX_PENALTY_BLOCKED_TASKS: 30,
  PENALTY_OVERDUE_MILESTONE: 25,
  MAX_PENALTY_OVERDUE_MILESTONES: 50,
  PENALTY_AT_RISK_MILESTONE: 15,
  MAX_PENALTY_AT_RISK_MILESTONES: 30,
} as const;

/**
 * Calculates canonical project completion percentage:
 * Formula: Math.round((doneCount / (totalCount - cancelledCount)) * 100)
 * Edge cases:
 * - Empty project (totalCount = 0) -> 0%
 * - All cancelled tasks (totalCount - cancelledCount <= 0) -> 0%
 * - Never returns NaN, null, or Infinity.
 */
export function calculateCanonicalCompletion(
  doneCount: number,
  totalCount: number,
  cancelledCount: number
): number {
  const denominator = totalCount - cancelledCount;
  if (denominator <= 0 || doneCount <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((doneCount / denominator) * 100)));
}

/**
 * Evaluates Project Health deterministically from live project signals.
 */
export function evaluateProjectHealth(
  signals: ProjectHealthSignals,
  totalTasksCount: number,
  eligibleTasksCount: number,
  totalMilestonesCount: number
): {
  state: ProjectHealthState;
  score: number;
  executiveSummary: string;
  reasons: string[];
} {
  const reasons: string[] = [];

  // 1. Check for NO_DATA condition
  if (totalTasksCount === 0 && totalMilestonesCount === 0) {
    return {
      state: 'NO_DATA',
      score: 100,
      executiveSummary:
        'No tasks or milestones logged yet. Create your first task to initiate project health tracking.',
      reasons: ['No active task or milestone data available to calculate project health'],
    };
  }

  // Calculate remaining active tasks (not DONE and not CANCELLED)
  const remainingActiveTasks = Math.max(
    0,
    eligibleTasksCount - eligibleTasksCount * (signals.completionPercentage / 100)
  );
  const overdueRatio = remainingActiveTasks > 0 ? signals.overdueTasks / remainingActiveTasks : 0;

  // 2. Identify reasons
  if (signals.urgentOverdueTasks > 0) {
    reasons.push(
      `${signals.urgentOverdueTasks} urgent/high-priority task${signals.urgentOverdueTasks > 1 ? 's are' : ' is'} overdue`
    );
  }
  if (signals.overdueTasks > 0 && signals.urgentOverdueTasks !== signals.overdueTasks) {
    const regularOverdue = signals.overdueTasks - signals.urgentOverdueTasks;
    reasons.push(`${regularOverdue} task${regularOverdue > 1 ? 's are' : ' is'} overdue`);
  }
  if (signals.blockedTasks > 0) {
    reasons.push(
      `${signals.blockedTasks} task${signals.blockedTasks > 1 ? 's have' : ' has'} unresolved dependency blockers`
    );
  }
  if (signals.overdueMilestones > 0) {
    reasons.push(
      `${signals.overdueMilestones} milestone${signals.overdueMilestones > 1 ? 's are' : ' is'} past due date`
    );
  }
  if (signals.atRiskMilestones > 0) {
    reasons.push(
      `${signals.atRiskMilestones} milestone${signals.atRiskMilestones > 1 ? 's are' : ' is'} at risk`
    );
  }

  // 3. Determine Health State
  let state: ProjectHealthState = 'HEALTHY';

  const isCritical =
    signals.urgentOverdueTasks >= PROJECT_HEALTH_THRESHOLDS.CRITICAL_URGENT_OVERDUE ||
    signals.overdueTasks >= PROJECT_HEALTH_THRESHOLDS.CRITICAL_OVERDUE_COUNT ||
    signals.blockedTasks >= PROJECT_HEALTH_THRESHOLDS.CRITICAL_BLOCKER_COUNT ||
    (signals.overdueMilestones >= 1 && signals.overdueTasks >= 1) ||
    overdueRatio >= PROJECT_HEALTH_THRESHOLDS.CRITICAL_OVERDUE_RATIO;

  const isAtRisk =
    signals.overdueTasks >= PROJECT_HEALTH_THRESHOLDS.AT_RISK_OVERDUE_COUNT ||
    signals.blockedTasks >= PROJECT_HEALTH_THRESHOLDS.AT_RISK_BLOCKER_COUNT ||
    signals.atRiskMilestones >= PROJECT_HEALTH_THRESHOLDS.AT_RISK_MILESTONES_COUNT ||
    signals.overdueMilestones >= PROJECT_HEALTH_THRESHOLDS.AT_RISK_OVERDUE_MILESTONES_COUNT;

  if (isCritical) {
    state = 'CRITICAL';
  } else if (isAtRisk) {
    state = 'AT_RISK';
  } else {
    state = 'HEALTHY';
    reasons.push('All deliverables are progressing on schedule with zero blockers or overdue work');
  }

  // 4. Calculate Health Score (0–100)
  let score = 100;
  const overduePenalty = Math.min(
    PROJECT_HEALTH_THRESHOLDS.MAX_PENALTY_OVERDUE_TASKS,
    signals.overdueTasks * PROJECT_HEALTH_THRESHOLDS.PENALTY_OVERDUE_TASK
  );
  const urgentPenalty = Math.min(
    PROJECT_HEALTH_THRESHOLDS.MAX_PENALTY_URGENT_OVERDUE,
    signals.urgentOverdueTasks * PROJECT_HEALTH_THRESHOLDS.PENALTY_URGENT_OVERDUE_TASK
  );
  const blockerPenalty = Math.min(
    PROJECT_HEALTH_THRESHOLDS.MAX_PENALTY_BLOCKED_TASKS,
    signals.blockedTasks * PROJECT_HEALTH_THRESHOLDS.PENALTY_BLOCKED_TASK
  );
  const overdueMsPenalty = Math.min(
    PROJECT_HEALTH_THRESHOLDS.MAX_PENALTY_OVERDUE_MILESTONES,
    signals.overdueMilestones * PROJECT_HEALTH_THRESHOLDS.PENALTY_OVERDUE_MILESTONE
  );
  const atRiskMsPenalty = Math.min(
    PROJECT_HEALTH_THRESHOLDS.MAX_PENALTY_AT_RISK_MILESTONES,
    signals.atRiskMilestones * PROJECT_HEALTH_THRESHOLDS.PENALTY_AT_RISK_MILESTONE
  );

  score = Math.max(
    0,
    score - (overduePenalty + urgentPenalty + blockerPenalty + overdueMsPenalty + atRiskMsPenalty)
  );

  // 5. Generate Executive Summary
  let executiveSummary = '';
  if (state === 'CRITICAL') {
    executiveSummary = `Project execution is critical. Severe delivery risks detected across ${signals.overdueTasks} overdue tasks and ${signals.blockedTasks} dependency blockers. Immediate remediation required.`;
  } else if (state === 'AT_RISK') {
    executiveSummary = `Delivery risk is increasing due to ${signals.overdueTasks > 0 ? `${signals.overdueTasks} overdue work items` : ''}${signals.overdueTasks > 0 && signals.blockedTasks > 0 ? ' and ' : ''}${signals.blockedTasks > 0 ? `${signals.blockedTasks} unresolved dependency blockers` : ''}${signals.atRiskMilestones > 0 ? `${signals.overdueTasks || signals.blockedTasks ? ' alongside ' : ''}${signals.atRiskMilestones} at-risk milestone` : ''}.`;
  } else {
    executiveSummary = `Project execution is healthy. Deliverables are on track with ${signals.completionPercentage}% overall completion and zero blocking dependencies.`;
  }

  return {
    state,
    score,
    executiveSummary,
    reasons,
  };
}
