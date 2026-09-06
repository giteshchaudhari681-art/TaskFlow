# TaskFlow v1.0 Complete Architecture Specification

## 1. System Overview

**TaskFlow** is an enterprise-grade, multi-tenant project operations SaaS platform engineered for product delivery and engineering teams. It marries rigorous deterministic project governance (Kanban, DAG dependency graphs, milestone progress rollups, deterministic delivery health telemetry) with advisory AI intelligence (project insight synthesis, task summarization, task decomposition, and human-approved task state actions).

TaskFlow is architected around a **hardened modular monolith** application tier backed by **PostgreSQL** as the authoritative single source of truth, complemented by a private, internal-only **Python AI microservice**.

```
+----------------------------------------------------------------------------------------------------+
|                                    CLIENT TIER (Single-Page App)                                   |
|               React 18 • TypeScript • Vite • Tailwind CSS • shadcn/ui • TanStack Query              |
+--------------------------------------------------+-------------------------------------------------+
                                                   |
                                    HTTPS / REST   |   WSS (Socket.IO)
                                                   v
+----------------------------------------------------------------------------------------------------+
|                                  AUTHORITATIVE APPLICATION MONOLITH                                |
|                        Node.js 20+ • Express • TypeScript • Prisma ORM • Helmet                    |
|                                                                                                    |
|  [ Auth & Sessions ]     [ Workspaces / RBAC ]   [ Project & Tasks ]    [ Kanban Board ]           |
|  [ DAG Dependencies ]    [ Milestones & Health ] [ Real-Time Events ]   [ Global Search ]          |
|  [ Notifications ]       [ Audit Log Stream ]    [ SaaS Entitlements ]  [ Durable Background Jobs] |
+------------------------+-------------------------------------------------+-------------------------+
                         |                                                 |
         Prisma / SQL    |                                 Internal HTTP   | (Signed Bearer Token)
                         v                                                 v
+------------------------------------+                 +---------------------------------------------+
|        PERSISTENCE TIER            |                 |         INTERNAL AI SUBSYSTEM               |
|         PostgreSQL 16+             |                 |       Python 3.13 • FastAPI • Pydantic v2   |
|                                    |                 |                                             |
|  • Strict Tenant Foreign Keys      |                 |  • Bounded In-Memory Execution              |
|  • ACID Multi-Model Schema         |                 |  • Zero Database Access                     |
|  • Row-Level Locking (FOR UPDATE)  |                 |  • Strict Schema Enforcement                |
|  • SKIP LOCKED Durable Queue       |                 |  • Advisory Proposal Generation Only        |
+------------------------------------+                 +----------------------+----------------------+
                                                                              |
                                                               Async HTTPS    | (External Provider)
                                                                              v
                                                               +-----------------------------+
                                                               |       OpenAI API            |
                                                               |  GPT-4o / GPT-4o-mini       |
                                                               +-----------------------------+
```

---

## 2. Core Architecture Principles

1. **Authoritative Single Source of Truth**: PostgreSQL is the sole authoritative store for all domain state. Node.js/Express is the sole authoritative business logic coordinator.
2. **Strict Component Boundaries**:
   - The browser client **NEVER** communicates directly with the Python AI service.
   - The Python AI service **NEVER** communicates with or queries PostgreSQL directly.
   - External LLMs **NEVER** directly modify application or database state.
3. **Deterministic Business Authority**:
   - Critical project health scores, milestone status, dependency cycle checks, and delivery risk levels are computed deterministically in TypeScript.
   - AI outputs are strictly qualitative and advisory; AI never calculates authoritative metric scores.
4. **Human-in-the-Loop AI Action Safety**:
   - Any AI recommendation that proposes changes to task properties (status, priority, due date, assignee) requires explicit human approval.
   - Proposals include `expectedCurrentState` conditions; if underlying state diverges between proposal and human approval, the action is rejected (compare-and-swap stale protection).
5. **Defense in Depth**:
   - Dual-tier validation: Python Pydantic input/output schemas, Node.js Zod request/response parsing, and TypeScript client typing.
   - Server-authoritative tenant isolation: every database query scopes to `organizationId`.
6. **Zero External Message Brokers for v1.0**:
   - Background jobs are durable directly in PostgreSQL using `FOR UPDATE SKIP LOCKED`.
   - No Redis, Kafka, RabbitMQ, or Celery is required for v1.0 operation, drastically reducing operational surface area while retaining transactional integrity.

---

## 3. Component Diagram & Request Flows

