# TaskFlow Production Release & Rollback

**PR**: PR34 — Production Release, Backup & Rollback  
**Target Branch**: `feat/pr-34-production-release-rollback`  
**Classification**: Release Engineering, Operations & Disaster Recovery

---

## 1. Purpose

This document establishes the official operational standard for release engineering, automated preflight validation, pre-deployment database snapshots, deployment sequencing, health probe semantics, and disaster recovery procedures for the TaskFlow application platform.

The release system is designed to be:

- **Deterministic**: Verifiable via automated, offline, and containerized preflight gates.
- **Auditable & Immutable**: Every released artifact is strictly pinned to a specific git commit SHA.
- **Migration-Safe**: No destructive automatic schema changes; expand/contract patterns are required.
- **Rollback-Aware**: Application rollbacks are separated from database disaster recoveries.
- **Secure**: Fail-closed configuration enforcement with zero secret disclosure.

---

## 2. Release Identity

TaskFlow uses immutable, deterministic release identifiers. Every build artifact is pinned to the exact git commit SHA of the release commit.

### Identifier Structure

| Component     | Immutable Image / Release Tag                                 | Mutable Alias (Convenience Only)                       |
| ------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| **Core API**  | `taskflow-api:<git-sha>` (e.g., `taskflow-api:09fa79b`)       | `taskflow-api:latest`, `taskflow-api:production`       |
| **Python AI** | `taskflow-ai:<git-sha>` (e.g., `taskflow-ai:09fa79b`)         | `taskflow-ai:latest`, `taskflow-ai:production`         |
| **Worker**    | `taskflow-worker:<git-sha>` (e.g., `taskflow-worker:09fa79b`) | `taskflow-worker:latest`, `taskflow-worker:production` |
| **Sentry**    | `taskflow-api@0.1.0-<git-sha>`                                | N/A                                                    |

### Invariants:

1. Production deployments **MUST** resolve to an immutable image tag containing the 7-character or 40-character git commit SHA.
2. Deploying unpinned mutable tags (`latest`, `production`, `main`, `stable`) alone without SHA resolution is **strictly prohibited**.
3. Release identity is safely exposed via `/health` and `/health/live` response payloads (`version`, `commitSha`, `release`) and startup diagnostics.
4. Release identity payloads **NEVER** expose secrets, database connection strings, JWT keys, or internal service tokens.

---

## 3. Environment Model

TaskFlow defines four isolated runtime environments:

| Environment     | Purpose                            | Validation Posture                     | Network Isolation                            |
| --------------- | ---------------------------------- | -------------------------------------- | -------------------------------------------- |
| **Development** | Local iterative engineering        | Permissive defaults allowed            | Host-accessible PostgreSQL & Python AI       |
| **Test / CI**   | Automated regression & unit suites | In-memory mocks, zero external network | Local test DB, mock OpenAI transports        |
| **Staging**     | Mirror of production topology      | Strict production-grade secret checks  | Docker bridge network, internal-only DB & AI |
| **Production**  | Live tenant project management     | Hardened fail-closed configuration     | Private VPC subnets, external TLS ingress    |

---

## 4. Production Architecture

```
                       [ Internet / User Traffic ]
                                   │
                                   ▼ (HTTPS / Port 443)
                 ┌───────────────────────────────────┐
                 │    TLS / CDN / Ingress Edge       │
                 │  - Cloudflare / AWS WAF / NGINX   │
                 │  - SSL Termination (TLS 1.3)      │
                 │  - Edge Rate Limiting & DDoS Prot.│
                 └─────────────────┬─────────────────┘
                                   │
                                   ▼ (HTTP / Port 5000)
                 ┌───────────────────────────────────┐
                 │     TaskFlow Authoritative API    │ (taskflow-api:<sha>)
                 │  - Node.js / Express (non-root)   │
                 │  - Sole Public Ingress Container  │
                 └─────────┬───────────────┬─────────┘
                           │               │
        (Internal Network) │               │ (Internal Network)
        (X-Service-Token)  │               │ (PostgreSQL Connection Pool)
                           ▼               ▼
         ┌───────────────────┐   ┌───────────────────┐
         │   TaskFlow AI     │   │    PostgreSQL     │
         │ - Python / FastAPI│   │ - Authoritative DB│
         │ - Port 8000       │   │ - Port 5432       │
         │ - ZERO Host Ports │   │ - ZERO Host Ports │
         └───────────────────┘   └─────────▲─────────┘
                                           │
                                           │ (Internal Network)
                                 ┌─────────┴─────────┐
                                 │  TaskFlow Worker  │
                                 │ - Durable Job Exec│
                                 │ - ZERO HTTP Ports │
                                 └───────────────────┘
```

