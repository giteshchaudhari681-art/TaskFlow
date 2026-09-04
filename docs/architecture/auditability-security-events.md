# Auditability, Security Events & Administrative Controls

> PR-25 · Branch: `feat/pr-25-auditability-security-events`

## Overview

TaskFlow implements an **append-only audit trail** stored in PostgreSQL that answers the six
fundamental auditability questions for every significant event in the system:

| Dimension        | Column / Field                                                       |
| ---------------- | -------------------------------------------------------------------- |
| **WHO**          | `actorUserId`, `actorType` (`USER` \| `SYSTEM` \| `AI`)              |
| **WHAT**         | `action` (from `AuditAction` enum)                                   |
| **WHERE**        | `organizationId`, `projectId`, `resourceType`, `resourceId`          |
| **WHEN**         | `createdAt` (server-side, immutable, set by DB default)              |
| **WHAT CHANGED** | `metadata.changes` (structured diff of before/after field values)    |
| **HOW**          | `source` (`USER` \| `SYSTEM` \| `AI` \| `AI_ASSISTED`) + `requestId` |

---

## Append-Only Model

The `audit_events` table is **authoritative only for its own historical record** — it is not the
source of truth for any business entity. The Prisma `AuditEvent` model has:

- `createdAt` auto-set via `@default(now())` — never updated.
- No `UPDATE` or `DELETE` operations are performed by application code.
- Repository only exposes `create` (append) and `findMany` (read) methods.
- No cascading deletes; orphan audit events are preserved if parent resources are archived.

```
audit_events table (append-only)
┌─────────────────────────────────────────────────────────────────────┐
│  id (UUID)  │  organization_id  │  project_id  │  actor_user_id    │
│  actor_type │  action           │  source       │  resource_type    │
│  resource_id│  request_id       │  metadata     │  created_at (↓)  │
└─────────────────────────────────────────────────────────────────────┘
                                                 ↑ immutable once written
```

---

## Actor & Source Semantics

### ActorType

| Value    | Meaning                                            |
| -------- | -------------------------------------------------- |
| `USER`   | A human user authenticated via JWT                 |
| `SYSTEM` | Internal system process (background jobs, startup) |
| `AI`     | The AI inference engine acting autonomously        |

### AuditSource

| Value         | Meaning                                                          |
| ------------- | ---------------------------------------------------------------- |
| `USER`        | Direct human action via the API                                  |
| `SYSTEM`      | Automated system process                                         |
| `AI`          | AI model is the sole originator (proposals, analysis)            |
| `AI_ASSISTED` | Human applied an AI recommendation (human actor + AI suggestion) |

### Key Rule: AI cannot be a mutation actor

> The AI engine **never** appears as the `actorType` for database-mutating events.
> When a human approves and applies an AI recommendation, the audit record uses:
>
> - `actorType: USER` (the approving human)
> - `actorUserId: <human user ID>`
> - `source: AI_ASSISTED`

---

## AI Action Lifecycle

The audit trail tracks the full lifecycle of AI-assisted task mutations:

```
AI Analysis Request
        │
        ▼
AI_ACTION_PROPOSED
  actorType: AI
  actorUserId: null
  source: AI
  (non-mutating, advisory only)
        │
        ├──────────────────┐
        ▼                  ▼
Human APPROVES        Human REJECTS
        │                  │
        ▼                  ▼
State check: does      (no audit event
current state match    for implicit rejection)
expectedCurrentState?
        │
   ┌────┴─────┐
   ▼          ▼
MATCH      MISMATCH
   │          │
   ▼          ▼
AI_ACTION_APPLIED    AI_ACTION_REJECTED
actorType: USER      (no DB mutation)
source: AI_ASSISTED  Reason: STALE_TASK_STATE
```

### Stale Proposal Protection

When a human applies an AI recommendation, the system checks that the task's **current state
in the database exactly matches** the `expectedCurrentState` in the proposal. If it doesn't:

1. An `AI_ACTION_REJECTED` event is recorded immediately.
2. A `409 STALE_TASK_STATE` error is returned.
3. **No** `AI_ACTION_APPLIED` event is ever written for the failed attempt.
4. The task is left unchanged.

---

## Tenant Isolation & RBAC Matrix

All audit queries are **strictly scoped to the authenticated user's organization**.
Cross-tenant queries are impossible — the service layer enforces this before passing
to the repository.

| Role                      | Can Query                                                   |
| ------------------------- | ----------------------------------------------------------- |
| Org `OWNER`               | All events in organization (optionally filtered by project) |
| Org `ADMIN`               | All events in organization (optionally filtered by project) |
| Project `ADMIN` or `LEAD` | Only events within their administered project(s)            |
| Org `MEMBER` / `GUEST`    | ❌ 403 Forbidden                                            |
| Non-member                | ❌ 403 Forbidden (tenant isolation)                         |

Implementation: `AuditService.list()` enforces this matrix before calling the repository.
The repository query always includes the `organizationId` in its `WHERE` clause.

---

## Transaction Boundaries & Mutation Invariants

Audit events are written **alongside** business mutations:

- For most operations (task create/update, organization/project changes), the audit event is
  written within the same database call where possible, or immediately after in a fire-and-forget
  pattern (non-critical path).
- The `AuditRepository.create()` accepts an optional `Prisma.TransactionClient` parameter,
  allowing it to be included in the same atomic transaction as the business mutation.
- Failed mutations do not produce success audit events.
  - If a business operation throws before reaching the `record()` call, no audit event is written.
  - The `AI_ACTION_REJECTED` event is written before throwing the 409 error.

---

## Metadata Sanitization

The `AuditService.sanitizeMetadata()` method applies two defensive layers:

### 1. Key-Based Redaction

Any metadata key matching these patterns (case-insensitive, partial match) is replaced
with `"[REDACTED]"`:

- `passw(or)?d` → passwords
- `token` → access tokens, refresh tokens
- `secret` → secrets
- `auth(oriz(ation)?)?` → authorization headers
- `cookie` → HTTP cookies
- `api[_-]?key` → API keys
- `refresh` → refresh tokens
- `session` → session identifiers
- `private` → private keys
- `credential` → credentials

Redaction is applied **recursively** to nested objects and arrays.

### 2. Size Enforcement

If the serialized metadata JSON exceeds **4,096 bytes**, the entire metadata object is
replaced with a safety summary:

```json
{
  "_truncated": true,
  "summary": "Metadata exceeded 4KB limit and was truncated for safety."
}
```

This prevents unbounded storage growth and ensures no large prompt content or raw AI
responses can leak into the audit trail.

---

## Query API

### Endpoint

```
GET /api/v1/organizations/:organizationId/audit-events
```

**Authentication**: Required (JWT Bearer token)
**Authorization**: Org OWNER / ADMIN, or Project ADMIN/LEAD (see RBAC matrix above)

### Query Parameters

| Parameter      | Type     | Default | Constraint                     |
| -------------- | -------- | ------- | ------------------------------ |
| `page`         | integer  | 1       | ≥ 1                            |
| `limit`        | integer  | 25      | 1–100                          |
| `action`       | string   | —       | Valid `AuditAction` enum value |
| `actorUserId`  | UUID     | —       | —                              |
| `projectId`    | UUID     | —       | Must be in same org            |
| `resourceType` | string   | —       | —                              |
| `startDate`    | ISO 8601 | —       | —                              |
| `endDate`      | ISO 8601 | —       | Must be ≥ `startDate`          |

### Response Shape

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "organizationId": "uuid",
      "projectId": "uuid | null",
      "actorUserId": "uuid | null",
      "actorType": "USER",
      "action": "TASK_CREATED",
      "resourceType": "Task",
      "resourceId": "uuid",
      "requestId": "req-abc123",
      "source": "USER",
      "metadata": { ... },
      "createdAt": "2026-09-04T14:30:00.000Z",
      "actorUser": {
        "id": "uuid",
        "name": "Alice Owner",
        "email": "alice@example.com",
        "avatarUrl": null
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 142,
    "totalPages": 6,
    "timestamp": "2026-09-04T14:30:00.000Z"
  }
}
```

---

## Database Indexes

The following composite indexes are created for efficient audit queries:

```sql
-- Primary query pattern: org-scoped chronological listing
CREATE INDEX ON audit_events (organization_id, created_at DESC);