```
  [ Browser Client ]
          │
          │ 1. POST /api/v1/organizations/:orgId/projects/:projId/ai/analyze
          ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ TaskFlow Core API (Node.js/Express)                         │
  │  • requireAuth: Verifies JWT signature & session vitality    │
  │  • requireOrgRole & requireProjectRole: Checks RBAC         │
  │  • checkQuota: Verifies SaaS AI quota in PostgreSQL         │
  │  • ContextBuilder: Queries authoritative project/task state  │
  │  • Sanitizer: Masks sensitive fields, bounds task collection │
  └──────────────┬──────────────────────────────────────────────┘
                 │
                 │ 2. POST /ai/analyze (Internal Network, X-TaskFlow-Service-Token)
                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ TaskFlow AI Service (Python/FastAPI)                        │
  │  • verify_service_token: Authenticates internal caller      │
  │  • Pydantic Request Validation: Enforces shape & bounds     │
  │  • Prompt Assembly: Injects security delimiters             │
  │  • AsyncOpenAI: Executes structured prompt                  │
  │  • Pydantic Output Validation: Rejects hallucinated schemas │
  └──────────────┬──────────────────────────────────────────────┘
                 │
                 │ 3. Structured JSON Response (Proposals / Insights)
                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ TaskFlow Core API (Node.js/Express)                         │
  │  • Zod Validation: Validates incoming AI payload            │
  │  • Audit Logging: Emits AI_ANALYSIS_REQUESTED event         │
  │  • Quota Recording: Increments tenant AI usage              │
  └──────────────┬──────────────────────────────────────────────┘
                 │
                 │ 4. Client Response (Typed AIAnalysisResponse)
                 ▼
  [ Browser Client: Renders Advisory Intelligence / Human Review Modal ]
```

---

## 4. Frontend Architecture

The frontend application (`apps/web`) is a single-page application built with:

- **React 18** with functional components and strict hooks.
- **Vite 6** providing rapid HMR and optimized production bundling.
- **Tailwind CSS & shadcn/ui**: Modern obsidian dark theme, consistent typography, responsive drawer/modal primitives.
- **TanStack Query (React Query)**: Declarative server-state caching, automatic invalidation, optimistic updates, and background refetching.
- **React Hook Form & Zod**: Typed form state management and synchronous client validation.
- **React Router 6**: Client-side protected route hierarchies with authentication loaders.
- **Recharts**: High-density interactive metric charts for project dashboard velocity and distribution.
- **Sentry React**: Error boundary integration capturing unhandled frontend errors with PII scrubbing.

Key architectural boundaries in the frontend:

- State is strictly decoupled between local UI state (modals, drawer tabs, active filters) and server cache state (projects, tasks, audit logs).
- API client (`src/lib/api.ts`) automatically intercepts 401 responses, attempts refresh token exchange, and replays failed requests without losing user state.
- No secrets or private environment tokens are ever embedded in client JavaScript.

---

## 5. Backend Architecture

The backend application (`apps/api`) is a modular monolith structured across clean architectural layers:

- **Transport / Controller Layer** (`src/controllers/`): HTTP request parsing, status code selection, response envelope formatting, and error forwarding.
- **Routing & Middleware Layer** (`src/routes/`, `src/middleware/`): Route registration, authentication, role authorization, parameter precedence validation, rate limiting, request ID injection, and security headers.
- **Service Layer** (`src/services/`): Pure domain logic, transaction coordination, deterministic health calculations, and external client orchestration.
- **Repository Layer** (`src/repositories/`): Authoritative database access via Prisma ORM, row-level locking, and strict tenant containment.
- **Background Worker Subsystem** (`src/jobs/`, `src/services/job.worker.ts`): Standalone polling loop executing durable PostgreSQL jobs with graceful shutdown handling.

---

## 6. Database Architecture & Persistence

TaskFlow persists all relational state in **PostgreSQL 16+** managed through **Prisma ORM**:

### Entity Relationships

- **User** 1 ➔ N **OrganizationMember** N ➔ 1 **Organization**
- **User** 1 ➔ N **RefreshToken** (tracked token families with hash persistence)
- **Organization** 1 ➔ N **Project**
- **Project** 1 ➔ N **ProjectMember** N ➔ 1 **User**
- **Project** 1 ➔ N **Task** 1 ➔ N **Subtask**
- **Project** 1 ➔ N **Milestone**
- **Project** 1 ➔ N **Label**
- **Task** 1 ➔ N **TaskDependency** (Self-referencing DAG: `BLOCKS`, `BLOCKED_BY`, `RELATES_TO`)
- **Task** 1 ➔ N **Comment** (Threaded collaboration with soft delete)
- **Organization** 1 ➔ N **AuditEvent** (Append-only immutable event log)
- **Organization** 1 ➔ N **Job** (Durable background jobs table)
- **Organization** 1 ➔ 1 **OrganizationUsage** (SaaS billing period & usage counters)

