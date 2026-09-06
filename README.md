# TaskFlow

**TaskFlow** is an enterprise-grade, multi-tenant project operations SaaS platform engineered for engineering and product delivery teams. It combines deterministic project governance—hierarchical work breakdown, interactive Kanban, Directed Acyclic Graph (DAG) dependency modeling, milestone progress tracking, and authoritative project delivery health telemetry—with focused, advisory AI intelligence that synthesizes risk radars, breaks down complex tasks, and proposes human-approved task actions.

TaskFlow is architected around an authoritative **modular monolith** application tier backed by **PostgreSQL**, with a dedicated internal **Python AI microservice** strictly isolated from the database and public network.

---

## What TaskFlow Does

Modern engineering teams struggle with disconnected project tools that either act as passive task lists or rely on black-box, unpredictable AI automations. TaskFlow bridges this gap:

- **Authoritative Determinism**: Calculates milestone progress, delivery risk scores, blocker clusters, and dependency cycles deterministically in server-side TypeScript.
- **Advisory AI Assistance**: Leverages LLMs strictly for qualitative tasks—synthesizing project summaries, evaluating execution blockers, generating child subtasks, and proposing actionable task updates.
- **Human-in-the-Loop Safety**: Proposes structured state mutations (status, priority, due date, assignee) with visual diffs, requiring explicit human approval and compare-and-swap validation before applying any change to live data.
- **Enterprise Multi-Tenancy**: Enforces strict organization-scoped tenant isolation, dual-tier Role-Based Access Control (RBAC), cryptographic refresh token rotation, and append-only audit event logging.

---

## Core Features

### 1. Workspaces & Tenant Governance

- **Multi-Tenant Organizations**: Complete data and member isolation across workspaces.
- **Dual-Tier RBAC**:
  - Organization Roles: `OWNER`, `ADMIN`, `MEMBER`, `GUEST` (with last-owner protection).
  - Project Roles: `LEAD`, `ADMIN`, `MEMBER`, `VIEWER` (with strict read-only VIEWER enforcement).
- **Stateless Authentication**: 15-minute HS256 JWTs with cryptographic refresh token rotation, token reuse detection, and session family revocation.

### 2. Project Operations & Kanban Execution

