# TaskFlow Staging Deployment, Disaster Recovery & Release Runbook

This operational runbook provides step-by-step instructions for staging releases, disaster recovery drills, failure testing, and production cutover for the TaskFlow platform.

Every operational step is explicitly labeled with its validation scope:

- **`[LOCAL]`**: Validated on local development workstations with developer tooling.
- **`[CONTAINER]`**: Validated inside isolated Docker containers / Compose environments.
- **`[STAGING]`**: Applicable to the production-like staging environment (`docker-compose.staging.yml`).
- **`[PRODUCTION]`**: Production-only operations that have not yet been executed in production.

---

## 1. Prerequisites

- **`[LOCAL]` `[CONTAINER]`**:
  - Docker 24.0+ and Docker Compose v2.20+ installed.
  - Node.js 20+ and npm 10+.
  - PostgreSQL 16+ CLI utilities (`pg_dump`, `pg_restore`, `psql`, `pg_isready`).
  - Python 3.13+ (for AI service local testing).
- **`[STAGING]` `[PRODUCTION]`**:
  - Dedicated virtual network / VPC with internal DNS resolution.
  - Host server with minimum 4 vCPUs and 8GB RAM.
  - Secret injection mechanism (Environment variables, Docker secrets, or Cloud Secret Manager).
  - External egress for Sentry telemetry and OpenAI API endpoints.

---

## 2. Environment Variables

Secrets must **never** be hardcoded in repository files or committed to Git. All variables must be injected at runtime.

### Critical Secrets Matrix

| Variable            | Target Service  | Minimum Length | Allowed Format / Constraints                                                               |
| :------------------ | :-------------- | :------------- | :----------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | API, Worker     | N/A            | Valid PostgreSQL connection string. Must not use dev default credentials.                  |
| `POSTGRES_PASSWORD` | PostgreSQL      | 16 chars       | Alphanumeric + symbols. Required in staging/prod.                                          |
| `JWT_SECRET`        | API             | 32 chars       | Cryptographically secure random hex or base64. Dev defaults fail fast.                     |
| `COOKIE_SECRET`     | API             | 32 chars       | Cryptographically secure random string. Dev defaults fail fast.                            |
| `AI_SERVICE_TOKEN`  | API, AI, Worker | 16 chars       | Shared secret for internal service-to-service authentication.                              |
| `CORS_ORIGIN`       | API             | N/A            | Fully qualified URL (e.g. `https://staging.taskflow.dev`). Wildcard `*` strictly rejected. |
| `OPENAI_API_KEY`    | Python AI       | N/A            | Required for live LLM operations. Kept strictly on the AI service.                         |
| `SENTRY_DSN`        | API, AI, Web    | N/A            | Project DSN for error telemetry.                                                           |

- **`[LOCAL]`**: Loaded via local `.env` files (gitignored).
- **`[CONTAINER]` `[STAGING]`**: Injected via `docker-compose.staging.yml` from environment or secret files.
- **`[PRODUCTION]`**: Injected via cloud key vault / secret store into orchestrator task definitions.

---

## 3. Startup Order

The services have strict dependency and readiness ordering.

```
PostgreSQL (Healthy)
      │
      ├──> TaskFlow API (Reads DB readiness via /health/ready)
      │
      ├──> TaskFlow Worker (Polls DB via SKIP LOCKED)
      │
Python AI (Healthy via /health) <── [API communicates via internal network]
```

### Execution Steps:

1. **`[CONTAINER]` `[STAGING]`**: Start PostgreSQL first and wait for healthy state:
   ```bash
   docker compose -f docker-compose.staging.yml up -d postgres
   docker compose -f docker-compose.staging.yml exec postgres pg_isready -U taskflow_admin -d taskflow_staging
   ```
2. **`[CONTAINER]` `[STAGING]`**: Start Python AI service independently:
   ```bash
   docker compose -f docker-compose.staging.yml up -d taskflow-ai
   ```
3. **`[CONTAINER]` `[STAGING]`**: Start Core API (waits on PostgreSQL health check):
   ```bash
   docker compose -f docker-compose.staging.yml up -d taskflow-api
   ```