### Indexing & Performance

- Composite indexes on `[organizationId, projectId]` across all child entities.
- Filter indexes on `[projectId, status]` and `[projectId, assigneeId]` for sub-10ms Kanban and list querying.
- Issue key uniqueness constraint: `@@unique([projectId, taskNumber])`.
- Partial index on `jobs([status, availableAt])` optimizing `FOR UPDATE SKIP LOCKED` claiming.

---

## 7. Authentication

TaskFlow implements an enterprise-grade, stateless session architecture:

- **Access Tokens**: Short-lived JWTs (15 minutes) signed with HMAC-SHA256 (`HS256`).
- **Refresh Tokens**: Opaque cryptographic random strings (64 characters) hashed with SHA-256 before storage in PostgreSQL. Transmitted strictly via `httpOnly`, `secure`, `SameSite=Lax` cookies.
- **Refresh Rotation & Family Revocation**: Every refresh request produces a fresh token and invalidates the old one. If an already-rotated token is presented (token reuse), the entire token family is immediately revoked, forcing re-authentication across all devices.
- **Concurrent Refresh Race Protection**: Bounded grace-period handling prevents false reuse triggers during simultaneous browser tab requests.
- **Password Hashing**: `bcrypt` with salt round factor 12.

---

## 8. Authorization & Role-Based Access Control (RBAC)

TaskFlow implements dual-tier authorization:

### 1. Organization-Level RBAC

- **OWNER**: Complete administrative authority, member management, organization deletion, plan upgrades. Last-owner safeguard prevents deletion or downgrade of the sole organization owner.
- **ADMIN**: User invitations, member role updates, project provisioning, organization audit log viewing.
- **MEMBER**: Standard collaborative access to assigned projects and tasks.
- **GUEST**: Restricted read-only view.

### 2. Project-Level RBAC

- **LEAD**: Project settings management, milestone definitions, AI intelligence configuration.
- **ADMIN**: Project-level member management and task governance.
- **MEMBER**: Task creation, editing, dependency linking, comment authoring.
- **VIEWER**: Strict read-only access. Mutation endpoints reject VIEWER attempts with 403 Forbidden.

---

## 9. Tenant Isolation Invariants

Tenant isolation is enforced strictly at the database query level:

- Every query selecting, inserting, updating, or deleting resources requires an explicit `organizationId` filter.
- Parameter precedence guards: If a request specifies an `organizationId` in route parameters and an entity ID in another parameter, repository queries enforce that the entity is contained within that specific organization.
- Cross-tenant ID references (e.g., trying to link a task in Org A to a dependency in Org B, or assigning a task in Org A to a user not belonging to Org A) are rejected with 404 or 403.

---

## 10. Task & Project Domain

- **Hierarchical Keying**: Projects define a 2-6 character uppercase prefix (e.g., `PROJ`). Tasks receive deterministic sequence numbers (`PROJ-1`, `PROJ-2`).
- **Task Lifecycle**: `BACKLOG` ➔ `TODO` ➔ `IN_PROGRESS` ➔ `IN_REVIEW` ➔ `BLOCKED` ➔ `DONE` / `CANCELLED`.
- **Soft Deletion & Archival**: Tasks and projects support archival with full restore capability. Completed tasks and archived projects retain historical audit records.
- **Subtasks**: Lightweight child work units with independent completion status and ordering.

---

## 11. Dependency Graph Engine (DAG)

- **Relationship Types**:
  - `BLOCKS`: Directed dependency. Task A blocks Task B.
  - `BLOCKED_BY`: Inverse traversal view of `BLOCKS`.
  - `RELATES_TO`: Non-blocking associative link.
- **Cycle Detection**: Adding a `BLOCKS` dependency triggers depth-first graph traversal. If adding edge A ➔ B would create a cycle (e.g., B ➔ ... ➔ A), the request is rejected with 409 Conflict.
- **Blocker Propagation**: If Task A has status `TODO` or `IN_PROGRESS` and blocks Task B, Task B is marked as blocked. When Task A completes (`DONE`), blocking resolution events trigger automatically.

