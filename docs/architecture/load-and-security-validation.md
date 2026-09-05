# Load, Concurrency & Security Abuse Validation

## 1. Purpose

This document establishes the authoritative performance, load testing, concurrency race condition, and security boundary validation procedure for the TaskFlow platform (PR31). It defines how TaskFlow behaves under realistic concurrent loads, worker contention, adversarial inputs, and upstream failures without altering existing architectural invariants or introducing non-standard external infrastructure.

## 2. Scope

The validation framework spans:

- **Deterministic Load Harness (`scripts/load/`)**: Configurable concurrency, requests, timeouts, and 10 scenario suites reporting environment-specific metrics ($p_{50}, p_{90}, p_{95}, p_{99}$, throughput, error rates).
- **API Concurrency Validation (`apps/api/src/__tests__/pr31_concurrency_race.test.ts`)**: Entitlement limits, row-locked task issue-key generation, atomic AI quota reservation, worker mutual exclusion with `FOR UPDATE SKIP LOCKED`, audit attribution, and refresh-token reuse detection.
- **Database / Query Pressure (`apps/api/src/__tests__/pr31_query_pressure.test.ts`)**: Defensive query limits, safe pagination clamps, relation joins, and zero N+1 behavior across all high-volume read paths.
- **Worker Contention & Recovery (`apps/api/src/__tests__/pr31_worker_contention_recovery.test.ts`)**: Multi-worker job claiming, stale processing recovery, exponential backoff with bounded jitter, and graceful worker shutdown.
- **AI Load & Failure Validation (`apps/api/src/__tests__/pr31_ai_load_security.test.ts`)**: Mocked provider safety, atomic quota reservation, compensation on timeout/failures, process rate limiting, role/viewer restrictions, and advisory human-in-the-loop invariants.
- **Security Abuse Validation (`apps/api/src/__tests__/pr31_security_abuse.test.ts`)**: 20 malformed, cross-tenant, and adversarial test scenarios ensuring strict error sanitization with zero credential, connection string, or internal stack trace leakage.
- **AI Safety & Prompt-Injection Evals (`apps/ai/evals/`)**: Deterministic fixtures and evaluators verifying resistance against prompt overrides, fake admin commands, secret exfiltration, and unauthorized state mutation.

## 3. Architecture Under Test

TaskFlow operates under a strict, layered monolithic-service architecture:

```
React SPA
  → Node/Express Authoritative API (Auth, RBAC, Tenant Isolation, Domain Rules, Quotas, Audit, Jobs)
    → PostgreSQL / Prisma ORM (Row-level transactional locking, SKIP LOCKED job queues)
    → Cloudinary (Asset storage)
    → Socket.IO (Real-time events)
    → Internal Python/FastAPI AI Service (Pydantic validation, advisory AI recommendations)
      → OpenAI Provider (or Deterministic Mock Provider in test suites)
```

Node remains authoritative for all mutations, state transitions, security, and persistence. Python remains responsible solely for advisory AI processing. AI actions never directly mutate database state without explicit human review and application.

---

## 4. Local Validation Procedure

Local developer environments run lightweight smoke and deterministic race suites to catch regressions before commit:

```bash
# 1. Run deterministic load smoke test (5 concurrent workers, 25 requests)
npm run load:smoke

# 2. Run API concurrency validation suite
npm test --workspace=@taskflow/api -- pr31_concurrency_race.test.ts

# 3. Run query pressure & pagination clamping suite
npm test --workspace=@taskflow/api -- pr31_query_pressure.test.ts

# 4. Run worker contention & recovery suite
npm test --workspace=@taskflow/api -- pr31_worker_contention_recovery.test.ts

# 5. Run AI load, quota, and human-approval validation suite
npm test --workspace=@taskflow/api -- pr31_ai_load_security.test.ts

# 6. Run 20-scenario security abuse validation suite
npm test --workspace=@taskflow/api -- pr31_security_abuse.test.ts

# 7. Run Python AI evaluation & safety suite
& "apps\ai\.venv\Scripts\python.exe" -m pytest apps/ai
```

