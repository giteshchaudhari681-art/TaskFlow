import {
  Plan,
  SubscriptionStatus,
  FeatureKey,
  LimitKey,
  PlanLimits,
  AIOperation,
} from '@taskflow/shared';
import { ActorType, AuditAction, AuditSource } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { PLAN_DEFINITIONS } from '../config/plans.js';
import { usageService } from './usage.service.js';
import { usageRepository } from '../repositories/usage.repository.js';
import { auditService } from './audit.service.js';
import { EntitlementLimitError } from '../entitlements/errors.js';
import { AppError } from '../middleware/errorHandler.js';

export class EntitlementService {
  /**
   * Retrieves organization plan and subscription metadata.
   */
  async getOrganizationPlan(
    organizationId: string,
    fallbackToFree = false
  ): Promise<{
    plan: Plan;
    subscriptionStatus: SubscriptionStatus;
    limits: PlanLimits;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
  }> {
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
      if (fallbackToFree) {
        return {
          plan: Plan.FREE,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          limits: PLAN_DEFINITIONS[Plan.FREE],
          currentPeriodStart: null,
          currentPeriodEnd: null,
        };
      }
      throw new AppError('NOT_FOUND', 'Organization not found', 404);
    }

    const plan = (org.plan as Plan) || Plan.FREE;
    const subscriptionStatus =
      (org.subscriptionStatus as SubscriptionStatus) || SubscriptionStatus.ACTIVE;
    const limits = PLAN_DEFINITIONS[plan] || PLAN_DEFINITIONS[Plan.FREE];