---

## 12. Milestone Engine

- **Target Dates**: Milestones define target completion dates.
- **Deterministic Health**:
  - `ON_TRACK`: Progress meets time elapsed.
  - `AT_RISK`: Less than 50% complete with under 25% schedule time remaining.
  - `CRITICAL`: Milestone has reached target date with open tasks remaining.
- **Progress Tracking**: Completion percentage calculated deterministically from member tasks.

---

## 13. Deterministic Dashboard & Health Engine

The Project Command Center (PR14) computes authoritative project delivery telemetry entirely deterministically:

- **Project Health Score (0-100)**: Computed from task completion rates, blocker cluster density, and overdue task ratios.
- **Health State**: `ON_TRACK` (score ≥ 75), `AT_RISK` (score 50-74), `OFF_TRACK` (score < 50).
- **Delivery Risk Radar**: Evaluates overdue critical-path tasks, unassigned blocking work, and stagnant in-review items.
- **Telemetry Boundaries**: Authoritative scores are calculated server-side; the AI engine is provided these scores as bounded context and does not invent alternative health statuses.

---

## 14. Global Search & Command Palette

- Search operates across Organizations, Projects, Tasks, and Users within tenant boundaries.
- Uses PostgreSQL trigram indexes (`pg_trgm`) and full-text search vectors.
- Clamped query bounds (maximum 100 entities returned) to prevent query pressure abuse.
- Frontend keyboard shortcuts (`Cmd+K` / `Ctrl+K`) provide instant workspace-wide navigation.

---

## 15. Notification & Work Queue Engine

- **In-App Notification Stream**: Emits notifications on task assignment, dependency blockers, mention events, and status transitions.
- **Read State Tracking**: Individual read indicators and bulk mark-as-read.
- **Preferences**: Per-user notification toggles for assignment, mention, and blocker alerts.
- **My Work**: Aggregates tasks assigned to the current user partitioned by due date, urgency, and blocking state.

---

## 16. Background Jobs Subsystem

TaskFlow uses PostgreSQL as an ACID-compliant durable background queue:

- **Claiming**: Workers claim jobs via `SELECT ... FROM jobs WHERE status = 'PENDING' AND available_at <= NOW() ORDER BY available_at ASC FOR UPDATE SKIP LOCKED LIMIT 1`.
- **States**: `PENDING` ➔ `PROCESSING` ➔ `COMPLETED` / `FAILED`.
- **Retries & Backoff**: Exponential backoff with jitter on transient failures (maximum 3 attempts).
- **Stale Job Recovery**: Crashed or timed-out workers are recovered automatically after 5 minutes of inactivity (`locked_at < NOW() - INTERVAL '5 minutes'`).
- **Graceful Shutdown**: Worker listens for `SIGTERM` and `SIGINT`, halts claiming, waits for in-flight jobs to complete (up to 10s grace period), and cleanly releases database connections.

---

## 17. AI Subsystem Architecture

The Python AI service (`apps/ai`) is an isolated microservice:

- **Framework**: FastAPI with Python 3.13.
- **Model Orchestration**: `AsyncOpenAI` client targeting OpenAI models (`gpt-4o`, `gpt-4o-mini`).
- **Runtime Constraints**:
  - Stateless execution; no database or cache storage.
  - Pydantic models validate all incoming context payloads.
  - Strict output parsing ensures LLM responses strictly conform to platform schemas.
  - If external OpenAI fails or times out, the service returns clean HTTP 502/504 errors without crashing.

---

## 18. AI Safety & Guardrails

- **Zero Direct State Mutation**: AI services return proposals; they cannot write to PostgreSQL.
- **Prompt Injection Defense**: Untrusted user inputs (task titles, descriptions, comments) are wrapped in XML/Markdown isolation fences with explicit system instructions prohibiting execution of user-supplied instructions.
- **Grounded Telemetry**: Prompts include pre-computed deterministic health metrics. The AI is instructed not to contradict or hallucinate authoritative project metrics.
- **Safe Fallbacks**: In case of LLM unavailability, the core platform functions normally; project dashboard metrics, Kanban boards, and task editing remain 100% operational.

---

## 19. AI Human Approval Workflow

For task-modifying actions (`TASK_ACTIONS`):