---

## 5. Container Validation Procedure

Containerized validation ensures that Docker images, multi-container networks, and container limits execute cleanly without resource starvation:

1. Spin up the staging compose environment:
   ```bash
   docker compose -f docker-compose.staging.yml up -d --build
   ```
2. Verify container health status:
   ```bash
   docker compose -f docker-compose.staging.yml ps
   ```
3. Run containerized smoke harness targeting the container gateway:
   ```bash
   npm run load:test -- --scenario health --target http://localhost:4000 --concurrency 10 --requests 100
   ```
4. Check worker logs for clean startup and zero database connection exhaustion:
   ```bash
   docker compose -f docker-compose.staging.yml logs worker
   ```

---

## 6. Staging Validation Procedure

Staging validation represents full pre-release verification in an environment mirroring production topology:

1. **Pre-flight Check**: Run automated migration scripts and verify Prisma schema synchronization.
2. **Readiness Verification**: Probe `/api/v1/health/ready` to ensure PostgreSQL connectivity and Python AI health.
3. **Scenario Execution**: Execute the load harness across all 10 core scenarios at realistic staging scale (e.g. concurrency 10-25, requests 200-500).
4. **Log Inspection**: Confirm that Sentry and server stdout capture zero unhandled exceptions, no credentials, and no raw SQL connection URIs.
5. **Teardown**: Ensure test organizations and synthetic load data are completely purged via automated cleanup scripts.

---

## 7. Load Scenarios

The deterministic load harness (`scripts/load/scenarios.ts`) provides 10 representative endpoint scenarios:

1. **`health`**: `GET /api/v1/health` — Basic liveness verification.
2. **`readiness`**: `GET /api/v1/health/ready` — Comprehensive database and Python service health checks.
3. **`projects`**: `GET /api/v1/organizations/:orgId/projects` — Authenticated project listing under bounded pagination.
4. **`tasks`**: `GET /api/v1/organizations/:orgId/projects/:projectId/tasks` — High-volume task listing with filter parameters.
5. **`search`**: `GET /api/v1/search?q=...` — Multi-entity cross-index search with strict 50-entity API bounds.
6. **`dashboard`**: `GET /api/v1/organizations/:orgId/projects/:projectId/dashboard` — Aggregated KPI metrics and chart telemetry.
7. **`notifications`**: `GET /api/v1/notifications` — Notification feed and unread status.
8. **`audit`**: `GET /api/v1/organizations/:orgId/audit-events` — Authoritative compliance audit event listing.
9. **`usage`**: `GET /api/v1/organizations/:orgId/usage` — Real-time metering and subscription capacity queries.
10. **`ai`**: `POST /api/v1/organizations/:orgId/projects/:projectId/ai/analyze` — AI intelligence requests (mocked provider, zero real OpenAI calls).

---

## 8. Concurrency Scenarios

Validated under high thread contention in `pr31_concurrency_race.test.ts`:

1. **Project creation at entitlement boundary**: 10 concurrent creation attempts against a plan permitting only 3 projects. Exactly 3 succeed; remaining 7 receive `ENTITLEMENT_LIMIT_REACHED`. Zero over-limit projects created.
2. **Task creation / updates**: Concurrent task updates with optimistic locking prevent dirty writes or corrupted states.
3. **Issue-key generation**: Concurrent task creation uses PostgreSQL row locks (`SELECT ... FOR UPDATE` on project sequence counter) to ensure monotonic, gapless, strictly unique issue keys (e.g. `PROJ-1`, `PROJ-2`). Zero duplicates.
4. **AI quota reservation**: Atomic reservation in PostgreSQL prevents concurrent bursts from exceeding monthly quotas. Downstream failures trigger atomic compensation without double-reversion.
5. **Audit events**: Concurrent audited mutations generate complete audit records with immutable actor and source attribution without cross-tenant leakage.
6. **Background job claims**: Multiple concurrent workers competing for pending jobs execute `SELECT ... FOR UPDATE SKIP LOCKED`. Each job is processed by exactly one worker.
7. **Refresh token rotation**: Concurrent refresh requests using the same refresh cookie trigger reuse detection; the token family is revoked to protect user security.