4. **`[CONTAINER]` `[STAGING]`**: Start Background Worker (waits on PostgreSQL health check):
   ```bash
   docker compose -f docker-compose.staging.yml up -d taskflow-worker
   ```

---

## 4. Migration Procedure

Database migrations must follow a non-destructive forward strategy.

> [!CAUTION]
> Never run `prisma migrate reset` or destructive schema modifications on staging or production databases.

### Deployment Path:

1. **`[LOCAL]`**: Pre-release migration validation:
   ```bash
   npx tsx scripts/validate_migrations.ts
   ```
   _Validates clean installation on empty database AND idempotent upgrade on existing representative data._
2. **`[CONTAINER]` `[STAGING]` `[PRODUCTION]`**: Apply pending migrations to target database:
   ```bash
   npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
   ```
3. **`[CONTAINER]` `[STAGING]`**: Verify migration status:
   ```bash
   npx prisma migrate status --schema apps/api/prisma/schema.prisma
   ```

---

## 5. Readiness Verification

TaskFlow differentiates between liveness and readiness probes.

- **`/health/live` (Liveness)**: Verifies that the Node.js event loop is running and accepting HTTP requests. Returns HTTP 200.
- **`/health/ready` (Readiness)**: Verifies that the database connection pool is active and queries succeed. Returns HTTP 200 when ready, HTTP 503 when the database is unavailable.
- **AI Decoupling Invariant**: `/health/ready` does **not** fail if the external AI service or OpenAI is down. Core project and task CRUD operations remain fully functional.

### Commands:

- **`[LOCAL]` `[CONTAINER]` `[STAGING]`**:
  ```bash
  curl -i http://localhost:5000/health/live
  curl -i http://localhost:5000/health/ready
  ```

---

## 6. Smoke Test

A deterministic, automated Playwright smoke test validates the full release journey.

- **`[LOCAL]` `[CONTAINER]`**: Run release validation script:
  ```bash
  npx tsx scripts/validate_release.ts
  ```
- **`[LOCAL]` `[CONTAINER]`**: Run full Playwright production smoke test:
  ```bash
  npx playwright test e2e/tests/production_smoke.spec.ts
  ```
  _Journey includes: API health check, registration, login, workspace creation, project creation, task creation, dashboard KPIs, audit log review, usage metrics, AI degradation fallback, logout, and re-login persistent state verification._

---

## 7. Sentry Verification

- **`[LOCAL]` `[CONTAINER]`**: Automated test suite validates Sentry secret scrubbing and correlation IDs:
  ```bash
  npm test --workspace=@taskflow/api -- src/__tests__/sentry_observability.test.ts --run
  ```
- **`[STAGING]`**: Trigger a controlled test exception to verify ingestion:
  ```bash
  curl -i -H "X-Request-ID: test-sentry-trace-1" http://localhost:5000/api/v1/projects/invalid-id
  ```
- **`[STAGING]` `[PRODUCTION]`**: Verify in Sentry dashboard that:
  - Event arrives with environment tag `staging` or `production`.
  - Sensitive parameters (`password`, `token`, `cookie`, `apiKey`, `DATABASE_URL`) are redacted as `[REDACTED]`.
  - Correlation header `X-Request-ID` is preserved on the event tag.

---

## 8. AI Outage Test

Validates graceful degradation when the Python AI service is completely unavailable.

### Test Procedure:

1. **`[CONTAINER]` `[STAGING]`**: Stop the Python AI container:
   ```bash
   docker compose -f docker-compose.staging.yml stop taskflow-ai
   ```
2. **`[CONTAINER]` `[STAGING]`**: Verify API readiness remains HTTP 200:
   ```bash
   curl -i http://localhost:5000/health/ready
   # Must return HTTP 200 with data.status = "ready"
   ```
3. **`[CONTAINER]` `[STAGING]`**: Verify project/task CRUD operations continue without error.
4. **`[CONTAINER]` `[STAGING]`**: Trigger an AI analysis endpoint (e.g. `POST /api/v1/projects/:id/ai/analyze`):
   - Returns controlled HTTP 503 with error code `AI_SERVICE_UNAVAILABLE`.
   - Any reserved token quota is automatically reverted.
   - Zero domain state mutation occurs.
