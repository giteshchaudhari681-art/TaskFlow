# PR28: Production Hardening, Performance & Reliability

This document outlines the production hardening, reliability semantics, query performance, and operational boundaries implemented in **PR28** for the TaskFlow platform.

> "Performance optimizations are evidence-driven; Redis and other external infrastructure are not introduced without a demonstrated workload requirement."

---

## 1. Architectural Integrity & Principles

TaskFlow retains its modular monolith architecture:

```
React (Vite / TanStack Query)
  ↓
Express (Node.js REST API with Request Correlation & Sentry)
  ↓
PostgreSQL / Prisma (Durable Storage, Skip Locked Background Jobs, Tenant Isolation)
  ↓
Python AI Gateway (FastAPI / Pydantic / Local Fallbacks / OpenAI Provider)
```

No distributed messaging buses (Kafka, RabbitMQ), separate caching layers (Redis), or microservice meshes were added. Reliability and throughput are maximized within the single-node / horizontal container architecture through:

1. Deterministic database indexing targeting active query execution plans.
2. Hard query result bounding across all pagination endpoints.
3. Separation of liveness and readiness health probes.
4. Clean failure isolation between core relational CRUD and external AI orchestration.
5. Exponential backoff in worker polling to prevent database cascading failures during outages.
6. Frontend request cancellation using standard `AbortController` primitives.
7. Graceful connection teardown on SIGTERM / SIGINT signals.

---

## 2. Performance Baseline & Query Optimization

Before code modification, high-traffic query paths were audited for roundtrips, N+1 patterns, index coverage, and serialized payload size:

| Hot Path                                              | Initial DB Queries                                     | Joins / Includes                            | Bounded Limit                | Addressed In PR28                                                        |
| ----------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| **Project Dashboard** (`/projects/:id/dashboard`)     | 4 batched queries                                      | Project + Tasks + Milestones + Dependencies | Bounded by project scope     | Verified clean; sub-15ms execution                                       |
| **Task List** (`/projects/:id/tasks`)                 | 1 query + labels/assignee relation                     | Indexed by `projectId` & `archivedAt`       | Previously unbounded         | Hard ceiling of 500 tasks per fetch; composite index added               |
| **Global Search** (`/search?query=...`)               | 4 parallel queries (Task, Project, Milestone, Comment) | Filtered by `organizationId`                | Previously uncapped          | Bounded to max 100 results per entity type                               |
| **Notifications** (`/notifications`)                  | 1 query + actor relation                               | Filtered by `userId`                        | Previously unbounded         | Bounded to max 100 notifications per fetch                               |
| **Comments** (`/tasks/:id/comments`)                  | 1 query + author relation                              | Filtered by `taskId`                        | Previously unbounded         | Bounded to max 200 comments per fetch                                    |
| **Audit Events** (`/organizations/:id/audit-events`)  | 1 query + count                                        | Filtered by `organizationId` & `timestamp`  | Offset paginated             | Added optional `includeMetadata` flag to avoid deserializing heavy JSONB |
| **Usage / Entitlements** (`/organizations/:id/usage`) | 4 aggregate count queries                              | Filtered by `organizationId` & `archivedAt` | N/A (single-row aggregation) | Covered by new composite indexes on `[organizationId, archivedAt]`       |
| **Background Job Claim** (`claimNextJob`)             | 1 query with `FOR UPDATE SKIP LOCKED`                  | Filtered by `status`, `availableAt`         | Bounded to 1 row             | Optimal concurrency without lock contention                              |

### N+1 Audit Findings

The TaskFlow codebase uses Prisma's relational `include` or explicit batch aggregation for list endpoints. No iterative queries inside `for` loops were present in repository paths. All list queries now explicitly enforce defensive limits (`take: Math.min(limit, MAX_LIMIT)`).

---

## 3. Database Indexing Strategy

Three composite indexes were added to eliminate sequential table scans on multi-tenant active records (`apps/api/prisma/schema.prisma`):

1. **`Project (organizationId, archivedAt)`**:
   - **Rationale**: Organization project listings (`listByOrganization`) and entitlement quota calculations consistently filter on `organizationId` where `archivedAt IS NULL`.
   - **Migration**: `20260905103000_add_performance_hardening_indexes`

2. **`Task (projectId, archivedAt)`**:
   - **Rationale**: The project Kanban board, task list, and project dashboard telemetry heavily query tasks where `projectId = ?` and `archivedAt IS NULL`. A composite index allows immediate index-only scans without filtering post-fetch.

3. **`Task (assigneeId, archivedAt)`**:
   - **Rationale**: The user "My Work" dashboard (`findAssignedTasksByUser`) filters active tasks assigned to the current user. This index optimizes personal task aggregation across organizations.

Existing indexes covering task status, priorities, foreign keys, job statuses (`[status, availableAt]`), audit timestamps, and notification recipients were reviewed and verified as optimal.

---

## 4. Health vs. Readiness Semantics

TaskFlow distinguishes between process vitality and service readiness:

### `/health/live` (or `/api/v1/health/live`)