---

## 9. Security Abuse Scenarios

Validated across 20 adversarial scenarios in `pr31_security_abuse.test.ts`:

1. **Invalid JWT**: Returns 401 `UNAUTHORIZED`.
2. **Expired JWT**: Returns 401 `UNAUTHORIZED` with expired message.
3. **Malformed refresh token**: Returns 401 `UNAUTHORIZED`.
4. **Refresh token reuse**: Triggers token family revocation and returns 401.
5. **Cross-tenant project access**: Returns 403 or 404; zero data leakage.
6. **Cross-tenant task access**: Returns 403 `FORBIDDEN`.
7. **Cross-project task access**: Returns 404 `TASK_NOT_FOUND` even within the same organization.
8. **Unauthorized audit access**: Returns 403 for non-admin members.
9. **Unauthorized usage access**: Returns 403 for non-admin members.
10. **Unauthorized jobs access**: Returns 403 for non-admin members.
11. **Unauthorized AI access**: Blocks non-members and cross-tenant users with 403.
12. **VIEWER mutation attempts**: Prevents task creation/updates by viewers with 403 `INSUFFICIENT_PERMISSIONS`.
13. **Unauthorized assignee selection**: Rejects assignees not belonging to the project with 400 `ASSIGNEE_NOT_IN_PROJECT`.
14. **Stale AI action application**: Rejects stale mutations with 409 `STALE_TASK_STATE`.
15. **Prompt injection inside task text**: Stored as inert user string; never executed or evaluated as system instructions.
16. **Oversized request bodies**: Express body parser rejects payloads > 10MB with 413 `PAYLOAD_TOO_LARGE`.
17. **Invalid JSON**: Body parser syntax errors caught and returned as 400 `BAD_REQUEST`.
18. **Unexpected fields**: Strictly validated schemas reject unknown fields with 400 `VALIDATION_ERROR`.
19. **Invalid pagination**: Negative pages or non-integer limits rejected with 400.
20. **Invalid sorting / filters**: Invalid enum values or malformed timestamps rejected with 400.

---

## 10. AI Failure & Human-Approval Scenarios

- **Atomic Reservation**: Quota checked and reserved under row-lock prior to dispatching to the Python AI service.
- **Provider Timeout (504)**: When upstream model takes > 30s, quota reservation is immediately reverted.
- **Provider Failure / 500 / Python Unavailable**: Connection errors (`ECONNREFUSED`) or internal 500s trigger quota compensation.
- **Human-in-the-loop Invariant**: AI produces advisory proposals only. Database mutation requires:
  $$\text{AI Proposal} \rightarrow \text{Human Review} \rightarrow \text{Explicit Apply} \rightarrow \text{Standard PATCH} \rightarrow \text{State Check} \rightarrow \text{DB Mutation} \rightarrow \text{Audit Log}$$

---

## 11. Worker Contention & Contention Recovery

- **SKIP LOCKED Claiming**: Ensures workers do not collide or lock the entire queue table.
- **Retryable vs Non-Retryable**: Transient network timeouts reschedule with exponential backoff; unrecoverable syntax/payload errors fail immediately.
- **Stale Processing Recovery**: `recoverStaleJobs` identifies jobs stuck in `PROCESSING` past `processingTimeoutMs` (with `lockedAt < cutoff`) and safely returns them to `PENDING` if attempts remain.
- **Exponential Backoff & Jitter**: Formula:
  $$\text{Delay} = \min(\text{baseDelay} \times 2^{\text{attempts}-1}, \text{maxDelay}) + \text{jitter}$$
  Jitter is bounded to a maximum of 10% of capped delay to eliminate the thundering herd problem.