    return {
      plan,
      subscriptionStatus,
      limits,
      currentPeriodStart: org.currentPeriodStart,
      currentPeriodEnd: org.currentPeriodEnd,
    };
  }

  /**
   * Verifies that a specific boolean feature flag is enabled for the organization.
   * Throws EntitlementLimitError and records an audit event if disabled.
   */
  async requireFeature(
    organizationId: string,
    featureKey: FeatureKey,
    actorUserId?: string,
    requestId?: string
  ): Promise<void> {
    let planInfo;
    try {
      planInfo = await this.getOrganizationPlan(organizationId);
    } catch (err: unknown) {
      if (err instanceof AppError && err.statusCode === 404) {
        planInfo = {
          plan: Plan.FREE,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          limits: PLAN_DEFINITIONS[Plan.FREE],
        };
      } else {
        throw err;
      }
    }
    const { plan, limits, subscriptionStatus } = planInfo;

    const isEnabled = limits.features[featureKey] === true;
    const isCanceled = subscriptionStatus === SubscriptionStatus.CANCELED;

    if (!isEnabled || isCanceled) {
      await auditService.record({
        organizationId,
        actorUserId: actorUserId ?? null,
        actorType: actorUserId ? ActorType.USER : ActorType.SYSTEM,
        action: AuditAction.ENTITLEMENT_LIMIT_REACHED,
        resourceType: 'Feature',
        resourceId: featureKey,
        requestId: requestId ?? null,
        source: actorUserId ? AuditSource.USER : AuditSource.SYSTEM,
        metadata: {
          feature: featureKey,
          plan,
          subscriptionStatus,
          reason: isCanceled ? 'Subscription is canceled' : 'Feature not enabled on current plan',
        },
      });

      throw new EntitlementLimitError(
        `Feature ${featureKey} is not available on your current ${plan} plan. Upgrade to access this feature.`,
        {
          feature: featureKey,
          plan,
        }
      );
    }
  }

  /**
   * Authoritatively enforces capacity limits (e.g. MAX_PROJECTS, MAX_MEMBERS, MAX_ACTIVE_TASKS).
   * Throws EntitlementLimitError and records an audit event if limit would be breached.
   */
  async requireCapacity(
    organizationId: string,
    limitKey: LimitKey,
    increment = 1,
    actorUserId?: string,
    requestId?: string
  ): Promise<void> {
    let usage;
    try {
      usage = await usageService.getOrganizationUsage(organizationId);
    } catch (err: unknown) {
      if (err instanceof AppError && err.statusCode === 404) {
        usage = {
          organizationId,
          plan: Plan.FREE,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          periodStart: new Date().toISOString(),
          periodEnd: new Date().toISOString(),
          members: { current: 1, limit: 10, remaining: 9 },
          projects: { current: 0, limit: 10, remaining: 10 },
          activeTasks: { current: 0, limit: 1000, remaining: 1000 },
          aiRequests: { current: 0, limit: 100, remaining: 100 },
          features: PLAN_DEFINITIONS[Plan.FREE].features,
        };
      } else {
        throw err;
      }
    }
    let metric: { current: number; limit: number; remaining: number };

    switch (limitKey) {
      case LimitKey.MAX_MEMBERS:
        metric = usage.members;
        break;
      case LimitKey.MAX_PROJECTS:
        metric = usage.projects;
        break;
      case LimitKey.MAX_ACTIVE_TASKS:
        metric = usage.activeTasks;
        break;
      case LimitKey.AI_REQUESTS_PER_PERIOD:
        metric = usage.aiRequests;
        break;
      default:
        return;
    }

    if (metric.current + increment > metric.limit) {
      await auditService.record({
        organizationId,
        actorUserId: actorUserId ?? null,
        actorType: actorUserId ? ActorType.USER : ActorType.SYSTEM,
        action: AuditAction.ENTITLEMENT_LIMIT_REACHED,
        resourceType: 'Capacity',
        resourceId: limitKey,
        requestId: requestId ?? null,
        source: actorUserId ? AuditSource.USER : AuditSource.SYSTEM,
        metadata: {
          feature: limitKey,
          limit: metric.limit,
          current: metric.current,
          remaining: metric.remaining,
          plan: usage.plan,
        },
      });

      throw new EntitlementLimitError(
        `Organization limit for ${limitKey} reached (${metric.current}/${metric.limit}). Upgrade your plan to increase capacity.`,
        {
          feature: limitKey,
          limit: metric.limit,
          current: metric.current,
          remaining: metric.remaining,
          plan: usage.plan,
        }
      );
    }
  }

  /**
   * Atomically checks feature entitlement, validates quota, and reserves an AI request in PostgreSQL.
   * Concurrency-safe against race conditions.
   */
  async reserveAIQuota(
    organizationId: string,
    operation: AIOperation,
    actorUserId?: string,
    requestId?: string
  ): Promise<{ usageRecordId: string }> {
    // 1. Map operation to corresponding feature flag
    let requiredFeature: FeatureKey;
    switch (operation) {
      case 'PROJECT_INSIGHT':
        requiredFeature = FeatureKey.AI_PROJECT_INSIGHTS;
        break;
      case 'TASK_SUMMARY':
        requiredFeature = FeatureKey.AI_TASK_INTELLIGENCE;
        break;
      case 'TASK_DECOMPOSITION':
        requiredFeature = FeatureKey.AI_TASK_DECOMPOSITION;
        break;
      case 'TASK_ACTIONS':
        requiredFeature = FeatureKey.AI_TASK_ACTIONS;
        break;
      default:
        requiredFeature = FeatureKey.AI_PROJECT_INSIGHTS;
    }

    // 2. Enforce feature flag entitlement
    await this.requireFeature(organizationId, requiredFeature, actorUserId, requestId);

    // 3. Resolve plan, limits, and usage period
    const { plan, limits, subscriptionStatus, currentPeriodStart, currentPeriodEnd } =
      await this.getOrganizationPlan(organizationId, true);

    if (subscriptionStatus === SubscriptionStatus.CANCELED) {
      throw new EntitlementLimitError('Cannot run AI operations on a canceled subscription.', {
        feature: LimitKey.AI_REQUESTS_PER_PERIOD,
        limit: limits.aiRequestsPerPeriod,
        current: limits.aiRequestsPerPeriod,
        remaining: 0,
        plan,
      });
    }

    const { periodStart, periodEnd } = usageService.resolvePeriod({
      currentPeriodStart,
      currentPeriodEnd,
    });

    // 4. Atomically record usage under row lock
    const reservation = await usageRepository.recordAIUsageAtomic(
      organizationId,
      operation,
      limits.aiRequestsPerPeriod,
      periodStart,
      periodEnd,
      requestId
    );

    if (!reservation) {
      // Limit breached
      const currentCount = await usageRepository.getAIUsageCount(
        organizationId,
        periodStart,
        periodEnd
      );

      await auditService.record({
        organizationId,
        actorUserId: actorUserId ?? null,
        actorType: actorUserId ? ActorType.USER : ActorType.SYSTEM,
        action: AuditAction.ENTITLEMENT_LIMIT_REACHED,
        resourceType: 'Capacity',
        resourceId: LimitKey.AI_REQUESTS_PER_PERIOD,
        requestId: requestId ?? null,
        source: actorUserId ? AuditSource.USER : AuditSource.SYSTEM,
        metadata: {
          feature: LimitKey.AI_REQUESTS_PER_PERIOD,
          limit: limits.aiRequestsPerPeriod,
          current: currentCount,
          remaining: 0,
          plan,
        },
      });

      throw new EntitlementLimitError(
        `AI monthly request allowance reached (${currentCount}/${limits.aiRequestsPerPeriod}). Upgrade your plan to increase quota.`,
        {
          feature: LimitKey.AI_REQUESTS_PER_PERIOD,
          limit: limits.aiRequestsPerPeriod,
          current: currentCount,
          remaining: 0,
          plan,
        }
      );
    }

    return { usageRecordId: reservation.usageRecordId };
  }

  /**
   * Reverts an AI quota reservation if the downstream provider call failed with an unexpected error.
   */
  async revertAIQuota(usageRecordId: string): Promise<void> {
    await usageRepository.markAIUsageFailed(usageRecordId);
  }

  /**
   * Updates organization subscription plan and status (internal / development / admin mechanism).
   * Records SUBSCRIPTION_PLAN_CHANGED audit event.
   */
  async updateOrganizationPlan(
    organizationId: string,
    newPlan: Plan,
    status?: SubscriptionStatus,
    actorUserId?: string,
    requestId?: string
  ): Promise<{ organizationId: string; plan: Plan; updatedAt: string }> {
    const existing = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true, subscriptionStatus: true },
    });

    if (!existing) {
      throw new AppError('NOT_FOUND', 'Organization not found', 404);
    }

    const previousPlan = (existing.plan as Plan) || Plan.FREE;

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        plan: newPlan,
        ...(status ? { subscriptionStatus: status } : {}),
      },
    });

    await auditService.record({
      organizationId,
      actorUserId: actorUserId ?? null,
      actorType: actorUserId ? ActorType.USER : ActorType.SYSTEM,
      action: AuditAction.SUBSCRIPTION_PLAN_CHANGED,
      resourceType: 'Organization',
      resourceId: organizationId,
      requestId: requestId ?? null,
      source: actorUserId ? AuditSource.USER : AuditSource.SYSTEM,
      metadata: {
        previousPlan,
        newPlan,
        status: status ?? existing.subscriptionStatus,
      },
    });

    return {
      organizationId: updated.id,
      plan: updated.plan as Plan,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}

export const entitlementService = new EntitlementService();