---

## 5. Required Secrets & Configuration Hygiene

All production credentials must be injected via secure environment variable injection (e.g., AWS Secrets Manager, HashiCorp Vault, or GCP Secret Manager). Storing production secrets in git or `.env` files is strictly forbidden.

| Variable Name      | Production Requirement                   | Validation Rule                                           |
| ------------------ | ---------------------------------------- | --------------------------------------------------------- |
| `NODE_ENV`         | Must be `'production'`                   | Enum: `development`, `test`, `staging`, `production`      |
| `JWT_SECRET`       | Secret key for access token signing      | Minimum 32 characters, cannot match dev default           |
| `COOKIE_SECRET`    | Secret key for cookie signing            | Minimum 32 characters, cannot match dev default           |
| `AI_SERVICE_TOKEN` | Bearer token for internal API → AI calls | Minimum 16 characters, cannot match dev default           |
| `DATABASE_URL`     | PostgreSQL connection pool URL           | Must be set; cannot contain `postgres:postgres@localhost` |
| `CORS_ORIGIN`      | Allowed client origin for CORS headers   | Explicit URL; wildcard `*` is strictly rejected           |
| `COOKIE_SECURE`    | Secure cookie transmission flag          | Must be `true` in production                              |
| `SENTRY_DSN`       | Sentry error monitoring ingest URL       | Required if production observability is enabled           |
| `OPENAI_API_KEY`   | OpenAI API provider key                  | Injected **ONLY** into `taskflow-ai` container            |

---

## 6. Pre-Release Checklist

Before promoting any build to production, the release operator must execute and verify:

- [ ] **Release Identity Verified**: Target git commit SHA verified and tagged (`git rev-parse HEAD`).
- [ ] **Immutable Container Images**: Built and pushed with tag `<service>:<git-sha>`.
- [ ] **Monorepo Quality Gates**: All automated suites passed:
  - `npm test --workspace=@taskflow/api -- --run` (647+ tests)
  - `pytest apps/ai` (76 tests)
  - `npm run type-check` (0 errors)
  - `npm run build` (all workspaces clean)
  - `npm run prisma:validate` (schema synchronized)
  - `npm run release:production:validate` (all 24 preflight checks passed)
- [ ] **Pre-Deployment Backup Completed**: Database dump created and verified via `npm run db:backup`.
- [ ] **Previous Known-Good Version Identified**: Rollback image tag documented in release ticket.
- [ ] **Incident Communication Channel Active**: Operations lead on standby.

---

## 7. Database Backup

### Pre-Deployment Backup Procedure

Before applying migrations or deploying new application containers, a complete PostgreSQL snapshot must be taken:

1. **Command Execution**:
   ```bash
   npm run db:backup
   # Or directly:
   npx tsx scripts/db_backup_restore_smoke.ts --backup-only
   ```
2. **Automated Verifications**:
   - Target database connectivity is confirmed via `pg_isready`.
   - `pg_dump` runs with custom format (`-Fc`) and `--lock-wait-timeout=10s`.
   - Output file exists and size is verified non-zero (`> 0 bytes`).
   - Backup receipt generated containing: Timestamp, Release Git SHA, Database Name, File Path, File Size, Duration, and Retention Policy.
3. **Safety Invariants**:
   - Backup scripts pass passwords through `PGPASSWORD` environment variables, never CLI flags.
   - Credentials are redacted from all diagnostic logs.
   - Backup restores are **NEVER** run automatically against the active production database.

---

## 8. Database Migration Safety Gates

