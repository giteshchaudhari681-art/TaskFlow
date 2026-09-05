import { Plan, SubscriptionStatus, OrganizationUsage, UsageMetric } from '@taskflow/shared';
import { prisma } from '../lib/prisma.js';
import { PLAN_DEFINITIONS } from '../config/plans.js';
import { usageRepository } from '../repositories/usage.repository.js';
import { AppError } from '../middleware/errorHandler.js';

export interface ResolvedPeriod {
  periodStart: Date;
  periodEnd: Date;
}

export class UsageService {
  /**
   * Deterministically resolves subscription usage period.
   * Uses organization currentPeriodStart/End if set; otherwise falls back to current UTC calendar month.
   */
  resolvePeriod(org: {
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
  }): ResolvedPeriod {
    if (org.currentPeriodStart && org.currentPeriodEnd) {
      return {
        periodStart: org.currentPeriodStart,
        periodEnd: org.currentPeriodEnd,
      };
    }

    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const periodEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0)
    );

    return { periodStart, periodEnd };
  }

  /**
   * Returns authoritative organization usage and capacity metrics against current plan limits.
   */
  async getOrganizationUsage(organizationId: string): Promise<OrganizationUsage> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        plan: true,
        subscriptionStatus: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      },
    });

    if (!org) {
      throw new AppError('NOT_FOUND', 'Organization not found', 404);
    }

    const plan = (org.plan as Plan) || Plan.FREE;
    const subscriptionStatus =
      (org.subscriptionStatus as SubscriptionStatus) || SubscriptionStatus.ACTIVE;
    const planLimits = PLAN_DEFINITIONS[plan] || PLAN_DEFINITIONS[Plan.FREE];

    const { periodStart, periodEnd } = this.resolvePeriod(org);

    // Fetch authoritative counts without N+1 queries
    const counts = await usageRepository.getAllCounts(organizationId, periodStart, periodEnd);

    // If canceled, remaining AI quota is 0
    const isCanceled = subscriptionStatus === SubscriptionStatus.CANCELED;

    const buildMetric = (
      current: number,
      limit: number,
      disableRemaining = false
    ): UsageMetric => ({
      current,
      limit,
      remaining: disableRemaining ? 0 : Math.max(0, limit - current),
    });

    return {
      organizationId,
      plan,
      subscriptionStatus,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      members: buildMetric(counts.members, planLimits.maxMembers),
      projects: buildMetric(counts.projects, planLimits.maxProjects),
      activeTasks: buildMetric(counts.activeTasks, planLimits.maxActiveTasks),
      aiRequests: buildMetric(counts.aiRequests, planLimits.aiRequestsPerPeriod, isCanceled),
      features: { ...planLimits.features },
    };
  }
}

export const usageService = new UsageService();