- **Graceful Shutdown**: Worker finishes any in-flight job up to `shutdownGracePeriodMs` before exiting.

---

## 12. Resource-Bound Matrix

| Area               | Existing / Target Bound                        | Validation Suite                                |
| ------------------ | ---------------------------------------------- | ----------------------------------------------- |
| **Projects list**  | Max 200 items per request                      | `pr31_query_pressure.test.ts` / Load            |
| **Tasks list**     | Max 500 items per request                      | `pr31_query_pressure.test.ts` / Load            |
| **Search query**   | Max 50 items (API) / 100 items (Service clamp) | `pr31_query_pressure.test.ts` / Load            |
| **Notifications**  | Max 100 items per query                        | `pr31_query_pressure.test.ts` / Load            |
| **Comments**       | Max 200 comments per task thread               | `pr31_query_pressure.test.ts`                   |
| **Audit events**   | Max 100 events per page                        | `pr31_query_pressure.test.ts`                   |
| **AI context**     | Max 50 tasks / 20 subtasks in context builder  | `aiContext.builder.ts` / Evals                  |
| **AI output**      | Max 12 subtasks, max 5 proposed actions        | `apps/ai/evals/test_eval_suite.py`              |
| **Job retries**    | Max 3–5 attempts with exponential backoff      | `pr31_worker_contention_recovery.test.ts`       |
| **AI timeout**     | 30 seconds upstream gateway timeout            | `aiClient.ts` / `pr31_ai_load_security.test.ts` |
| **Worker backoff** | Max 30,000ms delay + 10% random jitter         | `pr31_worker_contention_recovery.test.ts`       |
| **Request body**   | Max 10MB payload size limit                    | `pr31_security_abuse.test.ts`                   |

---

## 13. Interpreting Percentiles ($p_{50}, p_{90}, p_{95}, p_{99}$)

- **$p_{50}$ (Median)**: Represents standard steady-state user experience under typical conditions.
- **$p_{90} / p_{95}$**: Identifies latency experienced during micro-bursts, cold query plan caches, or connection pool contention.
- **$p_{99}$**: Highlights tail latency caused by complex table joins, lock contention, or garbage collection. Only statistically valid when sample size $N \ge 100$.

---

## 14. Error-Rate Interpretation

- In a resilient architecture, error rates under valid traffic must remain **0.00%**.
- Controlled 4xx responses (such as 400 validation, 401 unauthorized, 403 forbidden, 409 stale state, 413 payload too large, 429 rate limited) are expected and verified during security abuse testing.
- Any 5xx response under load indicates an unhandled exception or connection pool starvation and represents an immediate blocker.

---

## 15. Known Topology Limitations

> [!IMPORTANT]
> **Process-Local Rate Limiting**: Rate limiting in the current architecture is process-local unless/until shared distributed infrastructure is introduced. In a multi-replica deployment, each Node.js process tracks rate limits independently in memory.

---

## 16. What is NOT Being Claimed

- **No Universal Latency Guarantees**: We do not claim arbitrary universal figures such as "all requests must be $<100\text{ms}$" across all cloud providers and hardware topologies.
- **No Infinite Throughput**: Performance numbers reflect the specific test environment (hardware, local PostgreSQL instance, mock network latency) and do not represent a universal capacity contract.
- **No Production Certification from Local Tests**: Passing local unit, concurrency, or load tests does not certify production readiness without execution in true staging/production environments.

---

## 17. Production Validation Still Required

Prior to deploying to production, human operators must:

1. Validate database connection pool sizing (`DATABASE_POOL_MIN`, `DATABASE_POOL_MAX`) against target replica counts.
2. Verify PostgreSQL read replica configurations if read traffic exceeds primary capacity.
3. Validate Cloudinary and OpenAI live production credentials and network latency.
4. Perform end-to-end user acceptance testing across distributed networks.
