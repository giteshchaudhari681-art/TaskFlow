# Production Resilience & Background Jobs Subsystem

> PR-26 · Branch: `feat/pr-26-production-resilience-background-jobs`

## 1. Overview & Architectural Philosophy

TaskFlow incorporates a lightweight, durable, PostgreSQL-backed background job subsystem designed to decouple latency-sensitive HTTP request/response lifecycles from secondary side effects (such as notification delivery/fanout and event processing).

### Why PostgreSQL for Background Jobs?

Rather than introducing dedicated external distributed brokers (e.g., Redis with BullMQ, RabbitMQ, Kafka, or Temporal) into the stack at this stage, TaskFlow utilizes PostgreSQL as the authoritative job queue. This deliberate choice provides distinct operational advantages:

1. **Transactional Enqueue Atomicity (ACID)**: Domain entity mutations and background job enqueueing occur within the exact same database transaction (`BEGIN ... COMMIT`). If the domain transaction aborts, the job is automatically rolled back. This eliminates two-phase commit edge cases and dual-write inconsistencies.
2. **Single Authoritative Data Store**: No supplementary operational overhead, credential management, connection pooling, clustering, or backup infrastructure is required. PostgreSQL already hosts all authoritative relational data.
3. **Multi-Tenant Isolation**: Job records are natively partitioned by `organizationId`, enforcing foreign key constraints and strict relational boundaries consistent with the rest of the application.
4. **Resilience & Durability**: Jobs are persistent across process crashes and system restarts without risk of volatile in-memory loss.
5. **Simplicity & Monolithic Cohesion**: TaskFlow remains a cleanly decoupled, observable modular monolith without premature microservice fragmentation.

---

## 2. Job Model & State Machine

The Prisma `Job` model lives in `apps/api/prisma/schema.prisma` mapped to the `jobs` table.

### Model Schema

| Field              | Type             | Description                                                       |
| ------------------ | ---------------- | ----------------------------------------------------------------- |
| `id`               | `String (UUID)`  | Primary key identifier                                            |
| `type`             | `String`         | Registered job handler identifier (`NOTIFICATION_DELIVERY`, etc.) |
| `status`           | `JobStatus`      | Enum: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`              |
| `organizationId`   | `String? (UUID)` | Tenant boundary reference (foreign key to `organizations.id`)     |
| `payload`          | `Json`           | Bounded, sanitized job payload                                    |
| `idempotencyKey`   | `String?`        | Unique constraint to prevent duplicate enqueues                   |
| `attempts`         | `Int`            | Number of execution attempts completed                            |
| `maxAttempts`      | `Int`            | Upper threshold before permanent `FAILED` state (default: 3)      |
| `availableAt`      | `DateTime`       | Earliest timestamp at which worker may claim the job              |
| `startedAt`        | `DateTime?`      | Timestamp when current processing attempt began                   |
| `completedAt`      | `DateTime?`      | Timestamp when job completed successfully                         |
| `failedAt`         | `DateTime?`      | Timestamp when job failed permanently                             |
| `lastErrorCode`    | `String?`        | Machine-readable error classification                             |
| `lastErrorMessage` | `String?`        | Truncated, sanitized diagnostic error message                     |
| `lockedAt`         | `DateTime?`      | Lease timestamp set when worker claims job                        |
| `createdAt`        | `DateTime`       | Creation timestamp (`@default(now())`)                            |
| `updatedAt`        | `DateTime`       | Last update timestamp (`@updatedAt`)                              |

### Specialized Polling & Query Indexes

The `jobs` table maintains tightly-bounded compound indexes:

- `@@index([status, availableAt])`: Enables fast index-only scans for pending jobs eligible for execution.
- `@@index([status, lockedAt])`: Powers stale-job recovery sweeps without table scans.
- `@@index([organizationId, createdAt])`: Accelerates tenant-scoped operational reporting and admin audits.
- `@@unique([idempotencyKey])`: Durably enforces idempotency across worker processes and restarts.

### Job State Lifecycle

```
       [ Enqueue ]
            │
            ▼
     ┌─────────────┐
     │   PENDING   │ ◄───────────────────────────┐
     └──────┬──────┘                             │
            │ claimNextJob()                     │
            │ (FOR UPDATE SKIP LOCKED)           │
            ▼                                    │
     ┌─────────────┐                             │
     │ PROCESSING  │                             │
     └──────┬──────┘                             │
            │                                    │
    ┌───────┴────────────────────────┐           │
    │ Handler Result                 │           │
    ▼                                ▼           │