TaskFlow database migrations use Prisma forward-only migrations.

### Migration Safety Rules

1. **Zero Destructive Down-Migrations**: Automatic down-migrations are strictly forbidden. Prisma migrations do not guarantee safe reversal without data loss.
2. **Clean & Upgrade Paths Verified**:
   - Migration deploy on empty database verified (`scripts/validate_migrations.ts`).
   - Migration deploy on populated database verified with existing data preservation.
3. **Expand / Contract Migration Pattern**:
   - For breaking schema changes (e.g., column renames or table restructuring):
     - **Phase 1 (Expand)**: Add new nullable columns or tables; maintain compatibility with previous application version. Deploy DB + App v1.
     - **Phase 2 (Migrate Data)**: Backfill data asynchronously via durable background worker.
     - **Phase 3 (Contract)**: Update app to write exclusively to new columns. Deploy App v2.
     - **Phase 4 (Cleanup)**: Drop legacy unused columns in a subsequent non-breaking migration.

---

## 9. Deployment Sequence

```
[ PHASE A: PRECHECK ] ──► [ PHASE B: BACKUP ] ──► [ PHASE C: DATABASE ]
- Verify Git SHA           - Take pg_dump          - prisma migrate deploy
- Validate Env & Secrets   - Verify dump non-empty - Confirm schema active
- Validate Image Tags      - Record Backup Receipt

                                │
                                ▼
[ PHASE F: SMOKE ]    ◄── [ PHASE E: HEALTH ]  ◄── [ PHASE D: SERVICES ]
- Run Smoke Tests          - Check /health/live    - Deploy API Container
- Verify Auth & State      - Check /health/ready   - Deploy AI Container
- Verify UI & Persistence  - Verify Worker Poll    - Deploy Worker Container

        │
        ▼
[ PHASE G: OBSERVABILITY ] ──► [ PHASE H: DECISION ]
- Monitor Sentry               - Continue if all gates pass
- Check Error Rate             - Trigger Rollback if critical failure
```

---

## 10. Health & Readiness Probe Semantics

The platform provides decoupled health endpoints to prevent cascading container restarts:

### 1. Liveness Probe (`GET /health/live`)

- **Semantics**: "Is the Node.js event loop responsive?"
- **Dependencies**: None. Does **NOT** ping PostgreSQL; does **NOT** ping Python AI.
- **Expected Return**: `200 OK` with `{ status: "live", service: "taskflow-api", version: "...", release: "..." }`.
- **Failure Action**: Container orchestrator restarts the container.

### 2. Readiness Probe (`GET /health/ready`)

- **Semantics**: "Can this instance serve user requests?"
- **Dependencies**: PostgreSQL connection pool reachability.
- **Decoupling**: External Python AI is **NOT** required for readiness. If AI is offline, core project, task, comment, and kanban traffic remains operational.
- **Expected Return**: `200 OK` when PostgreSQL is connected; `503 SERVICE_UNAVAILABLE` when database connection fails.
- **Failure Action**: Ingress router stops forwarding HTTP traffic to this container without terminating the process.

---

## 11. Production Smoke Tests

Automated smoke tests verify critical user journeys without making paid external AI API calls:

1. **Authentication & Session Lifecycle**:
   - User registration and login flow.
   - JWT access token generation and HTTP-only cookie persistence.
   - Logout and re-authentication verification.
2. **Multi-Tenant Containment & Workspaces**:
   - Organization creation and workspace navigation.
   - Project creation and key generation.
3. **Core Work Management**:
   - Task creation, status transition (TODO → IN_PROGRESS → DONE).
   - Real-time updates and persistence across session restart.
4. **Operations Dashboard & Entitlements**:
   - Project KPI dashboard loading.
   - Audit log viewing (admin authorized).
   - Usage plan metering display (`FREE` plan boundaries).
5. **AI Degradation Resilience**:
   - Upstream AI service returns 503; core task UI displays friendly warning without crashing or corrupting state.

---

## 12. Sentry & Observability Release Validation

When promoting a release, verify Sentry configuration:

