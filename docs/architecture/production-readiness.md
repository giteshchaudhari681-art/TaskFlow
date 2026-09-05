# Production Readiness, Security Validation & Release Engineering

This document provides the operational, architectural, and security specification for the TaskFlow platform release readiness as established in **PR29**.

All operational assertions herein are based on validated test suites, deterministic concurrency harnesses, and reproducible verification tooling.

---

## 1. Production Architecture

TaskFlow is engineered as a hardened modular monolith with an internal, specialized Python AI subsystem:

```
┌──────────────────────────────────────────────────────────────┐
│                    Web Client (React / Vite)                 │
│              TanStack Query / React Router / Axios           │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTPS / JSON REST / WSS
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                  Core API (Node.js / Express)                │
│    - Multi-tenant boundary & RBAC authorization              │
│    - Rate limiting & request validation (Zod)                │
│    - Sentry telemetry with secret scrubbing                  │
│    - In-flight request draining on SIGTERM (10s budget)      │
│    - Durable background job worker (SKIP LOCKED + backoff)   │
└──────────────┬───────────────────────────────┬───────────────┘
               │                               │
    Prisma ORM │ SQL                           │ HTTP / Private Network
   (FOR UPDATE)│                               │ X-TaskFlow-Service-Token
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│          PostgreSQL          │ │      Python AI Gateway      │
│  - Authoritative data store  │ │      (FastAPI / Pydantic)   │
│  - Multi-tenant data rows    │ │  - OpenAI Async Client      │
│  - Durable job queue         │ │  - Deterministic fallbacks  │
│  - Audit log append store    │ │  - Internal-only binding    │
└──────────────────────────────┘ └──────────────┬──────────────┘
                                                │ HTTPS
                                                ▼
                                 ┌─────────────────────────────┐
                                 │       OpenAI API (Cloud)    │
                                 └─────────────────────────────┘
```

### Invariants:

1. **Authoritative Boundary**: Express is the sole authority for tenant isolation, authentication, authorization, database writes, and entitlement enforcement.
2. **AI Isolation**: The Python AI service does not access the database, does not authenticate users directly, and is not exposed to the public Internet. The browser never communicates directly with the Python service.
3. **Infrastructure Boundary**: No Redis, Kafka, Kubernetes, Elasticsearch, or external message broker is introduced. High throughput and concurrency safety are achieved via PostgreSQL transactional primitives (`FOR UPDATE`, `FOR UPDATE SKIP LOCKED`).

---

## 2. Runtime Dependencies

| Component         | Technology                 | Version       | Purpose                                                          |
| :---------------- | :------------------------- | :------------ | :--------------------------------------------------------------- |
| **Frontend Host** | Nginx / Static CDN / Node  | Node 20+      | Serves compiled static Vite bundle                               |
| **Core API**      | Node.js / Express          | Node 20+      | REST API, WebSockets, business domain logic                      |
| **Database**      | PostgreSQL                 | 16+           | Authoritative multi-tenant relational persistence & job queue    |
| **AI Gateway**    | Python / FastAPI / Uvicorn | Python 3.13   | Specialized text decomposition, risk analysis, task breakdown    |
| **External AI**   | OpenAI API                 | `gpt-4o-mini` | LLM inference (with automatic fallback on timeout/failure)       |
| **Telemetry**     | Sentry                     | SDK v8+       | Distributed tracing and error capture for React, Express, Python |
| **File Storage**  | Cloudinary                 | v2 API        | Optional attachment storage (gracefully omitted if unconfigured) |

---

## 3. Required Environment Variables

Production deployments fail fast at startup if required secrets or configurations are absent or set to development fallbacks.

### Core API (`apps/api`)

- `NODE_ENV`: Must be `"production"`.
- `PORT`: HTTP port (defaults to `4000`).
- `DATABASE_URL`: Valid PostgreSQL connection string (must not match default dev credentials).
- `JWT_SECRET`: Minimum 32 characters; rejected if matching dev default.
- `JWT_EXPIRES_IN`: Access token lifetime (default `"15m"`).
- `COOKIE_SECRET`: Minimum 32 characters; rejected if matching dev default.
- `CORS_ORIGIN`: Fully qualified URL(s) (e.g. `https://app.taskflow.com`). **Wildcards (`*`) are strictly rejected in production.**
- `AI_SERVICE_URL`: Internal URL of Python service (e.g. `http://ai:8000`).
- `AI_SERVICE_TOKEN`: Minimum 16 characters; rejected if matching dev default.
- `SENTRY_DSN`: Optional; Sentry project ingestion key.
- `RATE_LIMIT_MAX_REQUESTS`: General rate limit per IP per 15m (default `100`).