1. **Proposal Generation**: AI proposes specific actions (`UPDATE_STATUS`, `UPDATE_PRIORITY`, `UPDATE_DUE_DATE`, `ASSIGN_TASK`).
2. **Current State Snapshot**: Proposal records `expectedCurrentState` (e.g., `status: 'TODO'`, `priority: 'MEDIUM'`).
3. **Human Review**: Client displays visual proposal card showing current value ➔ proposed value with AI rationale.
4. **Compare-and-Swap Validation**: When user clicks "Approve", Express compares the task's live database state against `expectedCurrentState`.
   - If match: Action is applied transactionally and logged to audit table.
   - If diverged: Action is rejected with `STALE_AI_ACTION` error, preventing unintended overwrites.

---

## 20. Auditability & Security Events

TaskFlow maintains an immutable, append-only security and operational audit trail:

- **Tracked Actions**:
  - Authentication: `AUTH_LOGIN`, `AUTH_LOGOUT`, `AUTH_REFRESH_REUSE_DETECTED`, `AUTH_PASSWORD_CHANGED`.
  - Organization Governance: `ORGANIZATION_CREATED`, `ORGANIZATION_MEMBER_INVITED`, `ORGANIZATION_MEMBER_REMOVED`.
  - Project Governance: `PROJECT_CREATED`, `PROJECT_UPDATED`, `PROJECT_ARCHIVED`.
  - Task Operations: `TASK_CREATED`, `TASK_UPDATED`, `TASK_STATUS_CHANGED`, `TASK_ASSIGNED`.
  - AI Lifecycle: `AI_ANALYSIS_REQUESTED`, `AI_ACTION_PROPOSED`, `AI_ACTION_APPLIED`, `AI_ACTION_REJECTED`.
- **Actor Metadata**: Every record captures `actorUserId`, `actorType` (`USER`, `SYSTEM`, `AI`), `source` (`USER`, `SYSTEM`, `AI`, `AI_ASSISTED`), and `requestId`.

---

## 21. Observability & Telemetry

- **Sentry Integration**:
  - `@sentry/react`: Frontend client crash reporting with sanitized breadcrumbs.
  - `@sentry/node`: Core API exception tracking with request ID correlation.
  - `sentry-sdk[fastapi]`: Python AI service exception tracking.
- **Request ID Correlation**: Every incoming HTTP request receives or forwards a unique `X-Request-ID` header propagated across Express, PostgreSQL logs, Python AI, and Sentry events.
- **PII & Secret Scrubbing**: Sentry SDKs configure `before_send` hooks stripping JWTs, passwords, session cookies, database URLs, and bearer tokens.
- **Noise Filtering**: Operational 4xx responses (400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 429 rate limit) are excluded from Sentry error alerts.

---

## 22. File & Asset Storage

- **Cloudinary Integration**: Avatar images and task attachment metadata are coordinated via Cloudinary SDK.
- **URL Sanitization**: Attachment URLs are validated for protocol (`https:`) and authorized CDN domains.

---

## 23. API Contracts & OpenAPI 3.1

- Comprehensive OpenAPI 3.1 specification at `/openapi.json` and interactive Swagger UI at `/docs`.
- Formal schema validation verified via SwaggerParser.
- 59 unique path operations documented covering Health, Auth, Users, Organizations, Projects, Tasks, Subtasks, Labels, Dependencies, Milestones, Comments, Activity, Notifications, Work, Search, AI, and Entitlements.
- Internal AI service token (`X-TaskFlow-Service-Token`) is strictly omitted from public OpenAPI documentation.

---

## 24. Docker Topology

TaskFlow provides dual Docker Compose topologies:

1. **Development (`docker-compose.yml`)**:
   - `postgres`: Port 5432 published for host tool inspection.
   - `taskflow-ai`: Port 8000 published for local Python testing.
   - `taskflow-api`: Port 5000 published for client traffic.
2. **Staging / Production (`docker-compose.staging.yml`)**:
   - `postgres`: Zero published host ports (isolated to internal Docker network `taskflow-internal`).
   - `taskflow-ai`: Zero published host ports (isolated to internal Docker network).
   - `taskflow-worker`: Zero published host ports (runs as headless queue processor).
   - `taskflow-api`: Port 5000 published as sole ingress point.
   - All application containers run as unprivileged user `USER taskflow`.

---

## 25. CI/CD Pipeline

Automated GitHub Actions workflow (`.github/workflows/ci.yml`) validates every PR:

