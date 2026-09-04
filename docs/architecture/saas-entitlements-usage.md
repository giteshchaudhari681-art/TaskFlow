# SaaS Administration, Usage Controls & Subscription-Ready Architecture

## Overview & Core Philosophy

TaskFlow is an AI-powered multi-tenant project management SaaS. PR27 establishes a subscription-ready domain abstraction that governs organization plans, feature flags, numeric capacity limits, and AI quota consumption.

### Authorization vs. Entitlement Boundary

TaskFlow strictly separates **Authorization** from **Entitlement**:

| Dimension                              | Question Answered                                                                                | Evaluation Context                                                                                     | Enforcement Point                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Authorization (RBAC & Isolation)**   | _"Is this individual user allowed to perform this operation?"_                                   | User identity, organization membership, role privileges (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`, `LEAD`) | `requireAuth`, `requireOrgRole`, service role guards                                                           |
| **Entitlement (Plan Limits & Quotas)** | _"Is this organization allowed to consume this capability under its current subscription plan?"_ | Tenant subscription plan (`FREE`, `PRO`, `BUSINESS`), active period, resource capacity                 | `entitlementService.requireFeature`, `entitlementService.requireCapacity`, `entitlementService.reserveAIQuota` |

Authorization is evaluated first. If an unauthenticated user or an unauthorized role (e.g. `VIEWER`) attempts an action, they receive `401 UNAUTHORIZED` or `403 FORBIDDEN` immediately, without discovering the organization's plan tier or entitlement limits.

```
Incoming Request
      │
      ▼
1. Authentication (JWT token verified)
      │
      ▼
2. Tenant Boundary Check (User belongs to requested Organization)
      │
      ▼
3. Role-Based Access Control (User has necessary Role/Rank for action)
      │
      ▼
4. Authoritative Entitlement & Capacity Check (Plan tier & remaining limits allow consumption)
      │
      ▼
5. Domain Mutation / AI Service Execution
      │
      ▼
6. Authoritative Persistence & Usage Metric Recording
```

---

## Canonical Plan Model

TaskFlow defines three canonical subscription tiers, managed neutrally in PostgreSQL on the `organizations` table:

- `FREE`: Starter tier for individual creators and small teams.
- `PRO`: Growth tier with higher limits and unlocked AI task action proposals.
- `BUSINESS`: Enterprise-ready scale with maximum capacity and priority resources.

### Internal Subscription States

Organizations track their subscription status via `SubscriptionStatus`:

- `ACTIVE`: Standard operational state with full entitled features and quotas.
- `TRIALING`: Temporary evaluation period; receives target plan entitlements.
- `PAST_DUE`: Billing grace period; existing resources remain accessible while new additions may be capped.
- `CANCELED`: Account terminated; feature gating disables advanced capabilities until re-activated.

_Note: These states represent internal subscription state machines. No payment gateway webhooks or external billing lifecycles are assumed._

---

## Centralized Entitlement Definitions

Plan configurations are centralized in `apps/api/src/config/plans.ts`:

```typescript
export const PLAN_DEFINITIONS: Record<Plan, PlanLimits> = {
  [Plan.FREE]: {
    maxMembers: 5,
    maxProjects: 3,
    maxActiveTasks: 500,
    aiRequestsPerPeriod: 50,
    features: {
      AI_PROJECT_INSIGHTS: true,
      AI_TASK_INTELLIGENCE: true,
      AI_TASK_DECOMPOSITION: true,
      AI_TASK_ACTIONS: false, // Disabled on FREE tier
      AUDIT_LOG: true,
      BACKGROUND_JOBS: true,
    },
  },
  [Plan.PRO]: {
    maxMembers: 25,
    maxProjects: 25,
    maxActiveTasks: 5000,
    aiRequestsPerPeriod: 500,
    features: {
      AI_PROJECT_INSIGHTS: true,
      AI_TASK_INTELLIGENCE: true,
      AI_TASK_DECOMPOSITION: true,
      AI_TASK_ACTIONS: true,
      AUDIT_LOG: true,
      BACKGROUND_JOBS: true,
    },
  },
  [Plan.BUSINESS]: {
    maxMembers: 100,
    maxProjects: 100,
    maxActiveTasks: 25000,
    aiRequestsPerPeriod: 2500,
    features: {
      AI_PROJECT_INSIGHTS: true,
      AI_TASK_INTELLIGENCE: true,
      AI_TASK_DECOMPOSITION: true,
      AI_TASK_ACTIONS: true,
      AUDIT_LOG: true,
      BACKGROUND_JOBS: true,
    },
  },
};
```

---

## Authoritative Usage Calculation

Rather than relying on denormalized counters that can drift or become inconsistent under concurrent writes, resource usage is authoritatively calculated from PostgreSQL:

1. **Organization Members (`MAX_MEMBERS`)**:
   - `COUNT(*)` from `organization_members` where `organizationId = orgId`.
   - Active members consume capacity. TaskFlow does not maintain unaccepted email invitations; member addition binds directly to registered users.
2. **Projects (`MAX_PROJECTS`)**:
   - `COUNT(*)` from `projects` where `organizationId = orgId`.
3. **Active Tasks (`MAX_ACTIVE_TASKS`)**:
   - `COUNT(*)` from `tasks` where `project.organizationId = orgId`, `archivedAt IS NULL`, and `status != 'CANCELLED'`.
   - Completed, in-progress, and todo tasks count as active; explicitly cancelled or archived tasks do not count towards active task capacity.
4. **AI Requests (`AI_REQUESTS_PER_PERIOD`)**:
   - `COUNT(*)` from `ai_usage_records` where `organizationId = orgId`, `createdAt >= periodStart AND createdAt < periodEnd`, and `status = 'SUCCESS'`.

---

## AI Quota Semantics & Upstream Failure Policy

AI operations differ from static entities because each request consumes external LLM resources.

### Quota Policy

1. **Pre-Invocation Reservation**:
   - Before dispatching a request to the internal Python AI service, `reserveAIQuota` validates feature entitlement and atomically increments the period reservation.
   - If the organization has reached its quota limit (`current >= limit`), an `ENTITLEMENT_LIMIT_REACHED` error is thrown immediately. The Python AI service is **never invoked** when quota is exhausted.
2. **Failed Upstream Policy**:
   - **Failed provider requests do NOT consume tenant quota.**
   - If the Python AI service returns a 5xx error, times out, or encounters a network fault, the catch block calls `revertAIQuota(usageRecordId)`.
   - The usage record is deleted or reverted, ensuring tenants are not penalized for infrastructure interruptions.
3. **Privacy & Security**:
   - `AIUsageRecord` stores only: `id`, `organizationId`, `operation`, `requestId`, `status`, and `createdAt`.
   - Sensitive user prompts, LLM responses, and task descriptions are strictly prohibited from usage tracking tables.

---

## Concurrency Handling & Race Condition Prevention

Naive implementations that perform `SELECT count()` followed by `INSERT` are vulnerable to race conditions under concurrent requests.

TaskFlow utilizes **PostgreSQL row-level locking**:

```sql
SELECT id FROM organizations WHERE id = $1::uuid FOR UPDATE;
```

Inside a Prisma transaction (`db.$transaction`):

1. The transaction acquires an exclusive row lock on the parent `Organization` row.
2. Concurrent requests for that same organization are serialized at the database level until the transaction commits.
3. The count is checked authoritatively against the allowed limit.
4. If capacity remains, the new record is created within the same transaction.
5. If capacity is exhausted, an `EntitlementLimitError` is thrown, rolling back the transaction.

This mechanism protects:

- Concurrent AI requests (`recordAIUsageAtomic`)
- Concurrent project creations (`projectRepository.create`)
- Concurrent member invitations (`organizationRepository.addMember`)
- Concurrent task creations (`taskRepository.create`)

No distributed lock manager or Redis is required; PostgreSQL row locking provides ACID guarantees natively.

---

## Deterministic Usage Period Strategy

Each organization tracks its billing cycle via `currentPeriodStart` and `currentPeriodEnd`:

- **Configured Period**: If an active subscription has explicit period timestamps, usage queries bounded between `currentPeriodStart` and `currentPeriodEnd`.
- **Deterministic Monthly Fallback**: If an organization is on the default `FREE` tier or has no explicit subscription period, TaskFlow deterministically derives a monthly UTC period starting on the 1st of the current month at 00:00:00 UTC and ending on the 1st of the next month at 00:00:00 UTC.
- **Persistence**: Period usage is persisted in PostgreSQL; process restarts or server crashes have zero effect on usage accuracy.

---

## Structured Limit Errors

When a plan limit is reached or a feature is disabled, the API returns a structured HTTP 403 error compliant with the TaskFlow response envelope:

```json
{
  "success": false,
  "error": {
    "code": "ENTITLEMENT_LIMIT_REACHED",
    "message": "Organization project limit reached (3/3). Upgrade to create more projects.",
    "details": {
      "feature": "MAX_PROJECTS",
      "limit": 3,
      "current": 3,
      "remaining": 0,
      "plan": "FREE"
    },
    "meta": {
      "feature": "MAX_PROJECTS",
      "limit": 3,
      "current": 3,
      "remaining": 0,
      "plan": "FREE"
    }
  }
}
```

No internal database credentials or provider secrets are exposed.

---

## Tenant Isolation & RBAC

1. **Workspace Boundary**: Every entitlement check and usage calculation requires a verified `organizationId`. A caller must be an active member of that workspace.
2. **Access Control**:
   - `GET /api/v1/organizations/:organizationId/usage`: Restricted to `OWNER` and `ADMIN`. Regular `MEMBER` and `VIEWER` roles receive `403 FORBIDDEN`.
   - `PATCH /api/v1/organizations/:organizationId/plan`: Strictly restricted to `OWNER`.
3. **Cross-Tenant Proof**: Tenant Alpha cannot inspect Tenant Beta's plan, query its usage, or consume its quota. Cross-tenant queries are blocked at the membership middleware layer.

---

## Audit Integration

In accordance with PR25 audit standards, administrative and entitlement security events are persisted to the audit log:

- `ENTITLEMENT_LIMIT_REACHED`: Emitted when an action is rejected due to a disabled feature or exceeded quota. Attributed to the attempting actor (`ActorType.USER`, `AuditSource.USER`).
- `SUBSCRIPTION_PLAN_CHANGED`: Emitted when an organization's plan tier is modified. Captures `previousPlan` and `newPlan` in metadata.

Routine, permitted usage checks do **not** emit audit logs, preventing log spam and preserving database performance.

---

## Provider-Neutral Billing Boundary

TaskFlow defines an explicit billing boundary interface in `apps/api/src/integrations/billing/billingProvider.ts`:

```typescript
export interface IBillingProvider {
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;
  cancelSubscription(subscriptionId: string): Promise<ExternalSubscription>;
  getSubscription(subscriptionId: string): Promise<ExternalSubscription | null>;
  handleWebhook(rawBody: string | Buffer, signature: string): Promise<BillingWebhookEvent>;
}
```

### Why Stripe / Payment Gateways Are Intentionally Excluded in PR27

1. **Separation of Concerns**: Subscription entitlement architecture belongs to domain modeling, whereas payment gateways are external third-party I/O adapters.
2. **Portability**: Implementing the core domain first allows future deployment against Stripe, Lemon Squeezy, Paddle, or custom enterprise invoicing without refactoring domain rules.
3. **Zero Fake Billing**: TaskFlow avoids simulated checkouts, mock webhooks, or fake payment tokens. All plan states reflect genuine internal administration.

---

## Frontend Usage UI

The Settings panel includes a dedicated **Usage & Plan** tab (`UsageSettings.tsx`):

- Displays current plan badge (`FREE`, `PRO`, `BUSINESS`) and subscription status.
- Progress meters for Members, Projects, Active Tasks, and AI Operations.
- Visual warning indicators and banner explanations when limits are reached.
- Complete feature matrix displaying enabled vs. disabled plan capabilities.
- Owner-only administrative plan tier switcher for development and staging environments.

---

## Known Limitations & Future Roadmap

1. **Automated Billing Webhooks**: When Stripe or an external billing provider is introduced, webhooks will map directly to `entitlementService.updateOrganizationPlan` without modifying service entitlement checks.
2. **Storage Metering**: File asset upload byte tracking (`MAX_STORAGE_BYTES`) can be added into `usage.service.ts` when multi-cloud object storage is introduced.
3. **Per-Seat Proration**: Proration logic will reside in the billing provider adapter when invoicing is integrated.