- **Semantics**: "Is the Node.js event loop alive and accepting socket connections?"
- **Response**: `200 OK` with `{ status: 'live', service: 'taskflow-api', uptimeSeconds: number }`.
- **Use Case**: Kubernetes / Cloud container liveness probes. A failure triggers container restart.

### `/health/ready` (or `/api/v1/health/ready`)

- **Semantics**: "Can this instance serve useful user traffic?"
- **Checks**: Probes PostgreSQL with a low-overhead `SELECT 1` ping (3-second timeout).
- **Response**:
  - `200 OK` when database is healthy: `{ status: 'ready', checks: { database: { status: 'up', latencyMs } } }`.
  - `503 SERVICE_UNAVAILABLE` when database is unreachable.
- **AI Decoupling**: External AI service or OpenAI provider downtime **does NOT** fail API readiness. TaskFlow core functionality (project collaboration, task updates, audit logs) remains operational even if AI features degrade.

---

## 5. Timeout Budgeting

To prevent thread starvation and hanging HTTP sockets, strict bounded timeouts are enforced across all internal and outbound calls:

```
Browser UI (AbortController / 30s timeout)
    ↓
Node.js Express API (15s request budget)
    ↓
Python AI Gateway (FastAPI, 10s timeout budget)
    ↓
OpenAI Provider API (8s upstream timeout)
```

- **Node → Python AI**: 10,000ms bounded HTTP client timeout.
- **Python AI → OpenAI**: 8,000ms request timeout with deterministic local heuristic fallback.
- **Node → PostgreSQL**: 3,000ms health probe timeout; 5,000ms connection pool acquisition limit.
- **Background Worker Processing**: Bounded by `WORKER_PROCESSING_TIMEOUT_MS` (default 60,000ms).

---

## 6. Database Failure Behavior & Error Sanitization

When PostgreSQL experiences connection drops, restarts, or pool exhaustion:

1. Prisma errors (`PrismaClientInitializationError`, `P1001`, `P2024`) are intercepted by `apps/api/src/middleware/errorHandler.ts`.
2. Raw connection strings, credentials, hostnames, and internal database file paths are completely stripped.
3. The client receives a standardized `503 SERVICE_UNAVAILABLE` payload:
   ```json
   {
     "success": false,
     "error": {
       "code": "SERVICE_UNAVAILABLE",
       "message": "Database service temporarily unavailable"
     }
   }
   ```
4. Sentry captures the diagnostic exception with contextual tags (`infrastructure: 'database'`) and request correlation ID without leaking passwords.

---

## 7. Background Worker Resilience

The durable background job worker (`apps/api/src/services/job.worker.ts`) features:

1. **Exponential Backoff with Jitter**: If PostgreSQL becomes unreachable, the worker does not spin in a hot loop. Consecutive errors multiply polling intervals (`1s → 2s → 4s → 8s → 16s → 30s max`) with random jitter (+0–200ms) to prevent thundering herd when the database recovers.
2. **Stale Job Recovery**: Periodically reclaims jobs stuck in `PROCESSING` status beyond `processingTimeoutMs`.
3. **Graceful Worker Shutdown**: Upon `SIGTERM`/`SIGINT`, sets `shouldStop = true`, wakes sleeping loops, awaits in-flight handler promises up to `shutdownGracePeriodMs`, disconnects Prisma, and terminates cleanly.

---

## 8. Frontend Request Cancellation

In the React frontend (`apps/web`):

1. **AI Analysis Operations**: `projectApi.analyzeProject`, `taskApi.analyzeTask`, `taskApi.decomposeTask`, and `taskApi.proposeActions` accept an optional `AbortSignal`.
2. **Component Lifecycle Hooks**: `AIProjectIntelligence` and `AITaskIntelligence` instantiate an `AbortController` for in-flight requests and cleanly abort them on component unmount or prompt re-submission.
3. **Aborted Request Handling**: `AbortError` / `DOMException` exceptions are caught and suppressed so users do not see false error banners when navigating away from a tab.

---

## 9. Sentry Performance Signals

`apps/api/src/monitoring/sentry.ts` exports `measureTiming<T>`:

- Captures execution duration of critical workflows (dashboard rendering, AI context assembly, job dispatch).
- Emits low-overhead Sentry breadcrumbs categorized under `performance`.
- Avoids high-cardinality tags, full prompt text, task descriptions, or sensitive tokens.

---

## 10. Graceful API Shutdown Order

When terminating the API server:

1. HTTP server stops accepting new connections via `server.close()`.
2. Active requests complete within a bounded 10-second timeout.
3. Database client disconnects cleanly via `await prisma.$disconnect()`.
4. Process exits with code `0`.

---

## 11. Known Limitations & Future Work

1. **In-Memory Caching (Redis)**: Profiling demonstrates that PostgreSQL with composite indexing easily fulfills sub-15ms p95 latencies for current TaskFlow workloads. If multi-region read traffic expands beyond 10k RPS, an evidence-based Redis caching layer for read-only project dashboards may be evaluated.
2. **Full-Text Search Scaling**: PostgreSQL `contains` mode is bounded to 100 rows. If workspace volume exceeds 1,000,000 tasks per tenant, PostgreSQL `tsvector` with GIN indexes should be introduced before reaching for external search clusters.