### AI Gateway (`apps/ai`)

- `APP_ENV`: Must be `"production"`.
- `AI_SERVICE_TOKEN`: Minimum 16 characters; rejected if matching dev default.
- `OPENAI_API_KEY`: OpenAI API key.
- `SENTRY_DSN`: Optional; Sentry project ingestion key.
- `PORT`: HTTP port (defaults to `8000`).

### Web Client (`apps/web`)

- `VITE_API_URL`: Public API URL (e.g. `https://api.taskflow.com/api/v1`).
- `VITE_SENTRY_DSN`: Optional Sentry DSN for frontend telemetry.

---

## 4. Secrets Management Expectations

1. **Injection Mechanism**: In production, secrets must be injected as environment variables via container orchestrators (e.g., Docker secrets, AWS Systems Manager Parameter Store, HashiCorp Vault, or Kubernetes Secret equivalents). No `.env` files should be baked into container images.
2. **Fail-Fast Validation**:
   - `apps/api/src/config/env.ts` enforces `superRefine()` rules when `NODE_ENV === 'production'`.
   - `apps/ai/app/config.py` enforces `validate_production()` on Pydantic settings.
3. **No Credential Exposure**:
   - API error responses never expose stack traces or database URLs.
   - Sentry scrubbers strip OpenAI API keys, database credentials, Bearer tokens, and session cookies prior to event serialization.
   - Validation failures log descriptive key errors without printing the raw secret values.

---

## 5. Health vs. Readiness Semantics

TaskFlow exposes decoupled health and readiness probes in `apps/api/src/routes/health.routes.ts`:

### `/health/live` (Process Vitality)

- **Status Code**: `200 OK`.
- **Purpose**: Checks if the Node.js process is active, event loop is unblocked, and accepting HTTP sockets.
- **Action on Failure**: Container restart.

### `/health/ready` (Service Readiness)

- **Status Code**: `200 OK` (healthy) or `503 SERVICE_UNAVAILABLE` (unhealthy).
- **Checks**: Executes a low-overhead `SELECT 1` ping against PostgreSQL with a 3-second timeout budget.
- **Decoupling Guarantee**: The availability of OpenAI or the internal Python AI service **does not affect API readiness**. If the AI subsystem is down, `/health/ready` continues to return `200 OK` so project management, task tracking, and audit operations continue uninterrupted.

---

## 6. Database Migration Strategy

PostgreSQL holds the authoritative system state. Application code must never attempt to dynamically mutate schema at runtime.

### Migration Lifecycle

1. **Schema Authority**: `apps/api/prisma/schema.prisma` is the source of truth.
2. **Pre-Deployment Execution**: Migrations are applied in deployment order using `npx prisma migrate deploy` in a dedicated migration container or CI/CD deployment step prior to serving traffic with new API containers.
3. **Forward-Compatibility (Expand & Contract)**:
   - Migrations in production must be additive (adding columns with default values or nullable types, adding indexes).
   - Column deletions or renames must follow a two-stage release: Stage 1 (deprecate & stop writing), Stage 2 (drop column in subsequent release).
   - Destructive operations (`DROP TABLE`, `DROP COLUMN`) require explicit operational review and pre-migration snapshots.

---

## 7. PostgreSQL Backup Strategy

PostgreSQL backups must be taken independently of the application runtime.

### Backup Specifications

1. **Logical Backups**:
   - Automated logical dump using PostgreSQL standard tooling:
     ```bash
     pg_dump -Fc -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "/backups/taskflow_$(date +%Y%m%d_%H%M%S).dump"
     ```
   - Run on a daily automated schedule.
2. **Pre-Deployment Snapshots**:
   - A full backup must be taken immediately before running any database migration during release operations.
3. **Retention Policy**:
   - 7 days of daily snapshots, 4 weeks of weekly snapshots. Backups must be copied to encrypted, durable object storage (e.g. S3 with versioning).

---

## 8. PostgreSQL Restore Strategy & Runbook

### Restore Procedure

1. **Drain Application Traffic**: Stop or pause API containers to prevent concurrent writes.
2. **Execute Database Restore**:
   ```bash
   # Terminate active connections
   psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'taskflow' AND pid <> pg_backend_pid();"

   # Restore schema and data
   pg_restore --clean --if-exists -h "$DB_HOST" -U "$DB_USER" -d taskflow "/backups/taskflow_target.dump"
   ```