[Success]                      [Exception]       │
    │                                │           │
    │                         Retryable? &       │
    │                         attempts < max?    │
    │                                │           │
    │                       Yes ─────┼───────────┘
    │                                │ (exponential backoff + jitter)
    │                               No
    ▼                                ▼
┌───────────┐                  ┌───────────┐
│ COMPLETED │                  │  FAILED   │
└───────────┘                  └───────────┘
```

---

## 3. Concurrency Safety: Atomic Claiming with `SKIP LOCKED`

To prevent concurrent worker collisions where multiple worker processes claim the identical job, `jobRepository.claimNextJob()` executes an atomic PostgreSQL Common Table Expression (CTE) utilizing `FOR UPDATE SKIP LOCKED`:

```sql
WITH next_job AS (
  SELECT id
  FROM jobs
  WHERE status = 'PENDING'
    AND "availableAt" <= NOW()
  ORDER BY "availableAt" ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
UPDATE jobs j
SET
  status = 'PROCESSING',
  "startedAt" = NOW(),
  "lockedAt" = NOW(),
  "updatedAt" = NOW()
FROM next_job
WHERE j.id = next_job.id
RETURNING j.*;
```

### Safety Guarantees:

- **Lock Elision**: If Worker A is evaluating row #1, Worker B immediately skips row #1 without waiting or blocking, claiming row #2.
- **Atomicity**: The lock acquisition and transition from `PENDING` to `PROCESSING` with `lockedAt` lease occurs in a single atomic SQL command. No window exists where another process can observe an unleased pending job.

---

## 4. Retry Policy & Failure Classification

Failures are strictly categorized into retryable and non-retryable errors using explicit error subclasses:

### Error Classification Hierarchy

1. **`RetryableJobError`**:
   - Transient network issues (e.g., connection reset, DNS timeout)
   - Temporary database connectivity blips
   - Downstream 5xx service errors
   - Action: Status returns to `PENDING`, `attempts` increments, and `availableAt` is pushed back according to bounded exponential backoff.

2. **`NonRetryableJobError`**:
   - Malformed payload or validation schema failure
   - Referenced resource not found (permanent 404)
   - Tenant boundary mismatch / unauthorized access attempt
   - Action: Job immediately transitions to `FAILED` with `failedAt` set. Zero further retry attempts are wasted.

3. **Unhandled Generic Exceptions**:
   - Treated as potentially retryable up to `maxAttempts`, then transitioned to `FAILED`.

### Exponential Backoff with Jitter

Retry delay is calculated using the bounded exponential backoff formula:

$$\text{delay} = \min\left(\text{maxDelay},\, \text{baseDelay} \times 2^{\text{attempt} - 1} + \text{jitter}\right)$$

- Default Base Delay: $1,000\text{ ms}$
- Default Max Delay: $300,000\text{ ms}$ (5 minutes)
- Jitter: Small pseudo-random offset ($0\text{--}300\text{ ms}$) to prevent herd thundering.

---

## 5. Idempotency Mechanisms

Background jobs are designed under an **at-least-once** delivery contract. Idempotency is enforced on two levels:

1. **Durable Ingress Deduplication**:
   The `idempotencyKey` column has a unique database constraint. If an enqueue call supplies an existing key (e.g., `notif-delivery:<notifId>`), PostgreSQL returns the existing row rather than inserting a duplicate.
2. **Handler-Level Idempotency**:
   Handlers check authoritative database state before performing side effects. For example, `notificationDeliveryHandler` verifies if the notification exists and if secondary delivery metadata is already marked, safely skipping duplicate external transmissions.

---

## 6. Stale Job Recovery

If a worker node crashes abruptly or suffers an unhandled process termination (`kill -9`, hardware reboot, out-of-memory kill), jobs currently in `PROCESSING` status could remain orphaned indefinitely.

The `JobWorker` runs a periodic stale-job recovery sweep:

- Looks for jobs where `status = 'PROCESSING'` and `lockedAt < NOW() - WORKER_PROCESSING_TIMEOUT_MS` (default: 5 minutes).
- Atomically resets status to `PENDING`, clears `lockedAt`, increments `attempts`, and assigns `lastErrorCode = 'STALE_JOB_TIMEOUT'`.
- If a job exceeds `maxAttempts` during stale recovery, it transitions directly to `FAILED`.

---

## 7. Tenant Isolation & Payload Security Rules

### Tenant Isolation

Jobs are scoped to an `organizationId`. A worker executing a job validates resource ownership before executing any mutation:

- If a job contains `organizationId = Org_A` but references a resource belonging to `Org_B`, the handler immediately throws `NonRetryableJobError('Tenant boundary violation', 'TENANT_MISMATCH')`.
- The job is marked `FAILED` and logged to Sentry.

### Payload Minimization & Secret Prohibition

Job payloads must be compact and immutable.

- **Allowed**: Resource IDs (`organizationId`, `projectId`, `taskId`, `notificationId`), delivery channels, boolean flags.
- **Prohibited**: Passwords, JWTs, refresh tokens, cookies, Authorization headers, API keys, service tokens, entire HTTP request bodies, or full user/task entities.
- Payload validation schemas in `@taskflow/validation` reject forbidden credential keys at runtime.

---

## 8. Worker Architecture & Graceful Shutdown

### Process Model

The worker runs as an independent Node process (`apps/api/src/worker.ts`), decoupling background task processing from the HTTP API server:

- Local dev: `npm run dev:worker` or `npm run worker`
- Docker: Dedicated `taskflow-worker` container sharing the API image, executed under non-root user `node`.

### Graceful Shutdown Sequence

When receiving `SIGTERM` or `SIGINT`:

1. `worker.stop()` is invoked.
2. The worker transitions `acceptingJobs = false` and clears the polling timer.
3. Any in-flight job is permitted to complete within `WORKER_SHUTDOWN_GRACE_PERIOD_MS` (default: 10,000 ms).
4. Database connections are closed cleanly via `prisma.$disconnect()`.
5. Process exits with code 0.

If an in-flight job does not complete within the grace period, the process forces termination; the job's lease will expire and be safely reclaimed by the stale recovery sweep.

---

## 9. Observability & Administrative Health API

### Sentry Error Tracking

Worker failures report to Sentry with strict context sanitization:

- Captures: `jobId`, `jobType`, `organizationId`, `attempts`, `errorClassification`.
- Redacts: Job payloads, credentials, user inputs, and database connection strings.

### Operational Summary Endpoint

Authorized organization administrators can monitor job subsystem health:

- **Endpoint**: `GET /api/v1/organizations/:organizationId/jobs/summary`
- **RBAC**: Requires Organization `OWNER` or `ADMIN`. Regular `MEMBER` accounts receive `403 FORBIDDEN`.
- **Response Shape**:

```json
{
  "success": true,
  "data": {
    "organizationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "counts": {
      "pending": 2,
      "processing": 1,
      "completed": 128,
      "failed": 0
    },
    "oldestPendingAt": "2026-09-04T11:00:00.000Z",
    "recentFailedCount": 0
  }
}
```

---

## 10. Intentional Non-Introduction of Redis / Kafka

This PR explicitly does **not** introduce Redis, BullMQ, Kafka, or RabbitMQ:

- Current throughput requirements are well within PostgreSQL's indexed concurrency envelope.
- Eliminates dual-write failure modes between the primary database and a message broker.
- Keeps local development zero-friction without additional daemon dependencies.
- Retains single-source-of-truth ACID guarantees for audit and transactional integrity.
