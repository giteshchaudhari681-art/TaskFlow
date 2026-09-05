# TaskFlow Staging Deployment, Disaster Recovery & Release Runbook

This operational runbook provides step-by-step procedures for staging deployments, environment preparation, migrations, disaster recovery drills, observability verification, failure triage, and production promotion prerequisites for the TaskFlow platform.

Every operational step is explicitly labeled with its validation scope:

- **`[LOCAL]`**: Validated on local development workstations using developer tooling.
- **`[CONTAINER]`**: Validated inside isolated Docker containers or Compose test environments.
- **`[STAGING]`**: Applicable to the production-like staging deployment (`docker-compose.staging.yml`).
- **`[PRODUCTION]`**: Production-only release procedures that remain to be exercised in live production.

---

## 1. Prerequisites

- **`[LOCAL]` `[CONTAINER]`**:
  - Docker 24.0+ and Docker Compose v2.20+ installed.
  - Node.js 20+ and npm 10+ installed.
  - PostgreSQL 16+ client utilities installed (`pg_dump`, `pg_restore`, `psql`, `pg_isready`).
  - Python 3.13+ with uv or virtual environment (`apps/ai/.venv`).
- **`[STAGING]` `[PRODUCTION]`**:
  - Dedicated virtual network / VPC with internal DNS resolution (`taskflow-staging-network`).
  - Host server with minimum 4 vCPUs, 8GB RAM, and 50GB NVMe storage.
  - Secure secret injection mechanism (environment file, container secrets, or cloud secret manager).
  - Outbound HTTPS network egress allowed for Sentry telemetry and OpenAI API endpoints.
  - Public DNS record pointing `staging.taskflow.dev` (or configured hostname) to API host ingress on port 5000.

---

## 2. Environment Setup

- **`[LOCAL]`**: Copy development template:
  ```bash
  cp .env.example .env
  ```
- **`[CONTAINER]` `[STAGING]`**: Create staging environment file from contract template:
  ```bash
  cp .env.staging.example .env.staging
  ```
- **`[STAGING]`**: Ensure environment file permissions are strictly restricted to the deployment runner user:
  ```bash
  chmod 600 .env.staging
  ```