3. **Verification Steps**:
   - Verify migration status: `npx prisma migrate status` reports up-to-date.
   - Verify table counts and referential integrity (Users, Organizations, Projects, Tasks).
   - Probe API readiness: `curl -f http://localhost:4000/health/ready`.
4. **Resume Traffic**: Bring API instances back into active routing pools.

---

## 9. Deployment Order

Production releases must follow this deterministic deployment sequence:

```
[1. PostgreSQL Available]
         ↓
[2. Run Schema Migrations: prisma migrate deploy]
         ↓
[3. Start Python AI Service] ──► (Verify internal health /ready)
         ↓
[4. Start Core API Service]  ──► (Verify /health/live and /health/ready)
         ↓
[5. Start Background Job Worker]
         ↓
[6. Route Production Traffic / Serve Frontend Assets]
```

Traffic must not be routed to API instances until the `/health/ready` check returns `200 OK`.

---

## 10. Rollback Strategy

Application rollback and database rollback are fundamentally distinct operations:

1. **Application Rollback**:
   - Reverting container images to a previous release tag is instantaneous and safe if database migrations followed backward-compatibility principles.
2. **Database Rollback**:
   - Rolling back a database schema after new application code has processed transactions cannot be accomplished by a simple command without risking data loss for transactions created in the interim.
   - If a deployment fails during the migration phase, the pre-deployment snapshot is restored prior to restarting older API containers.
   - If a rollback occurs post-migration, older API containers continue running against the migrated database provided the migration was non-breaking (additive).

---

## 11. Worker Behavior During Database Outages

The background job worker (`apps/api/src/services/job.worker.ts`) processes durable PostgreSQL-backed tasks using `SELECT ... FOR UPDATE SKIP LOCKED`.

### Failure Semantics

1. **Exponential Backoff with Jitter**:
   - When database connectivity fails during polling, the worker catches the error, logs a sanitized message, and backs off exponentially (starting at 1 second, doubling up to a maximum cap of 30 seconds, with randomized jitter).
   - This prevents connection thundering herds from overwhelming PostgreSQL as it recovers.
2. **Automatic Recovery**:
   - Upon the first successful polling iteration after a database outage, the backoff interval is immediately reset to the base polling interval.
3. **Stale Job Recovery**:
   - If a worker process crashes mid-execution, jobs stuck in `PROCESSING` past their timeout threshold are safely returned to `PENDING` during subsequent recovery cycles.

---

## 12. AI Outage Behavior & Provider Isolation

TaskFlow core functionality is decoupled from external AI availability:

1. **Error Isolation**:
   - If OpenAI is down, experiencing high latency, or rate limiting, the internal Python AI service catches the exception and returns an upstream failure.
   - The Express API catches AI gateway errors and maps them to a sanitized `503 SERVICE_UNAVAILABLE` with `{ error: { code: 'AI_SERVICE_UNAVAILABLE', message: '...' } }`.
2. **Core Feature Preservation**:
   - Project Kanban boards, task CRUD, assignment changes, comments, and audit log generation remain 100% functional during AI outages.
3. **Frontend Degradation**:
   - The UI catches AI errors and displays a non-blocking notification toast without breaking active views or losing unsaved form inputs.

---

## 13. API Outage Behavior & Graceful Shutdown

1. **In-Flight Request Draining**:
   - On receiving `SIGTERM` or `SIGINT`, the Express server stops accepting new connections and enters a graceful shutdown state with a bounded 10-second timeout budget.
   - In-flight HTTP requests and Socket.IO events are permitted to finish before sockets are terminated.
2. **Resource Teardown**:
   - The background worker polling loop is stopped.
   - The Prisma client disconnects cleanly from PostgreSQL.
3. **Client-Side Resilience**:
   - React components using TanStack Query implement bounded retries for idempotent `GET` requests and display structured error banners if the API is momentarily unreachable.

---

## 14. Sentry Observability & Redaction

Telemetry is implemented across React, Express, and Python with strict privacy boundaries:

1. **Correlation**:
   - `X-Request-Id` is generated or received at the Express boundary and propagated downstream to the Python AI service via HTTP headers and attached to Sentry transaction tags.
2. **Error Classification**:
   - Standard client errors (401, 403, 404, 422) are excluded from Sentry exception alerts.
   - Unhandled 500 server errors, database infrastructure failures, and unexpected external API crashes trigger Sentry alerts.