5. **`[CONTAINER]` `[STAGING]`**: Restart AI container:
   ```bash
   docker compose -f docker-compose.staging.yml start taskflow-ai
   ```

---

## 9. Database Outage Test

Validates system behavior when PostgreSQL becomes unreachable.

### Test Procedure:

1. **`[CONTAINER]` `[STAGING]`**: Pause or stop the PostgreSQL service:
   ```bash
   docker compose -f docker-compose.staging.yml stop postgres
   ```
2. **`[CONTAINER]` `[STAGING]`**: Verify API readiness immediately reports HTTP 503:
   ```bash
   curl -i http://localhost:5000/health/ready
   # Expected: HTTP 503 with code "SERVICE_UNAVAILABLE"
   ```
3. **`[CONTAINER]` `[STAGING]`**: Verify worker logs:
   - Worker catches connection errors and engages exponential backoff with jitter.
   - Worker does not hot-spin or crash.
4. **`[CONTAINER]` `[STAGING]`**: Restart PostgreSQL:
   ```bash
   docker compose -f docker-compose.staging.yml start postgres
   ```
5. **`[CONTAINER]` `[STAGING]`**: Verify API readiness automatically recovers to HTTP 200 without restarting the API process.

---

## 10. Worker Outage Test

Validates that background jobs remain persisted in PostgreSQL and process upon worker restart.

### Test Procedure:

1. **`[CONTAINER]` `[STAGING]`**: Stop the background worker container:
   ```bash
   docker compose -f docker-compose.staging.yml stop taskflow-worker
   ```
2. **`[CONTAINER]` `[STAGING]`**: Perform operations in the API that enqueue jobs (e.g. creating notification events or background tasks).
3. **`[CONTAINER]` `[STAGING]`**: Inspect the `jobs` table in PostgreSQL:
   - Jobs remain durable with status `PENDING`.
4. **`[CONTAINER]` `[STAGING]`**: Restart the worker container:
   ```bash
   docker compose -f docker-compose.staging.yml start taskflow-worker
   ```
5. **`[CONTAINER]` `[STAGING]`**: Verify that pending jobs are claimed and transitioned to `COMPLETED`.

---

## 11. Backup Procedure

A real PostgreSQL backup drill uses `pg_dump` with custom compressed format (`-Fc`), explicit lock timeout (`--lock-wait-timeout=10s`), and non-interactive password injection via `PGPASSWORD`.

### Execution:

- **`[LOCAL]`**: Execute automated backup & restore drill:
  ```bash
  npx tsx scripts/db_backup_restore_smoke.ts
  ```
- **`[CONTAINER]` `[STAGING]` `[PRODUCTION]`**: Production backup command:
  ```bash
  BACKUP_FILE="backup_taskflow_$(date +%Y%m%d_%H%M%S).dump"
  pg_dump -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -Fc --lock-wait-timeout=10s -f $BACKUP_FILE
  ```
- Verify backup is non-empty and readable:
  ```bash
  test -s $BACKUP_FILE && echo "Backup file verified"
  ```

---

## 12. Restore Procedure

> [!IMPORTANT]
> Never restore a backup directly over an active database without creating an immediate pre-restore snapshot. Prefer restoring into an isolated target database.

### Execution Steps:

1. **`[STAGING]` `[PRODUCTION]`**: Create a clean target database:
   ```bash
   createdb -h $PGHOST -p $PGPORT -U $PGUSER taskflow_restore_target
   ```
2. **`[STAGING]` `[PRODUCTION]`**: Restore using `pg_restore`:
   ```bash
   pg_restore -h $PGHOST -p $PGPORT -U $PGUSER -d taskflow_restore_target --no-owner --clean --if-exists $BACKUP_FILE
   ```
3. **`[STAGING]` `[PRODUCTION]`**: Verify table and record integrity on restored database:
   ```bash
   psql -h $PGHOST -p $PGPORT -U $PGUSER -d taskflow_restore_target -c "SELECT 'users' as t, count(*) FROM users UNION ALL SELECT 'tasks', count(*) FROM tasks;"
   ```

---

## 13. Rollback Procedure

When an incident requires rolling back a release, distinguish between **Application Rollback** and **Database Rollback**.