1. **Release Association**:
   - Events are tagged with `taskflow-api@0.1.0-<git-sha>`.
   - Environment tagged with `production` or `staging`.
2. **Correlation ID Tracking**:
   - Every request generates `X-Request-ID` passed through error contexts and Sentry tags.
3. **Sensitive Data Scrubbing Checklist**:
   - [ ] No `Authorization: Bearer <token>` in event request headers.
   - [ ] No raw `eyJ...` JWT strings in breadcrumbs or messages.
   - [ ] No `postgresql://user:password@host` in database connection exceptions.
   - [ ] No passwords, session cookies, or refresh tokens in JSON request bodies.

---

## 13. Application Rollback Strategy

Use application rollback when a bug is detected in application code but the database schema remains backward compatible.

### Procedure

1. **Halt Promotion**: Stop traffic redirection to the new deployment.
2. **Identify Known-Good Release**: Retrieve previous immutable container tag (e.g., `taskflow-api:c8a98ac`).
3. **Redeploy Container**: Update ECS task definition / Docker Compose to previous image tags:
   - `taskflow-api:<previous-sha>`
   - `taskflow-ai:<previous-sha>`
   - `taskflow-worker:<previous-sha>`
4. **Verify Health**:
   - Confirm `/health/live` returns 200.
   - Confirm `/health/ready` returns 200.
5. **Verify Diagnostics**: Confirm Sentry error rate drops to baseline and request processing resumes.
6. **Post-Incident Recording**: Record release SHA, rollback SHA, root cause, and operator timestamp.

---

## 14. Database Disaster Recovery Procedure

Database disaster recovery is an extraordinary operational procedure executed **ONLY** in the event of data corruption or a catastrophic destructive migration.

### Rules

- **NEVER** execute automatic destructive database restoration based on application health probes.
- **NEVER** overwrite the active production database in place without human approval.

### Procedure

1. **Isolate Database Traffic**:
   - Route ingress traffic to a maintenance page; stop API write traffic.
2. **Identify Target Backup**:
   - Locate pre-deployment backup receipt file (e.g., `taskflow_prod_predeploy_<sha>_<timestamp>.dump`).
3. **Restore to Isolated Recovery Target**:
   - Create isolated temporary database: `taskflow_recovery_<timestamp>`.
   - Execute `pg_restore` into the recovery target database.
4. **Validate Data Integrity**:
   - Execute verification queries verifying tenant records, projects, tasks, and audit integrity.
5. **Human Operator Decision Point**:
   - Designated Lead Database Administrator reviews integrity and signs off on database swap.
6. **Promote Recovered Database**:
   - Update `DATABASE_URL` in container configuration to point to the restored database.
7. **Redeploy Compatible Application Release**:
   - Deploy immutable image compatible with the restored schema.
8. **Run Full Smoke Validation**:
   - Execute end-to-end smoke test; resume public ingress.

---

## 15. AI Failure Handling

If the Python AI service experiences an outage or elevated latency:

1. **Circuit-Safe Fallback**:
   - Node API catches 503 or 504 timeouts gracefully; returns controlled error response without crashing.
2. **Atomic Quota Rollback**:
   - Any pre-allocated or reserved usage units are atomically compensated and refunded.
3. **Advisory Invariant**:
   - AI outputs are advisory proposals. The AI service **NEVER** has direct PostgreSQL credentials and cannot mutate tasks directly.
4. **Core Business Continuity**:
   - Project creation, task mutations, Kanban boards, and audit logging continue operating uninterrupted.

---

## 16. Background Worker Recovery

If the background job worker experiences failures:

1. **Durable Storage Invariant**:
   - Job queue records reside in PostgreSQL `jobs` table; jobs are never lost in memory.
2. **Transactional Leases (`SKIP LOCKED`)**:
   - Worker claims jobs using `FOR UPDATE SKIP LOCKED`. If worker process dies abruptly, PostgreSQL automatically releases row locks.
3. **Stale Lock Recovery**:
   - Jobs in `PROCESSING` status exceeding `WORKER_PROCESSING_TIMEOUT_MS` (30s) are recovered back to `PENDING`.