-- Project-scoped audit view
CREATE INDEX ON audit_events (project_id, created_at DESC);

-- Actor audit trail (user history)
CREATE INDEX ON audit_events (actor_user_id, created_at DESC);

-- Action-type filtering
CREATE INDEX ON audit_events (action, created_at DESC);

-- Resource-specific history
CREATE INDEX ON audit_events (resource_type, resource_id, created_at DESC);
```

---

## Instrumented Actions

### Authentication & Session Security

| Action                        | Actor  | Trigger                                               |
| ----------------------------- | ------ | ----------------------------------------------------- |
| `AUTH_LOGIN`                  | USER   | Successful login                                      |
| `AUTH_LOGOUT`                 | USER   | Session revocation on logout                          |
| `AUTH_REFRESH_REUSE_DETECTED` | SYSTEM | Suspicious refresh token reuse (all sessions revoked) |
| `AUTH_PASSWORD_CHANGED`       | USER   | Password change and all other sessions invalidated    |

### Organization Administration

| Action                             | Actor | Trigger                                      |
| ---------------------------------- | ----- | -------------------------------------------- |
| `ORGANIZATION_CREATED`             | USER  | New organization provisioned on registration |
| `ORGANIZATION_MEMBER_INVITED`      | USER  | Admin invites a new member                   |
| `ORGANIZATION_MEMBER_ROLE_CHANGED` | USER  | Admin changes member role                    |
| `ORGANIZATION_MEMBER_REMOVED`      | USER  | Admin removes a member                       |

### Project Governance

| Action                        | Actor | Trigger                     |
| ----------------------------- | ----- | --------------------------- |
| `PROJECT_CREATED`             | USER  | Project created             |
| `PROJECT_UPDATED`             | USER  | Project settings updated    |
| `PROJECT_ARCHIVED`            | USER  | Project archived            |
| `PROJECT_MEMBER_ADDED`        | USER  | Member added to project     |
| `PROJECT_MEMBER_ROLE_CHANGED` | USER  | Project member role changed |
| `PROJECT_MEMBER_REMOVED`      | USER  | Member removed from project |

### Task Operations

| Action                | Actor | Source           | Trigger                  |
| --------------------- | ----- | ---------------- | ------------------------ |
| `TASK_CREATED`        | USER  | USER             | Task creation            |
| `TASK_UPDATED`        | USER  | USER/AI_ASSISTED | Field change (with diff) |
| `TASK_STATUS_CHANGED` | USER  | USER/AI_ASSISTED | Status transition        |
| `TASK_ASSIGNED`       | USER  | USER/AI_ASSISTED | Assignee set             |
| `TASK_UNASSIGNED`     | USER  | USER             | Assignee removed         |
| `TASK_ARCHIVED`       | USER  | USER             | Task archived            |

### Collaboration

| Action            | Actor | Trigger                                 |
| ----------------- | ----- | --------------------------------------- |
| `COMMENT_CREATED` | USER  | Comment added (no message body logged)  |
| `COMMENT_UPDATED` | USER  | Comment edited (no message body logged) |
| `COMMENT_DELETED` | USER  | Comment deleted                         |

### AI Action Lifecycle

| Action               | Actor | Source      | Trigger                                      |
| -------------------- | ----- | ----------- | -------------------------------------------- |
| `AI_ACTION_PROPOSED` | AI    | AI          | AI analysis returns action proposals         |
| `AI_ACTION_APPLIED`  | USER  | AI_ASSISTED | Human approves and applies AI recommendation |
| `AI_ACTION_REJECTED` | USER  | AI_ASSISTED | Stale state detected (409)                   |

---

## Data Retention

The current implementation does not implement automated data retention or purging. Future
considerations for production deployments:

- **Retention Policy**: Compliance requirements may dictate minimum retention periods (e.g., 7 years for financial audit trails).
- **Partitioning**: Consider PostgreSQL table partitioning by `created_at` month for efficient archival.
- **Cold Storage**: Archive old audit events to object storage (S3/GCS) for cost-effective long-term retention.
- **Compliance Export**: Implement CSV/JSON export endpoints for compliance review workflows.

> [!NOTE]
> No external audit SaaS, message brokers, or additional databases (Kafka, Redis, Elasticsearch) are used.
> The PostgreSQL append-only model is the sole audit store, consistent with the project's architectural constraints.

---

## Files Changed in PR-25

| Layer        | File                                                                            | Change                                                                     |
| ------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| DB Schema    | `apps/api/prisma/schema.prisma`                                                 | Added `ActorType`, `AuditSource`, `AuditAction` enums + `AuditEvent` model |
| Migration    | `apps/api/prisma/migrations/20260904143000_add_audit_event_model/migration.sql` | DDL for `audit_events` table + indexes                                     |
| Shared Types | `packages/shared/src/types/audit.ts`                                            | TypeScript enums and interfaces                                            |
| Validation   | `packages/validation/src/audit.ts`                                              | `auditEventsQuerySchema` with bounded pagination                           |
| Repository   | `apps/api/src/repositories/audit.repository.ts`                                 | `create` and `findMany`                                                    |
| Repository   | `apps/api/src/repositories/project.repository.ts`                               | Added `findUserMemberships`                                                |
| Service      | `apps/api/src/services/audit.service.ts`                                        | `sanitizeMetadata`, `record`, `list` with RBAC                             |
| Controller   | `apps/api/src/controllers/audit.controller.ts`                                  | `getAuditEvents` handler                                                   |
| Routes       | `apps/api/src/routes/organization.routes.ts`                                    | Mounted GET audit-events endpoint                                          |
| Domain       | `apps/api/src/services/auth.service.ts`                                         | AUTH event instrumentation                                                 |
| Domain       | `apps/api/src/controllers/auth.controller.ts`                                   | AUTH event propagation                                                     |
| Domain       | `apps/api/src/services/user.service.ts`                                         | AUTH_PASSWORD_CHANGED                                                      |
| Domain       | `apps/api/src/services/task.service.ts`                                         | TASK_* and AI_ACTION_* events                                              |
| Domain       | `apps/api/src/services/ai.service.ts`                                           | AI_ACTION_PROPOSED                                                         |
| Domain       | `apps/api/src/services/organization.service.ts`                                 | ORGANIZATION_* events                                                      |
| Domain       | `apps/api/src/services/project.service.ts`                                      | PROJECT_* events                                                           |
| Domain       | `apps/api/src/services/comment.service.ts`                                      | COMMENT_* events                                                           |
| API Docs     | `apps/api/src/docs/openapi.ts`                                                  | Audit tag, schemas, endpoint                                               |
| Tests        | `apps/api/src/__tests__/openapi_docs.test.ts`                                   | Updated endpoint count assertions                                          |
| Tests        | `apps/api/src/__tests__/audit.test.ts`                                          | 27 dedicated audit unit tests                                              |
| Tests        | `apps/api/src/__tests__/ai_task_actions.test.ts`                                | Added `auditRepository` mock                                               |
| Tests        | `apps/api/src/__tests__/ai_evaluation_reliability.test.ts`                      | Added `auditRepository` mock                                               |
| Frontend     | `apps/web/src/lib/api.ts`                                                       | `auditApi.listAuditEvents`                                                 |
| Frontend     | `apps/web/src/components/settings/SettingsLayout.tsx`                           | `audit` tab with ShieldCheck icon                                          |
| Frontend     | `apps/web/src/components/settings/AuditLogSettings.tsx`                         | Full audit log UI                                                          |
| Docs         | `docs/architecture/auditability-security-events.md`                             | This document                                                              |
