# TaskFlow Product Roadmap & Scope Boundaries

This document formalizes the scope boundary for **TaskFlow v1.0** and defines the planned evolution for **v1.1** and **v2.0**. It serves as an architectural firewall against scope creep during release hardening.

---

## V1.0 — COMPLETE (Release Freeze)

The following capabilities are fully designed, implemented, tested, and validated in TaskFlow v1.0:

### 1. Core Platform & Multi-Tenancy

- [x] Multi-tenant organization isolation (`Organization`, `OrganizationMember`)
- [x] Dual-tier Role-Based Access Control (`UserRole`: OWNER, ADMIN, MEMBER, GUEST; `ProjectRole`: LEAD, ADMIN, MEMBER, VIEWER)
- [x] Owner safeguards (preventing last-owner deletion or downgrade)
- [x] User registration, login, logout, password change, and session revocation
- [x] Cryptographic refresh token rotation with family reuse detection and race resilience
- [x] HTTP-only secure cookie transport with zero access tokens stored in browser persistent storage

### 2. Project & Task Governance

- [x] Project CRUD, lifecycle states (PLANNING, ACTIVE, PAUSED, COMPLETED, ARCHIVED), and key prefixes
- [x] Task CRUD with deterministic sequence keys (`PROJ-1`), statuses (BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, BLOCKED, DONE, CANCELLED), and priorities
- [x] Subtask creation, reordering, and completion tracking
- [x] Interactive Kanban board with drag-and-drop column transitions and list views
- [x] Project-scoped labels and filtering
- [x] Directed Acyclic Graph (DAG) task dependencies (`BLOCKS`, `BLOCKED_BY`, `RELATES_TO`) with cycle detection
- [x] Milestones with target dates, progress rollups, and deterministic health evaluation (`ON_TRACK`, `AT_RISK`, `CRITICAL`)
- [x] Threaded task comments with editing and soft deletion
- [x] Project and task activity timelines

### 3. Intelligence & Command Center

- [x] Deterministic Project Command Center (PR14) computing authoritative project health scores, delivery risk radars, and blocker clusters
- [x] Isolated Python AI subsystem (FastAPI + Pydantic v2) with zero direct database access
- [x] AI Project Intelligence (`PROJECT_INSIGHT`): Grounded executive synthesis and categorized recommendations
- [x] AI Task Intelligence (`TASK_SUMMARY`): Blocker impact evaluation and execution advice
- [x] AI Task Decomposition (`TASK_DECOMPOSITION`): Breaking complex tasks into ordered subtasks
- [x] Human-Approved AI Task Actions (`TASK_ACTIONS`): Structured state change proposals requiring explicit human confirmation with compare-and-swap stale state guards
- [x] Prompt injection defenses and LLM hallucination guards

### 4. Enterprise SaaS Operations

- [x] Immutable, append-only security and operational audit log stream
- [x] Durable background jobs engine in PostgreSQL using `FOR UPDATE SKIP LOCKED` with exponential backoff and stale worker recovery
- [x] SaaS plan tiers (FREE, PRO, BUSINESS) with automated entitlement limits (members, projects, active tasks, AI requests per period)
- [x] Distributed request ID tracing (`X-Request-ID`) across frontend, API, worker, AI, and database
- [x] Multi-tier Sentry observability with PII scrubbing and 4xx noise filtering
- [x] Comprehensive OpenAPI 3.1 contracts with Swagger UI explorer
- [x] Automated pre-deployment backup drills (`pg_dump`/`pg_restore`) and documented rollback runbooks

---

## V1.1 — FUTURE (Post-v1.0 Enhancements)

The following items are deferred to v1.1. They represent operational enhancements and business integrations that are intentionally excluded from v1.0 to preserve architectural coherence:

### 1. Infrastructure & Scaling

- **Distributed Rate Limiting**: Migrate in-memory rate limiting counters to a shared Redis cluster for multi-instance horizontal scaling.
- **Read-Replica Query Routing**: Configure Prisma multi-datasource routing to offload heavy dashboard and search reads to read-replicas.
- **WebSocket Cluster Scaling**: Redis adapter for Socket.IO multi-node presence and event fanout.

### 2. Commercial Integrations

- **Payment Provider Integration**: Stripe / LemonSqueezy webhook integration for automated self-service plan upgrades and invoice management.
- **Customer Portal**: Self-service billing details, subscription cancellation, and payment method management.

### 3. Identity & Access

- **Enterprise Single Sign-On (SSO)**: SAML 2.0 and OpenID Connect (Okta, Azure AD, Google Workspace) identity provider integration.
- **Multi-Factor Authentication (MFA)**: Time-based One-Time Password (TOTP) verification.

### 4. Extensibility & Webhooks

- **Outbound Webhook Dispatch**: Configurable event webhooks for third-party automation (`task.created`, `task.completed`, `milestone.reached`).
- **Slack & Discord Bot Integrations**: Instant notification delivery to shared team channels.

---

## V2.0 — FUTURE / OPTIONAL (Major Platform Evolution)

- **Dedicated Search Engine**: Transition from PostgreSQL trigram full-text search to Elasticsearch or Meilisearch for high-scale enterprise search.
- **Advanced Portfolio Analytics**: Cross-organization executive portfolio rollups, velocity forecasting models, and Monte Carlo delivery simulations.
- **Bidirectional VCS Integration**: Automated GitHub/GitLab PR linking, branch creation from task keys, and commit-driven status transitions.
- **Autonomous Multi-Agent AI Workflows**: Long-running background AI agents capable of multi-step code repository analysis and test triage (under strict human oversight).