4. **Exponential Backoff & Dead-Letter**:
   - Failed jobs retry up to `maxAttempts` (default 3) with exponential backoff and jitter. Permanently failed jobs transition to `FAILED` status with recorded error codes.

---

## 17. Security Release Gates

Before authorizing public release, all PR33 security controls must be verified:

- [ ] **JWT Verification**: Strict HS256 algorithm enforcement; reject tampered signatures and missing `sub` claims.
- [ ] **Refresh Rotation**: Opaque UUIDs, hashed SHA-256 storage, family revocation on reuse detection.
- [ ] **Tenant Isolation**: Authoritative `organizationId` containment on all queries.
- [ ] **Parameter Precedence**: Route parameters take precedence; conflicting `X-Organization-ID` headers rejected with 400.
- [ ] **RBAC Enforcement**: Admin/Owner boundaries enforced; VIEWER role strictly read-only.
- [ ] **Mass Assignment Defense**: Clients forbidden from forging `SYSTEM` or `AI` audit sources.
- [ ] **CORS & Headers**: Explicit origins, Helmet headers active, wildcard rejected.
- [ ] **Error Sanitization**: Unhandled exceptions return generic `'Internal server error'` in production and staging.
- [ ] **Zero Bundled Secrets**: Frontend Vite build contains zero private keys or tokens.
- [ ] **Non-Root Containers**: `USER taskflow` enforced across all Dockerfiles.

---

## 18. TLS, Edge & Ingress Requirements

_Provider-neutral production infrastructure requirements to be fulfilled by hosting environment:_

- **TLS Termination**: Minimum TLS 1.2, recommended TLS 1.3 at ingress load balancer / CDN.
- **HTTP Redirection**: Automatic 301 redirect from HTTP (port 80) to HTTPS (port 443).
- **HSTS**: `Strict-Transport-Security` header with `max-age=31536000; includeSubDomains`.
- **Edge Rate Limiting**: Cloudflare / AWS WAF configured with Layer 7 IP rate limiting (500 req / 15 min per IP) to supplement in-process Express rate limiters.
- **Private Subnets**: Database and AI containers placed in private VPC subnets with zero public IP addresses.

---

## 19. Backup Retention, RPO & RTO

| Metric                             | Specification                                | Verification Status                         |
| ---------------------------------- | -------------------------------------------- | ------------------------------------------- |
| **Pre-Deployment Backup**          | Snapshot before every release                | **VALIDATED LOCALLY / IN CONTAINER**        |
| **Backup Verification**            | Restored into isolated database and verified | **VALIDATED LOCALLY**                       |
| **Daily Automated Backups**        | Daily `pg_dump` with 30-day retention        | **TO BE CONFIGURED BY PRODUCTION OPERATOR** |
| **Recovery Point Objective (RPO)** | Target: <= 1 hour in production              | **TO BE CONFIGURED BY PRODUCTION OPERATOR** |
| **Recovery Time Objective (RTO)**  | Target: <= 30 minutes in production          | **TO BE CONFIGURED BY PRODUCTION OPERATOR** |
| **Cross-Region Replication**       | Secondary cloud region snapshot copy         | **TO BE CONFIGURED BY PRODUCTION OPERATOR** |

---

## 20. Operator Release & Rollback Runbook

### Pre-Release Phase:

```bash
# 1. Run all deterministic preflight release gates
npm run release:production:validate

# 2. Run database migration consistency tests
npx tsx scripts/validate_migrations.ts

# 3. Create pre-deployment backup snapshot
npm run db:backup
```

### Deployment Phase:

```bash
# 4. Apply database migrations
npm run prisma:migrate

# 5. Start / update container services
docker compose -f docker-compose.staging.yml up -d

# 6. Verify health probes
curl -f http://localhost:5000/health/live
curl -f http://localhost:5000/health/ready
```

### Rollback Phase (If needed):

```bash
# Application Rollback (backward-compatible schema):
# Deploy previous container image
docker compose -f docker-compose.staging.yml up -d --no-deps taskflow-api

# Confirm health after rollback:
curl -f http://localhost:5000/health/ready
```