- **`[STAGING]` `[PRODUCTION]`**: Separate variable domains into:
  1. Public application configuration (`PORT`, `NODE_ENV`, `CORS_ORIGIN`)
  2. API cryptographic secrets (`JWT_SECRET`, `COOKIE_SECRET`)
  3. Database credentials (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`)
  4. Internal service tokens (`AI_SERVICE_TOKEN`)
  5. Sentry error monitoring (`SENTRY_DSN`, `SENTRY_ENVIRONMENT`)
  6. OpenAI provider keys (`OPENAI_API_KEY`, `OPENAI_MODEL`)
  7. Worker tuning parameters (`WORKER_*`)

---

## 3. Secret Configuration

Secrets must **never** be committed to git or printed in logs. Staging enforces fail-closed validation on startup.

### Secret Strength Requirements:

| Variable            | Target Services | Minimum Requirement  | Staging Fail-Closed Rule                    |
| :------------------ | :-------------- | :------------------- | :------------------------------------------ |
| `JWT_SECRET`        | API             | >= 32 characters     | Rejects default dev secret; aborts startup  |
| `COOKIE_SECRET`     | API             | >= 32 characters     | Rejects default dev secret; aborts startup  |
| `AI_SERVICE_TOKEN`  | API, AI, Worker | >= 16 characters     | Rejects default dev token; aborts startup   |
| `DATABASE_URL`      | API, Worker     | Valid PostgreSQL URL | Rejects `postgres:postgres` default dev URL |
| `CORS_ORIGIN`       | API             | Fully-qualified URL  | Rejects wildcard `*`                        |
| `POSTGRES_PASSWORD` | PostgreSQL      | >= 16 characters     | Required by `docker-compose.staging.yml`    |
| `OPENAI_API_KEY`    | Python AI       | Valid OpenAI key     | Optional (mock provider used when absent)   |
| `SENTRY_DSN`        | API, AI, Web    | Valid Sentry DSN     | Optional (telemetry disabled when absent)   |

### Secret Generation Commands:

- **`[LOCAL]` `[STAGING]`**: Generate cryptographically secure secrets:
  ```bash
  # JWT & Cookie secrets (32+ chars)
  openssl rand -base64 32
  # PostgreSQL password (16+ chars)
  openssl rand -base64 24
  # Internal AI service token (16+ chars)
  openssl rand -hex 16
  ```

---

## 4. Docker Deployment

### Backend Services Orchestration:

The backend stack consists of 4 containerized services managed by `docker-compose.staging.yml`:

1. `postgres` (PostgreSQL 16 Alpine, internal-only, port 5432 exposed to staging network)
2. `taskflow-ai` (Python FastAPI AI subsystem, internal-only, port 8000 exposed to network)
3. `taskflow-api` (Express REST API, public ingress on port 5000:5000, runs as `USER taskflow`)
4. `taskflow-worker` (Background job processor, internal-only, runs as `USER taskflow`)

- **`[LOCAL]` `[CONTAINER]`**: Run deployment preflight check:
  ```bash
  npm run staging:preflight
  ```
- **`[CONTAINER]` `[STAGING]`**: Build and start the staging composition:
  ```bash
  docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build
  ```
- **`[CONTAINER]` `[STAGING]`**: Verify container running status and non-root execution:
  ```bash
  docker compose -f docker-compose.staging.yml ps
  docker compose -f docker-compose.staging.yml exec taskflow-api id
  # Expected: uid=10001(taskflow) gid=10001(taskflow)
  ```

### Staging Frontend Deployment Procedure:

TaskFlow frontend (`apps/web`) is a static single-page application (SPA) built via Vite.

- **`[LOCAL]` `[STAGING]`**: Build the production static distribution:
  ```bash
  npm run build --workspace=@taskflow/web
  ```
  _Artifacts generated in `apps/web/dist/`._
- **`[STAGING]`**: Deploy frontend static distribution to web server / reverse proxy (e.g. Nginx or Cloudflare Pages):
  ```nginx
  server {
      listen 80;
      server_name staging.taskflow.dev;
      root /var/www/taskflow-staging/apps/web/dist;
      index index.html;

      location / {
          try_files $uri $uri/ /index.html;
      }

      location /api/ {
          proxy_pass http://taskflow-staging-api:5000;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
  }
  ```

---

## 5. Migration Procedure

Database migrations follow a strict forward-only, expand-and-contract policy.

> [!CAUTION]
> Never execute `prisma migrate reset` in staging or production. Destructive schema operations are strictly prohibited.

- **`[LOCAL]`**: Verify migration history consistency:
  ```bash
  npx tsx scripts/validate_migrations.ts
  ```
- **`[CONTAINER]` `[STAGING]` `[PRODUCTION]`**: Apply forward migrations to target database:
  ```bash
  npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
  ```
- **`[CONTAINER]` `[STAGING]` `[PRODUCTION]`**: Verify migration synchronization status:
  ```bash
  npx prisma migrate status --schema apps/api/prisma/schema.prisma
  ```
  _Expected: "Database schema is up to date!"_

---

## 6. Health Validation

TaskFlow decouples process vitality (liveness) from database connection responsiveness (readiness).

- **`[CONTAINER]` `[STAGING]`**: Check process liveness:
  ```bash
  curl -i http://localhost:5000/health/live
  # Expected: HTTP 200 OK {"success": true, "data": {"status": "live", "service": "taskflow-api"}}
  ```
- **`[CONTAINER]` `[STAGING]`**: Check database readiness:
  ```bash
  curl -i http://localhost:5000/health/ready
  # Expected: HTTP 200 OK {"success": true, "data": {"status": "ready", "checks": {"database": {"status": "up"}}}}
  ```
- **`[CONTAINER]` `[STAGING]`**: Check internal AI service health:
  ```bash
  docker compose -f docker-compose.staging.yml exec taskflow-ai python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read().decode())"
  # Expected: {"status": "ok", "service": "taskflow-ai"}
  ```

---

## 7. Smoke Test

- **`[LOCAL]` `[CONTAINER]`**: Run automated release checks (13 architectural and configuration gates):
  ```bash
  npx tsx scripts/validate_release.ts
  ```
- **`[LOCAL]` `[CONTAINER]`**: Run load smoke test (25 requests across 5 workers):
  ```bash
  npm run load:smoke
  ```
- **`[LOCAL]` `[CONTAINER]` `[STAGING]`**: Run targeted Playwright smoke journey:
  ```bash
  npx playwright test e2e/tests/production_smoke.spec.ts
  ```
  _Verifies: User login, authenticated session, project CRUD, task creation, dashboard KPIs, audit log, usage view, logout, re-authentication, and persistent data reload._

---

## 8. Sentry Verification

- **`[LOCAL]`**: Run automated Sentry redaction and correlation suite:
  ```bash
  npm test --workspace=@taskflow/api -- src/__tests__/pr32_staging_dependency_observability.test.ts --run
  ```
- **`[STAGING]`**: Trigger a safe diagnostic 404 to verify absence of Sentry noise:
  ```bash
  curl -i -H "X-Request-ID: test-sentry-noise-check" http://localhost:5000/api/v1/non-existent-diagnostic
  ```
  _Expected: HTTP 404; Sentry dashboard receives zero events (4xx operational errors are filtered)._
- **`[STAGING]`**: In Sentry web console, verify:
  - Environment is tagged `staging`.
  - Service identity tag is `api`, `ai`, or `worker`.
  - RequestId tag matches `X-Request-ID`.
  - Zero Bearer tokens, cookies, passwords, or database credentials appear in event payloads.

---

## 9. Worker Verification

- **`[CONTAINER]` `[STAGING]`**: Inspect background worker logs:
  ```bash
  docker compose -f docker-compose.staging.yml logs --tail 100 -f taskflow-worker
  ```
- **`[CONTAINER]` `[STAGING]`**: Verify worker lifecycle invariants:
  - Jobs transition: `PENDING` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED`.
  - No continuous connection errors during normal PostgreSQL operation.
  - Consecutive error counter resets to 0 upon healthy database poll.
- **`[CONTAINER]` `[STAGING]`**: Trigger worker restart and verify durable recovery:
  ```bash
  docker compose -f docker-compose.staging.yml restart taskflow-worker
  docker compose -f docker-compose.staging.yml logs --tail 50 taskflow-worker
  # Expected: Clean graceful shutdown, restart, and resumption of job polling
  ```

---

## 10. AI Verification

- **`[CONTAINER]` `[STAGING]`**: Validate all 4 AI operations against staging API using mock or test account:
  ```bash
  # 1. Project Summary / Insight
  curl -i -X POST http://localhost:5000/api/v1/organizations/$ORG_ID/projects/$PROJECT_ID/ai/analyze \
       -H "Authorization: Bearer $TOKEN" \
       -H "Content-Type: application/json" \
       -d '{"operation": "PROJECT_INSIGHT"}'
  ```
- Verify:
  - Returns HTTP 200 with structured analysis.
  - Quota is reserved atomically and decremented upon success.
  - Invariant: `TASK_ACTIONS` returns suggestions only; database records are **never** mutated without human review and explicit HTTP `PATCH`.

---

## 11. Backup & Restore Drill

- **`[LOCAL]`**: Execute automated backup & restore drill into isolated database:
  ```bash
  npx tsx scripts/db_backup_restore_smoke.ts
  ```
- **`[CONTAINER]` `[STAGING]`**: Run manual PostgreSQL staging backup:
  ```bash
  BACKUP_FILE="staging_backup_$(date +%Y%m%d_%H%M%S).dump"
  docker compose -f docker-compose.staging.yml exec -T postgres pg_dump -U taskflow_admin -d taskflow_staging -Fc --lock-wait-timeout=10s > $BACKUP_FILE
  test -s $BACKUP_FILE && echo "Staging backup created successfully: $BACKUP_FILE"
  ```
- **`[CONTAINER]` `[STAGING]`**: Restore into an isolated validation database (never over live staging):
  ```bash
  docker compose -f docker-compose.staging.yml exec -T postgres createdb -U taskflow_admin taskflow_restore_drill
  docker compose -f docker-compose.staging.yml exec -T postgres pg_restore -U taskflow_admin -d taskflow_restore_drill --no-owner --clean --if-exists < $BACKUP_FILE
  docker compose -f docker-compose.staging.yml exec -T postgres psql -U taskflow_admin -d taskflow_restore_drill -c "SELECT count(*) FROM users; SELECT count(*) FROM tasks;"
  docker compose -f docker-compose.staging.yml exec -T postgres dropdb -U taskflow_admin taskflow_restore_drill
  rm -f $BACKUP_FILE
  ```

---

## 12. Rollback Procedure

### Application Rollback (Code Only):

When migrations are forward-compatible, rollback requires only reverting container images:

1. **`[CONTAINER]` `[STAGING]`**: Re-deploy the previous container image tag:
   ```bash
   docker compose -f docker-compose.staging.yml up -d --no-deps taskflow-api taskflow-worker
   ```
2. **`[CONTAINER]` `[STAGING]`**: Verify readiness probe recovers:
   ```bash
   curl -i http://localhost:5000/health/ready
   ```

### Schema Rollback (Emergency Forward Patch):

- **`[STAGING]` `[PRODUCTION]`**: Do not roll back migrations in reverse. Create and deploy a corrective forward migration:
  ```bash
  # Create forward fix migration
  npx prisma migrate dev --name emergency_hotfix
  # Deploy forward fix
  npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
  ```

---

## 13. Failure Scenarios

### Scenario A: PostgreSQL Outage

1. **`[CONTAINER]` `[STAGING]`**: Stop PostgreSQL:
   ```bash
   docker compose -f docker-compose.staging.yml stop postgres
   ```
2. **`[CONTAINER]` `[STAGING]`**: Verify `/health/ready` immediately returns HTTP 503 `not_ready`.
3. **`[CONTAINER]` `[STAGING]`**: Verify worker enters exponential backoff with jitter.
4. **`[CONTAINER]` `[STAGING]`**: Restart PostgreSQL:
   ```bash
   docker compose -f docker-compose.staging.yml start postgres
   ```
5. **`[CONTAINER]` `[STAGING]`**: Verify `/health/ready` recovers to HTTP 200 without API restart.

### Scenario B: Python AI Outage

1. **`[CONTAINER]` `[STAGING]`**: Stop AI service:
   ```bash
   docker compose -f docker-compose.staging.yml stop taskflow-ai
   ```
2. **`[CONTAINER]` `[STAGING]`**: Verify `/health/ready` remains HTTP 200 `ready`.
3. **`[CONTAINER]` `[STAGING]`**: Trigger AI endpoint: returns controlled HTTP 503 `AI_SERVICE_UNAVAILABLE`; reserved tokens compensated.
4. **`[CONTAINER]` `[STAGING]`**: Restart AI service:
   ```bash
   docker compose -f docker-compose.staging.yml start taskflow-ai
   ```

---

## 14. Troubleshooting

| Symptom                                    | Diagnostic Step                                                    | Remediation                                                                                               |
| :----------------------------------------- | :----------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| **API fails to start with exit code 1**    | Inspect `docker compose logs taskflow-api`                         | Secret length rule failed in `env.ts`. Ensure `JWT_SECRET` >= 32 chars and `DATABASE_URL` is non-default. |
| **`/health/ready` returns 503**            | Run `docker compose exec postgres pg_isready`                      | PostgreSQL is unreachable or connection pool exhausted. Check PostgreSQL container status.                |
| **Worker claims no jobs**                  | Check table: `SELECT count(*) FROM jobs WHERE status = 'PENDING';` | If pending jobs exist, check worker error backoff logs for DB connection timeouts.                        |
| **AI requests return 504 Gateway Timeout** | Check AI container latency and OpenAI egress                       | Upstream AI took > 30s. Verify network connectivity to OpenAI from `taskflow-ai` container.               |

---

## 15. Evidence Collection

In the event of an operational anomaly, gather diagnostic logs before restarting:

- **`[CONTAINER]` `[STAGING]`**: Export container logs:
  ```bash
  docker compose -f docker-compose.staging.yml logs --tail 500 taskflow-api > api_anomaly.log
  docker compose -f docker-compose.staging.yml logs --tail 500 taskflow-worker > worker_anomaly.log
  docker compose -f docker-compose.staging.yml logs --tail 500 taskflow-ai > ai_anomaly.log
  ```
- **`[CONTAINER]` `[STAGING]`**: Export database connection and lock states:
  ```bash
  docker compose -f docker-compose.staging.yml exec postgres psql -U taskflow_admin -d taskflow_staging -c "SELECT pid, state, query, age(clock_timestamp(), query_start) FROM pg_stat_activity WHERE state != 'idle';" > db_locks.log
  ```

---

## 16. Cleanup

- **`[CONTAINER]` `[STAGING]`**: Graceful stack teardown preserving database volumes:
  ```bash
  docker compose -f docker-compose.staging.yml stop -t 15 taskflow-api taskflow-worker
  docker compose -f docker-compose.staging.yml stop taskflow-ai
  docker compose -f docker-compose.staging.yml stop postgres
  ```
- **`[CONTAINER]` `[STAGING]`**: Complete stack teardown with container removal:
  ```bash
  docker compose -f docker-compose.staging.yml down
  ```
- **`[LOCAL]`**: Remove ephemeral test artifacts and scratch files:
  ```bash
  rm -f *.dump *.log
  ```

---

## 17. Production Promotion Prerequisites

Before promoting the TaskFlow build to production:

1. **`[LOCAL]` Monorepo Gates**: `npm run type-check`, `npm run build`, `npm run format:check`, and `npm test` must all exit with code 0.
2. **`[LOCAL]` Python AI Gates**: `pytest apps/ai`, `ruff check apps/ai`, and `ruff format --check apps/ai` must pass with 0 errors.
3. **`[CONTAINER]` Preflight**: `npm run staging:preflight` must pass 15/15 checks.
4. **`[CONTAINER]` Migrations**: `npx prisma migrate status` must confirm all forward migrations are applied.
5. **`[STAGING]` Smoke Test**: End-to-end journey in staging completes with 0 errors.
6. **`[PRODUCTION]` Secret Audit**: Production secrets injected via external secret manager; zero default credentials configured.
7. **`[PRODUCTION]` Backup Schedule**: Automated recurring snapshot / WAL archiving active on production database instance.