3. **Data Scrubbing**:
   - `apps/api/src/monitoring/sentry.ts` and `apps/ai/app/monitoring.py` scrub sensitive patterns from event breadcrumbs, exception messages, and payload bodies:
     - Bearer tokens: `Bearer [REDACTED]`
     - OpenAI API keys: `sk-[REDACTED]`
     - Database connection URLs: `postgresql://[REDACTED]@[REDACTED]`
     - Session cookies: `refreshToken=[REDACTED]`
     - Passwords and secret parameters are recursively redacted.

---

## 15. Security Boundaries

1. **Authentication**:
   - Short-lived signed JWT access tokens (15-minute validity).
   - Cryptographically random, opaque refresh tokens stored in HTTP-only, `SameSite=Strict`, `Secure` cookies.
   - Refresh token hashes stored in PostgreSQL with family-based reuse detection. Token rotation executes inside a `SELECT ... FOR UPDATE` transaction.
2. **Password Security**:
   - Salted and hashed using `bcrypt` (cost factor 10). Passwords are never logged or returned in user profiles.
3. **Internal AI Boundary**:
   - The Python AI service rejects any request lacking a valid `X-TaskFlow-Service-Token` header with `403 Forbidden`.

---

## 16. Multi-Tenant Isolation

1. **Row-Level Organization Scoping**:
   - All tenant-owned data models (`Project`, `Task`, `Comment`, `Milestone`, `AuditLog`, `UsageRecord`) are strictly scoped by `organizationId`.
2. **Cross-Tenant Prevention**:
   - Repository lookups verify both entity ID and tenant organization ID. Access attempts across tenant boundaries return `403 CROSS_TENANT_FORBIDDEN` or `404 NOT_FOUND`.
3. **Role-Based Access Control (RBAC)**:
   - Organization roles (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) are verified before mutations.
   - Users with the `VIEWER` role cannot create, edit, or delete projects or tasks (`403 INSUFFICIENT_PERMISSIONS`).

---

## 17. Rate Limiting