1. **Linting & Code Style**: Prettier formatting check, Ruff Python linter/formatter.
2. **Type Checking**: TypeScript `tsc --noEmit` across all 4 monorepo workspaces.
3. **Build Validation**: Full compilation of shared packages, API, and web frontend bundle.
4. **Database & Migrations**: Prisma schema validation, migration consistency check.
5. **Automated Test Suites**: Vitest unit/integration suite (675 tests), Pytest suite (76 tests), Deterministic AI evaluation suite.
6. **Preflight Gates**: Deterministic release preflight and staging configuration validation.

---

## 26. Backup & Disaster Recovery

- **Tooling**: `scripts/db_backup_restore_smoke.ts` implements automated, non-destructive backup and restore drills.
- **PostgreSQL Native Tooling**: Uses `pg_dump` with `--lock-wait-timeout=10s` and `--format=custom` for point-in-time consistency.
- **Restore Verification**: Restores into isolated target databases, verifying schema integrity, row counts, and foreign key constraints before discarding temporary verification databases.
- **Operational Cadence**: Documented in [`docs/architecture/production-release-rollback.md`](production-release-rollback.md).

---

## 27. Rollback Strategy

Four distinct rollback runbooks are codified:

1. **Application Rollback**: Reverts container image to previous immutable git SHA when database migrations are backward-compatible.
2. **Database Disaster Recovery**: Restores verified pre-deployment pg_dump snapshot into fresh database instance if migration was destructive.
3. **Degraded AI Drain**: Disables AI feature flags or restarts Python container without impacting core project management features.
4. **Worker Queue Recovery**: Drains and resets processing jobs during queue deadlock or worker crash.

---

## 28. Security Model

- **Fail-Closed Configuration**: In staging/production, missing or weak secrets (<32 characters), default database credentials, or wildcard CORS reject startup immediately.
- **Rate Limiting**:
  - Global API rate limiter: 500 requests per 15 minutes.
  - Authentication limiter: 30 requests per 15 minutes in staging/production.
- **HTTP Security Headers**: `helmet` configured with strict CSP, HSTS, frameguard, and MIME sniffing protection.
- **Request Body Limits**: JSON payloads capped at 100KB (extended to 10MB only on designated file upload routes).

---

## 29. Testing Strategy

Multi-layered automated verification:

1. **Unit & Integration Testing (Vitest)**: 675 tests across 36 test files in `@taskflow/api`.
2. **Python AI Testing (Pytest)**: 76 tests covering FastAPI routes, Pydantic schemas, and Sentry monitoring.
3. **Deterministic AI Evaluation**: 12 deterministic test assertions verifying structural validity, grounding, bounded output, and injection defense.
4. **End-to-End Testing (Playwright)**: 22 browser automation tests covering full user authentication, project creation, Kanban drag-and-drop, dashboard telemetry, AI task analysis, and entitlement limits.
5. **Database Migration Drills**: Automated verification of clean installation and forward-upgrade migration paths.

---

## 30. Scalability Boundaries

- **Multi-Tenant Sharding Boundary**: Current v1.0 architecture uses a single PostgreSQL database with logical tenant isolation (`organizationId`). Scale ceiling is reached when database IOPS or table sizes exceed single-node vertical scaling.
- **Queue Throughput**: PostgreSQL `FOR UPDATE SKIP LOCKED` worker comfortably processes up to 200 jobs/second without table bloat under periodic vacuuming.
- **AI Processing**: Python microservice can be scaled horizontally behind an internal load balancer without database coordination.

---

## 31. Known Limitations (v1.0)

1. **Process-Local Rate Limiting**: Express rate limiters use in-memory counters per instance; distributed multi-instance deployments require Redis or edge WAF rate limiting.
2. **Real Staging & Production Verification**: Infrastructure configurations are validated locally via Docker Compose and preflight scripts; actual live cloud deployment requires human-operated staging/production infrastructure.
3. **External LLM Latency**: External OpenAI API calls introduce 1-3 second latency for qualitative synthesis; advisory responses are decoupled from core UI load paths.
4. **Transitive Dependency Advisories**: Minor advisories in dev/tooling dependencies (`deepmerge-ts` via Prisma CLI config) do not impact production runtime execution.

---

## 32. Future v1.1 Directions

- Distributed Redis rate limiting and token cache.
- Billing provider integration (Stripe / LemonSqueezy) for automated plan upgrades.
- Enterprise SSO (SAML 2.0 / Okta / Azure AD).
- Webhook dispatch subsystem for outbound third-party integrations (Slack / GitHub / Jira).
- Advanced full-text search infrastructure (Elasticsearch / Meilisearch).
- Read-replica database routing for read-heavy analytical dashboards.