### A. Application Rollback (Code / Containers Only)

If migrations are backward-compatible (the standard TaskFlow policy), rolling back is purely an application image change:

1. **`[CONTAINER]` `[STAGING]` `[PRODUCTION]`**: Re-tag and deploy the previous known-good container image for API, Worker, and Web:
   ```bash
   docker compose -f docker-compose.staging.yml up -d --no-deps taskflow-api taskflow-worker
   ```
2. **`[CONTAINER]` `[STAGING]` `[PRODUCTION]`**: Verify API readiness returns HTTP 200.

### B. Database Rollback (Expand-and-Contract & Forward Migrations)

- **Do NOT blindly roll migrations backward in production.** Rolling backward risks data loss for new columns or modified constraints.
- If a schema issue occurs:
  1. Prefer applying an emergency forward migration that patches the issue.
  2. If data corruption occurred, restore from the pre-release backup into an isolated database, verify tenant data, and perform a controlled data migration.

---

## 14. Incident Evidence Collection

During an outage or operational anomaly, collect evidence before restarting containers:

### Commands:

- **`[CONTAINER]` `[STAGING]`**: Container logs:
  ```bash
  docker compose -f docker-compose.staging.yml logs --tail 500 taskflow-api > api_incident.log
  docker compose -f docker-compose.staging.yml logs --tail 500 taskflow-worker > worker_incident.log
  docker compose -f docker-compose.staging.yml logs --tail 500 taskflow-ai > ai_incident.log
  ```
- **`[CONTAINER]` `[STAGING]`**: Database connection and lock state:
  ```bash
  psql -h localhost -U taskflow_admin -d taskflow_staging -c "SELECT pid, usename, state, query, age(clock_timestamp(), query_start) FROM pg_stat_activity WHERE state != 'idle';"
  ```
- **`[CONTAINER]` `[STAGING]`**: Job queue health:
  ```bash
  psql -h localhost -U taskflow_admin -d taskflow_staging -c "SELECT status, count(*) FROM jobs GROUP BY status;"
  ```

---

## 15. Shutdown Procedure

Graceful shutdown ensures in-flight requests and background jobs complete without corruption.

1. **`[CONTAINER]` `[STAGING]`**: Stop API and Worker with 15-second grace period (API drains in-flight requests; worker drains current job):
   ```bash
   docker compose -f docker-compose.staging.yml stop -t 15 taskflow-api taskflow-worker
   ```
2. **`[CONTAINER]` `[STAGING]`**: Stop AI service:
   ```bash
   docker compose -f docker-compose.staging.yml stop taskflow-ai
   ```
3. **`[CONTAINER]` `[STAGING]`**: Stop PostgreSQL last:
   ```bash
   docker compose -f docker-compose.staging.yml stop postgres
   ```

---

## 16. Post-Release Validation

Immediately following release cutover:

1. **`[STAGING]` `[PRODUCTION]`**: Check liveness probe: `GET /health/live` -> 200.
2. **`[STAGING]` `[PRODUCTION]`**: Check readiness probe: `GET /health/ready` -> 200 (database up).
3. **`[STAGING]` `[PRODUCTION]`**: Verify OpenAPI docs accessible at `/docs` (if enabled in environment).
4. **`[STAGING]` `[PRODUCTION]`**: Verify background worker is actively claiming jobs without logging connection errors.
5. **`[STAGING]` `[PRODUCTION]`**: Run deterministic release validation script:
   ```bash
   npx tsx scripts/validate_release.ts
   ```

---

## 17. Known Limitations

1. **Single-Cluster PostgreSQL**: The system relies on a single authoritative PostgreSQL database with row-level transactional locking. Cross-region multi-master replication is not configured.
2. **Real Cloud Secret Injection**: In local and container environments, secrets are validated via environment variables; live cloud key vault integrations (e.g. AWS Secrets Manager or HashiCorp Vault) must be configured in production infrastructure.
3. **Live Sentry Delivery**: Tested and verified via mock scopes and SDK configuration; live event arrival in Sentry UI requires outbound network egress from the production environment.
4. **OpenAI Upstream Rate Limits**: Handled gracefully with fallback toasts and retry headers, but dependent on external provider availability and account quota.