Rate limiting is enforced at the Express API layer using `express-rate-limit` with standard HTTP headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`):

1. **Global Rate Limit**: Bounded to 100 requests per 15-minute window per IP for general endpoints.
2. **High-Cost Endpoints**:
   - Authentication (`/auth/login`, `/auth/register`): Strict limits to prevent brute-force attacks.
   - AI Endpoints (`/ai/analyze`, `/ai/breakdown`, `/ai/decompose`): Dedicated tighter rate limits to prevent provider exhaustion and quota abuse.

---

## 18. Entitlement Enforcement

1. **Tier Limits**:
   - Tenant tiers (`FREE`, `PRO`, `ENTERPRISE`) define quotas for projects, members, and monthly AI tokens.
2. **Transactional Concurrency Protection**:
   - Project creation uses row locking on the `Organization` row (`SELECT id, plan FROM organizations WHERE id = $1 FOR UPDATE`) inside a Prisma transaction. Under high concurrent load, project counts are strictly bounded and cannot exceed `maxProjects`.
   - AI usage is recorded atomically using database-level increment operations with quota verification, ensuring no quota overshoot occurs under concurrent requests.

---

## 19. Auditability & Security Events

1. **Immutable Audit Trail**:
   - Security and compliance events (user authentication, member invitations, role changes, project lifecycle, billing changes) are appended to the `AuditLog` table.
2. **Non-Repudiation**:
   - Records capture `timestamp`, `actorId`, `organizationId`, `action`, `resourceType`, `resourceId`, and sanitized `metadata`.
3. **Access Restriction**:
   - Audit logs are accessible exclusively to organization `OWNER` and `ADMIN` members.

---

## 20. Production Smoke Test

A deterministic, automated Playwright smoke test suite is maintained in `e2e/tests/production_smoke.spec.ts`:

1. **Scope of Journey**:
   - Verification of `/health/live` and `/health/ready` endpoints.
   - New user registration and authenticated session creation.
   - Organization workspace initialization.
   - Project creation and Kanban board rendering.
   - Task creation and status transition.
   - Operations dashboard KPI loading.
   - Security audit log inspection.
   - Usage and entitlement plan verification.
   - Resilience test: Simulated AI service 503 outage verified to gracefully display a warning toast without impairing core task management.
2. **Determinism**:
   - Tests do not make live calls to third-party OpenAI servers during automated runs; external calls are bounded or mocked.

---

## 21. Known Limitations

1. **Single-Node Worker Concurrency**: The background job worker utilizes PostgreSQL `FOR UPDATE SKIP LOCKED`. While highly concurrent across multiple worker threads, there is no separate distributed lease manager.
2. **File Storage Fallback**: Cloudinary is used for production attachments; when Cloudinary credentials are omitted in local/offline environments, attachment uploads are unavailable.
3. **Live Sentry Delivery**: Sentry event redaction and payload structures are verified via deterministic automated tests; live event delivery requires network egress to the Sentry cloud ingestion endpoint.
4. **Static Token Quotas**: Entitlement limits are evaluated per calendar month; mid-month plan downgrades do not retroactively invalidate existing projects.

---

## 22. Release Validation Matrix: Local vs. Container vs. Staging vs. Production

To maintain strict operational integrity and avoid fabricating deployment claims, TaskFlow categorizes all verification activities into explicit tiers:

### A. Validated Locally

- [x] **Unit & Integration Test Suites**: All test suites passing across `@taskflow/api`, `@taskflow/shared`, and `@taskflow/validation`.
- [x] **Python AI Subsystem Tests**: Pytest test suite, ruff linter, and formatting checks passing in `apps/ai`.
- [x] **Prisma Schema & Migration Validation**: Schema verified via `prisma validate`; all 13 migrations verified for clean installation and idempotent upgrade via `scripts/validate_migrations.ts`.
- [x] **Real PostgreSQL Backup & Restore Drill**: Fully executed and verified using native `pg_dump` and `pg_restore` against PostgreSQL 18 with isolated test database teardown via `scripts/db_backup_restore_smoke.ts`.
- [x] **Pre-Release Checks**: Deterministic pre-release validation script (`scripts/validate_release.ts`) passing all 13 checks.
- [x] **Service Dependency & Failure Injection**: Test suite (`staging_service_dependency_failure.test.ts`) validating API -> PostgreSQL, API -> Python AI degradation, worker exponential backoff, and stale job recovery.
- [x] **Deterministic Playwright Smoke Journey**: `e2e/tests/production_smoke.spec.ts` executing end-to-end user lifecycle, workspace setup, project/task CRUD, audit log, usage panel, simulated AI 503 degradation, logout, and re-login persistent state verification.

### B. Validated in Container

- [x] **Multi-Stage Container Builds**: Production Dockerfiles for Node.js API and Python AI build cleanly with non-root user execution (`USER taskflow`, UID 10001).
- [x] **Docker Compose Configuration**: Base `docker-compose.yml` and staging `docker-compose.staging.yml` syntax, network configuration, and service relationships validated via `docker compose config`.
- [x] **Network Isolation Invariants**: Internal Python AI service (`taskflow-ai`) and PostgreSQL (`postgres`) configured without host port exposure in staging composition.
- [x] **Decoupled API Readiness**: Healthcheck configuration on `/health/ready` strictly checks database availability without failing on external AI service state.

### C. Validated in Staging

- [x] **Staging Composition Definition**: `docker-compose.staging.yml` established with non-root containers, internal network communication, decoupled health checks, and strict environment variable interpolation.
- [x] **Disaster Recovery & Failure Tooling**: Bounded backup/restore drill and migration validation tooling executed against isolated target databases without affecting active development or staging state.
- [ ] _Staging verification items requiring live deployment cluster:_
  - Long-running continuous multi-day worker polling soak test.
  - Multi-client concurrent load simulation against staging load balancer.

### D. Not Yet Validated in Production (Explicit Production Limitations)

- [ ] **Real Production User Traffic**: Live production traffic patterns, organic concurrency, and peak request distributions.
- [ ] **Production TLS & CDN Termination**: End-to-end TLS certificate renewal, HTTPS redirect enforcement, and edge CDN cache headers at ingress reverse proxy.
- [ ] **Real Cloud Secret Injection**: Live integration with cloud secret managers (e.g. AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault) in production orchestrator.
- [ ] **Scheduled Automated Production Backups**: Automated snapshot schedules, cross-region replication of dump archives, and cold-storage retention policies.
- [ ] **Live Sentry Alert Routing**: PagerDuty/Slack notification rules and live error aggregation in production Sentry dashboard.
- [ ] **Actual Production Rollback**: Executing a rollback under live production traffic conditions (documented in runbook; only forward-compatible migrations deployed).
