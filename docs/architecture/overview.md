# TaskFlow — System Architecture Overview

## High-Level Topology

```
+-----------------------------------------------------------------------+
|                            Client Tier                                |
|   React 18/19 SPA (Vite + TypeScript + Tailwind CSS + Lucide Icons)   |
|   TanStack Query (Server State) + React Hook Form + Zod               |
+-----------------------------------+-----------------------------------+
                                    |
                 +------------------+------------------+
                 | HTTPS / REST                        | WSS (Socket.IO)
                 v                                     v
+-----------------------------------------------------------------------+
|                    Primary Application Backend Server                 |
|   Node.js + Express + TypeScript (Modular Monolith)                   |
|   - Helmet Security Headers & CORS Controls                           |
|   - Rate Limiting (express-rate-limit)                                |
|   - Authentication & RBAC Middleware (JWT + Refresh Tokens)           |
|   - Zod Input & Query Validation Middleware                           |
|   - Layered Controller -> Service -> Repository Architecture          |
+-------+-------------------+------------------+----------------+-------+
        |                   |                  |                |
        v                   v                  v                v
+---------------+   +---------------+   +---------------+   +---------------+
|   Data Tier   |   | Real-Time Bus |   | File Storage  |   | Python AI Svc |
|  PostgreSQL   |   |   Socket.IO   |   |  Cloudinary   |   | FastAPI +     |
|  Prisma ORM   |   |  (WebSockets) |   | (Asset Host)  |   | Pydantic v2   |
+---------------+   +---------------+   +---------------+   +-------+-------+
                                                                    |
                                                                    v
                                                            +---------------+
                                                            |  OpenAI API   |
                                                            | (Provider SDK)|
                                                            +---------------+
```

## Architectural Principles & Paradigm

TaskFlow uses a **modular monolith** for its core application backend and introduces a focused Python service specifically for AI processing and validation.

TaskFlow is **NOT** a microservices architecture. It does not use Kafka, Redis, Kubernetes, service meshes, or an event bus. The architecture consists of:

1. **Primary Application Backend (Node.js/Express)**: The authoritative source of truth for user identities, organizations, workspaces, projects, tasks, kanban, milestones, dependencies, comments, activities, notifications, RBAC, tenant isolation, and PostgreSQL persistence.
2. **AI Processing Subsystem (Python/FastAPI)**: A dedicated, stateless service responsible for runtime Pydantic validation, prompt synthesis, LLM provider abstraction, and structured AI response delivery.

## Boundary Isolation & Security Rules

1. **Zero Client-Exposed Secrets**: Third-party credentials (OpenAI API key, Cloudinary API secret, Database connection string) are strictly stored in backend environment variables and never leaked to the client bundle.
2. **Authoritative Authorization Boundary**: Python does **NOT** independently determine whether a user can access a project or task. Node.js/Express verifies authentication, tenant isolation, and project RBAC, retrieves data from Prisma, and sends sanitized domain context to the AI service.
3. **Deterministic Project Health Precedence**: Project health states (`HEALTHY`, `AT_RISK`, `CRITICAL`, `NO_DATA`) and completion percentages are computed deterministically in Node.js (PR 14). AI provides qualitative summaries and strategic recommendations without altering deterministic health conclusions.
4. **Unified Validation Strategy**:
   - **Frontend & Express API**: Zod schemas (`@taskflow/validation`) and TypeScript types (`@taskflow/shared`).
   - **Python AI Service**: Pydantic v2 models (`app.models.requests`, `app.models.responses`).
5. **Internal Service Authentication**: Inter-service communication between Express and the Python AI service is secured via the `X-TaskFlow-Service-Token` header. Python rejects unauthenticated or invalid tokens with HTTP 401.
6. **Traceability & Correlation**: Every AI operation carries a traceable `request_id` passed or auto-generated at the service boundary to correlate execution telemetry.
7. **Container Orchestration (Docker)**: Multi-container local orchestration is managed via Docker Compose (`docker-compose.yml`), provisioning PostgreSQL (`postgres:16-alpine`), Python AI (`taskflow-ai`), and Node.js Express (`taskflow-api`) connected via a private bridge network (`taskflow-network`) with healthcheck readiness dependencies.