- **Project Lifecycle Management**: Unique project keys (`PROJ`), statuses (`PLANNING`, `ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED`), and project-level member assignment.
- **Hierarchical Tasks & Subtasks**: Sequential issue keys (`PROJ-1`), priorities (`URGENT`, `HIGH`, `MEDIUM`, `LOW`, `NONE`), statuses (`BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `BLOCKED`, `DONE`, `CANCELLED`), due dates, and ordered child subtasks.
- **Interactive Kanban Board**: Visual status columns with drag-and-drop mechanics, quick status moves, priority filtering, and optimistic UI updates.
- **Project Taxonomy**: Custom project-scoped labels with hex colors and multi-label filtering.

### 3. Dependencies & Milestones

- **DAG Dependency Graph**: Directed relationships (`BLOCKS`, `BLOCKED_BY`, `RELATES_TO`).
- **Cycle Detection**: Depth-first graph traversal preventing circular dependencies (rejects with 409 Conflict).
- **Blocker Resolution**: Automatic propagation of blocked task states and auto-unblocking when predecessors complete.
- **Milestones**: Target dates, task linkage, progress calculation, and deterministic health states (`ON_TRACK`, `AT_RISK`, `CRITICAL`).

### 4. Collaboration & Productivity

- **Threaded Task Comments**: Real-time collaboration with author-restricted editing and soft deletion.
- **Activity Timelines**: Chronological project and task event streams linked to the authoritative audit log.
- **Notification Feed**: Real-time assignment, mention, and dependency blocker notifications with user preference controls.
- **My Work Queue**: Personalized task aggregation grouped by urgency, due date, and blocking status.
- **Global Search & Command Palette**: Keyboard-first (`Cmd+K` / `Ctrl+K`) fuzzy search across organizations, projects, tasks, and users with query bounds.

### 5. Project Command Center (PR14 Telemetry)

- **Authoritative Health Engine**: Computes deterministic health scores (0-100) and delivery states (`ON_TRACK`, `AT_RISK`, `OFF_TRACK`).
- **Delivery Risk Radar**: Identifies overdue critical-path tasks, unassigned blockers, and stagnant in-review items.
- **Distribution Metrics**: Visual task distributions by status, priority, and milestone rollups.

### 6. Advisory AI Subsystems

- **Project Intelligence (`PROJECT_INSIGHT`)**: Grounded executive synthesis and categorized recommendations (`BLOCKER`, `DELIVERY_RISK`, `MILESTONE`, `WORKLOAD`, `PROCESS`).
- **Task Intelligence (`TASK_SUMMARY`)**: Blocker impact analysis and execution advice.
- **Task Decomposition (`TASK_DECOMPOSITION`)**: Breaks complex requirements into bounded, ordered child subtasks.
- **Human-Approved Task Actions (`TASK_ACTIONS`)**: Structured state change proposals requiring human review and compare-and-swap stale state guards (`expectedCurrentState`).

### 7. SaaS Entitlements & Background Jobs

- **Tiered Plans (`FREE`, `PRO`, `BUSINESS`)**: Automated quotas on members, projects, active tasks, and period AI requests.
- **Durable Background Jobs**: PostgreSQL-backed queue using `FOR UPDATE SKIP LOCKED`, exponential backoff with jitter, stale worker recovery, and graceful shutdown.
- **Append-Only Audit Trail**: Immutable security event logging capturing authentication, administrative, and AI lifecycle events.

---

## Architecture

TaskFlow operates as a **hardened modular monolith** with an isolated **internal AI service**:

```
+-----------------------------------------------------------------------------------------+
|                                  CLIENT (Single-Page App)                               |
|            React 18 • TypeScript • Vite • Tailwind CSS • shadcn/ui • TanStack Query     |
+--------------------------------------------+--------------------------------------------+
                                             |
                              HTTPS / REST   |   WSS (Socket.IO)
                                             v
+-----------------------------------------------------------------------------------------+
|                              AUTHORITATIVE CORE MONOLITH                                |
|                   Node.js 20+ • Express • TypeScript • Prisma ORM • Helmet              |
|                                                                                         |
|  [ Auth / Sessions ]    [ Workspaces / RBAC ]    [ Projects / Tasks ]   [ Kanban Board ]|
|  [ DAG Dependencies ]   [ Milestones / Health ]  [ Real-Time Events ]   [ Global Search]|
|  [ Notifications ]      [ Immutable Audit ]      [ SaaS Entitlements ]  [ Job Worker ]  |
+---------------------+---------------------------------------+---------------------------+
                      |                                       |
        Prisma / SQL  |                       Internal HTTP   | (Signed Bearer Token)
                      v                                       v
+---------------------------------+       +-----------------------------------------------+
|       PERSISTENCE TIER          |       |            INTERNAL AI SUBSYSTEM              |
|        PostgreSQL 16+           |       |         Python 3.13 • FastAPI • Pydantic v2   |
|                                 |       |                                               |
|  • Authoritative Domain State   |       |  • Bounded Context Only (Zero Database Access)|
|  • Tenant Foreign Keys          |       |  • Dual Input/Output Validation               |
|  • FOR UPDATE SKIP LOCKED Queue |       |  • Advisory Proposal Generation Only          |
+---------------------------------+       +-----------------------+-----------------------+
                                                                  |
                                                     Async HTTPS  | (External Provider)
                                                                  v
                                                  +-------------------------------+
                                                  |          OpenAI API           |
                                                  |     GPT-4o / GPT-4o-mini      |
                                                  +-------------------------------+
```

### Architectural Invariants:

1. The browser client **NEVER** communicates directly with Python AI.
2. Python AI **NEVER** accesses PostgreSQL or holds database connection strings.
3. PostgreSQL is the authoritative single source of truth for all domain state.
4. AI recommendations are strictly advisory; domain mutations require explicit human approval.
5. Deterministic project health calculations remain authoritative and uncompromised by LLM hallucination.
6. Zero external message brokers (Redis/Kafka) are required for v1.0; PostgreSQL provides ACID-compliant background queuing.

---

## Technology Stack

| Layer                     | Technologies                                                                                                        |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------ |
| **Frontend Client**       | React 18, TypeScript, Vite 6, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, Recharts, Lucide Icons |
| **Authoritative Backend** | Node.js 20+, Express 4, TypeScript, Prisma ORM 6, bcrypt, jsonwebtoken, express-rate-limit, Helmet, Supertest       |
| **AI Subsystem**          | Python 3.13, FastAPI, Pydantic v2, AsyncOpenAI SDK, pytest, httpx, Ruff                                             |
| **Database**              | PostgreSQL 16+ (tested on PostgreSQL 18)                                                                            |
| **Observability**         | Sentry (`@sentry/react`, `@sentry/node`, `sentry-sdk[fastapi]`) with PII scrubbing and request correlation          |
| **Infrastructure**        | Docker, Docker Compose (Base & Staging topologies), GitHub Actions CI                                               |
| **Asset Storage**         | Cloudinary SDK with strict HTTPS URL sanitization                                                                   |
| **API Contracts**         | OpenAPI 3.1, Swagger UI, SwaggerParser formal validation                                                            |

---

## AI Architecture & Guardrails

TaskFlow approaches AI as an **advisory intelligence layer** rather than an autonomous decision maker:

- **Zero Hallucinated Metrics**: The Python AI service receives pre-computed deterministic health scores from Express. Prompts instruct models not to contradict or recalculate authoritative numbers.
- **Prompt Injection Fencing**: Untrusted user text (task descriptions, titles, comments) is fenced with Markdown/XML isolation boundaries to prevent prompt escape attacks.
- **Dual Validation**: Payloads are validated by Pydantic v2 on ingress/egress in Python, and by Zod in Node.js before delivery to the frontend.
- **Compare-and-Swap Action Safety**: Task action proposals record `expectedCurrentState`. When an operator clicks "Approve", Express verifies that the live database state still matches the snapshot, rejecting stale actions with 409 Conflict.
- **Decoupled Availability**: API readiness probes check PostgreSQL connection vitality without failing on external OpenAI outages.

---

## Security

- **Authentication**: Stateless 15-minute HS256 JWTs with opaque SHA-256 hashed refresh tokens stored in PostgreSQL.
- **Session Security**: Refresh token rotation with family revocation on reuse detection; HTTP-only secure cookie transport.
- **Tenant Isolation**: Server-enforced query containment; every repository query scopes to `organizationId`.
- **RBAC**: Dual-tier enforcement across organizations and projects; parameter precedence guards prevent ID mismatch abuse.
- **Fail-Closed Secrets**: Staging and production configurations fail fast if secrets are under 32 characters, if default credentials are used, or if wildcard CORS is configured.
- **Input Sanitization**: Parameterized Prisma queries (zero SQL injection), strict 100KB JSON body caps, and Zod schema parsing.
- **Sentry Data Scrubbing**: Automated stripping of passwords, authorization headers, cookies, and database URLs in telemetry events.

---

## Testing

TaskFlow is verified by a multi-layered automated test matrix achieving a **100% pass rate**:

| Suite                        | Runner         | Scope                                          |            Results            |
| :--------------------------- | :------------- | :--------------------------------------------- | :---------------------------: |
| **Core REST API**            | Vitest         | 36 test files                                  |     **675 / 675 PASSED**      |
| **Python AI Subsystem**      | Pytest         | 9 test files                                   |      **76 / 76 PASSED**       |
| **Browser E2E Automation**   | Playwright     | 13 test files                                  |      **22 / 22 PASSED**       |
| **Deterministic AI Eval**    | Python Runner  | 4 operations                                   |      **12 / 12 PASSED**       |
| **Release Preflight Gates**  | tsx CLI Engine | 3 preflight scripts                            |      **52 / 52 PASSED**       |
| **Database Migration Drill** | tsx CLI Engine | Clean install & upgrade paths                  |          **PASSED**           |
| **Backup & Restore Drill**   | tsx CLI Engine | Real `pg_dump` & `pg_restore` on PostgreSQL 18 |          **PASSED**           |
| **TOTAL**                    | —              | —                                              | **837+ / 837+ PASSED (100%)** |

---

## Observability

- **Unified Request Correlation**: `X-Request-ID` middleware injects unique UUIDs tracing requests across Express, PostgreSQL logs, Python AI, and Sentry events.
- **Sentry Integration**:
  - Frontend: `@sentry/react` error boundary with sanitized breadcrumbs.
  - Backend: `@sentry/node` capturing unexpected 5xx errors while filtering expected 4xx operational errors.
  - AI Service: `sentry-sdk[fastapi]` capturing provider timeouts and 502 bad gateway errors.
- **Health Probes**:
  - `/health/live`: Lightweight process liveness probe without database/AI dependencies.
  - `/health/ready`: Authoritative readiness probe validating PostgreSQL connection pool responsiveness.

---

## Local Development

### Prerequisites

- **Node.js**: `>= 20.0.0`
- **npm**: `>= 10.0.0`
- **Python**: `>= 3.12` (tested with Python 3.13)
- **PostgreSQL**: `>= 16.0` (or Docker)

### 1. Clone & Install Monorepo Dependencies

```bash
git clone https://github.com/giteshchaudhari681-art/TaskFlow.git
cd TaskFlow
npm install
```

### 2. Configure Python Virtual Environment

```bash
cd apps/ai
python -m venv .venv

# Windows:
.\.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cd ../..
```

### 3. Initialize Environment & Database

```bash
# Copy root and workspace environment configurations
cp .env.example .env

# Run Prisma migration and seed sample workspace data
npm run prisma:migrate
npm run prisma:seed
```

### 4. Run Development Services Concurrently

In separate terminal sessions:

```bash
# Terminal 1: Express REST API (http://localhost:5000)
npm run dev:api

# Terminal 2: Web Frontend SPA (http://localhost:5173)
npm run dev:web

# Terminal 3: Python AI Service (http://127.0.0.1:8000)
cd apps/ai
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 4 (Optional): Background Job Worker
npm run dev:worker
```

---

## Environment Configuration

TaskFlow validates all environment variables at startup using strict Zod schemas:

| Variable           | Description                                                          | Default / Example                                                          |
| :----------------- | :------------------------------------------------------------------- | :------------------------------------------------------------------------- |
| `NODE_ENV`         | Runtime environment (`development`, `test`, `staging`, `production`) | `development`                                                              |
| `PORT`             | API server listen port                                               | `5000`                                                                     |
| `DATABASE_URL`     | PostgreSQL connection string with schema parameter                   | `postgresql://postgres:postgres@localhost:5432/taskflow_dev?schema=public` |
| `JWT_SECRET`       | HMAC-SHA256 secret for signing access tokens (≥32 chars in prod)     | _(Dev default provided)_                                                   |
| `COOKIE_SECRET`    | Secret for signing HTTP-only session cookies (≥32 chars in prod)     | _(Dev default provided)_                                                   |
| `AI_SERVICE_URL`   | Internal HTTP address of the Python AI service                       | `http://127.0.0.1:8000`                                                    |
| `AI_SERVICE_TOKEN` | Secret bearer token authenticating Express to Python AI              | `taskflow-internal-dev-token`                                              |
| `CORS_ORIGIN`      | Authorized frontend origin (rejects `*` in staging/production)       | `http://localhost:5173`                                                    |
| `OPENAI_API_KEY`   | External OpenAI API key for Python AI subsystem                      | `sk-...` _(Optional for non-AI tests)_                                     |
| `SENTRY_DSN`       | Sentry project DSN for error telemetry                               | _(Optional)_                                                               |

---

## Database / Migrations

TaskFlow uses Prisma ORM with standard forward migrations located in `apps/api/prisma/migrations/`:

```bash
# Validate Prisma schema
npm run prisma:validate

# Format Prisma schema
npm run prisma:format

# Apply migrations to development database
npm run prisma:migrate

# Seed database with sample organization, users, projects, and tasks
npm run prisma:seed

# Execute automated clean-install and upgrade migration validation
npx tsx scripts/validate_migrations.ts

# Execute real PostgreSQL backup & restore drill (pg_dump / pg_restore)
npm run db:backup:smoke
```

---

## Docker

TaskFlow provides complete containerized orchestration for development and staging:

### Development Topology

```bash
# Build and start PostgreSQL, Python AI, and Express API
docker compose up -d --build

# Inspect container status
docker compose ps

# View service logs
docker compose logs -f taskflow-api taskflow-ai

# Stop containers
docker compose down
```

### Staging Topology (Isolated Network, Zero Published Internal Ports)

```bash
# Validate staging compose syntax and schema
docker compose -f docker-compose.staging.yml config --quiet

# Execute staging deployment preflight check
npm run staging:preflight
```

---

## API Documentation

Interactive Swagger UI explorers and OpenAPI 3.1 specifications are automatically served:

- **Public REST API Explorer**: [http://localhost:5000/docs](http://localhost:5000/docs)
- **Public OpenAPI 3.1 JSON**: [http://localhost:5000/openapi.json](http://localhost:5000/openapi.json)
- **Internal AI OpenAPI JSON**: [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)

---

## Production Readiness

TaskFlow enforces strict pre-deployment gates before production release:

- **Immutable Release Identity**: Tags resolved to immutable git commit SHAs (e.g., `taskflow-api:2cb0388`).
- **Production Preflight Script**: `npm run release:production:validate` validates 24 operational and security gates.
- **Rollback Runbooks**: Four codified rollback procedures documented in [`docs/architecture/production-release-rollback.md`](docs/architecture/production-release-rollback.md).

---

## Known Limitations (v1.0)

1. **Process-Local Rate Limiting**: Express rate limiters use in-memory counters per instance; distributed multi-instance deployments require an edge WAF (Cloudflare/AWS WAF) or Redis-backed rate limiting (planned for v1.1).
2. **Cloud Infrastructure Requirement**: Staging and production configurations are validated locally via Docker Compose and preflight scripts; actual live cloud deployment requires human-operated staging/production infrastructure.
3. **External LLM Latency**: External OpenAI API calls introduce 1-3 second latency for qualitative synthesis; advisory responses are decoupled from core UI load paths.
4. **Transitive Dependency Advisories**: Minor advisories in dev/tooling dependencies (`deepmerge-ts` via Prisma CLI config) do not impact production runtime execution.

---

## Future Roadmap

- **v1.1**: Distributed Redis rate limiting, Stripe payment provider integration, Enterprise SAML/SSO, outbound webhook dispatch subsystem.
- **v2.0**: Dedicated Elasticsearch engine, cross-organization portfolio rollups, bidirectional GitHub/GitLab integration, autonomous multi-agent AI workflows.
- _Detailed roadmap documented in [`docs/architecture/v1-roadmap.md`](docs/architecture/v1-roadmap.md)._

---

## Project Status

**TaskFlow v1.0**

- **Feature Scope**: **COMPLETE & FROZEN**
- **Automated Quality**: **VALIDATED (837+ Tests, 100% Pass)**
- **Security**: **AUDITED & HARDENED**
- **AI Safety**: **VALIDATED (Zero Autonomous Mutations)**
- **Backup / Restore**: **VALIDATED IN CONTROLLED ENVIRONMENTS**
- **Production Deployment**: **REQUIRES HUMAN-OPERATED CLOUD INFRASTRUCTURE**
- **Live Staging**: **REQUIRES HUMAN-OPERATED CLOUD INFRASTRUCTURE**
- **Live Production**: **NOT EXECUTED**

---

## License

This project is licensed under the [MIT License](LICENSE).
