# TaskFlow — Python AI Service Architecture Blueprint

## 1. Overview & Architectural Role

TaskFlow uses a **modular monolith** for its core application backend and introduces a focused Python service specifically for AI processing and validation.

TaskFlow is **NOT** a microservices architecture. It does not introduce Kafka, Redis, Kubernetes, service meshes, or distributed transaction coordinators.

```
Client (React SPA)
       │
       ▼
Node.js / Express API (Primary Backend & Authoritative Boundary)
       ├── PostgreSQL (Prisma ORM)
       ├── Cloudinary (File Storage)
       ├── Socket.IO (Real-Time WebSocket Events)
       └── Python AI Service (Internal AI Processing Boundary)
                   │
                   ▼
                Pydantic v2 Runtime Validation
                   │
                   ▼
                OpenAI Provider (Official Python SDK)
```

---

## 2. Core Architectural Decisions

### Why Python was Introduced

While TypeScript and Node.js excel at high-concurrency web I/O, relational database access, WebSocket streaming, and REST API management, the AI/LLM ecosystem is overwhelmingly developed, benchmarked, and maintained first in Python. Introducing Python creates a stable foundation for advanced prompt engineering, evaluation harnesses, synthetic data generation, and future AI workflows without destabilizing the core TypeScript application.

### Why Pydantic was Selected

Pydantic provides strongly typed runtime validation and structured contracts for the Python AI service. It ensures strict type coercion, field constraints (such as non-negative task metrics and bounded progress percentages), and predictable response envelopes. While OpenAI JSON mode ensures that the upstream model responds with valid JSON-formatted output, Pydantic performs the critical application-level schema validation on that output before returning data to the backend.

### Why Node.js Remains the Primary Backend

Node.js/Express remains the authoritative source of truth for:

- User identities, sessions, and passwords (bcrypt, JWT)
- Multi-tenant organization boundaries and workspace settings
- Project membership and granular RBAC (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`)
- Tasks, dependencies, kanban transitions, and milestones
- PostgreSQL persistence and ACID transactions via Prisma
- Real-time client event broadcasting via Socket.IO

Python is **NOT** the database owner and has **zero direct database access**. Express retrieves authoritative data from PostgreSQL, applies tenant filtering, and passes a structured, sanitized context payload to Python.

---

## 3. Dual Validation Architecture: Zod vs Pydantic

TaskFlow maintains an intentional separation of validation responsibilities:

| Layer                      | Technology                       | Responsibility                                                                                |
| -------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| **Frontend & Express API** | **Zod** (`@taskflow/validation`) | Client-side form validation, API route parameter/body validation, tenant security boundaries. |
| **Python AI Subsystem**    | **Pydantic v2** (`app.models`)   | Strongly typed runtime validation and structured contracts for the Python AI service.         |

This avoids forcing TypeScript domain types into Python or replacing battle-tested Zod schemas in Express.

---

## 4. End-to-End Request Flow (PR 16)

```
1. Authenticated User triggers AI operation in TaskFlow
   │
2. Express verifies JWT session and resolves tenant context
   │
3. Express AIService checks RBAC:
   - OWNER, ADMIN, MEMBER: Allowed
   - VIEWER: Rejected (403 Forbidden)
   │
4. AIContextBuilder queries Prisma for project metadata, active tasks, milestones,
   and deterministic health metrics (sanitizes sensitive data)
   │
5. AIClient sends internal HTTP request to Python AI service:
   - Target: http://taskflow-ai:8000/ai/analyze (or localhost in local dev)
   - Headers: X-Request-ID, X-TaskFlow-Service-Token
   - Payload: AIAnalysisRequest
   │
6. Python FastAPI verifies internal service token and validates payload with Pydantic
   │
7. AIService delegates to OpenAIProvider -> AsyncOpenAI (with prompt synthesis & JSON mode)
   │
8. OpenAI returns JSON -> Pydantic validates AIAnalysisResponse structure
   │
9. Response returns to Express AIClient -> Express Controller -> JSON API envelope
```

---

## 5. Security & Boundary Isolation

1. **Internal Service Authentication**: Service-to-service communication is secured via the `X-TaskFlow-Service-Token` header. Python rejects unauthenticated or invalid tokens with HTTP 401.
2. **Zero Secret Exposure**: Third-party LLM credentials (`OPENAI_API_KEY`) and internal service tokens are kept strictly in backend environment configurations. They are never transmitted to the browser or returned in health endpoints.
3. **Authoritative Authorization**: Python never decides if a user has permission to view a project. Express is the sole authorization authority.
4. **Internal Network Binding**: In Docker, the Python service communicates across the internal Docker bridge network (`taskflow-network`). The browser never contacts the Python service directly.
5. **Sanitized Error Responses**: Upstream provider failures (rate limits, timeouts, authentication errors) return standardized error envelopes (`AI_PROVIDER_ERROR`, `AI_PROVIDER_NOT_CONFIGURED`) without exposing raw exceptions or stack traces.
6. **Correlation Tracking**: Every request carries a `request_id` (propagated from Express via `X-Request-ID` or generated) across both Node.js and Python.

---

## 6. Docker Architecture (PR 16)

TaskFlow provides a reproducible containerized development environment via Docker Compose:

```
Docker Compose
  ├── PostgreSQL 16 (postgres:16-alpine) [Named Volume: taskflow-postgres-data]
  ├── Node.js / Express API (Multi-stage Node 20 Alpine)
  └── Python AI Service (Python 3.13-slim with non-root taskflow user)
```

- **Healthcheck-Driven Startup**: `taskflow-api` depends on both `postgres` and `taskflow-ai` with `condition: service_healthy`.
- **Reproducibility**: Eliminates local environment mismatches while preserving the modular monolith architecture.

---

## 7. OpenAPI & Contract Hardening (PR 17)

TaskFlow maintains explicit separation of OpenAPI contracts across its two service boundaries:

| Boundary                   | Framework       | Specification Route | Documentation Explorer | Security Model                               | Audience                               |
| -------------------------- | --------------- | ------------------- | ---------------------- | -------------------------------------------- | -------------------------------------- |
| **Public Application API** | Express/Node.js | `/openapi.json`     | `/docs`, `/api/docs`   | Bearer JWT + HTTP-only cookie                | Frontend clients, external consumers   |
| **Internal AI Subsystem**  | FastAPI/Python  | `/openapi.json`     | `/docs`, `/redoc`      | `X-TaskFlow-Service-Token` (Internal header) | Backend engineers, service diagnostics |

### Contract Alignment Invariant

- **TypeScript**: `AIAnalysisRequest`, `AIAnalysisResponse`, `AIRecommendation`, `AIAttentionArea` in `@taskflow/shared`
- **Zod**: `aiAnalysisBodySchema`, `aiAnalysisParamsSchema`, `aiAnalysisResponseSchema` in `@taskflow/validation`
- **Python Pydantic**: `AIAnalysisRequest`, `AIAnalysisResponse`, `AIRecommendation`, `AIAttentionArea` in `app.models`
- **OpenAPI**: Reusable schemas in `openApiSpec.components.schemas`

OpenAPI documentation makes contracts discoverable and formally testable without changing service boundaries, data ownership, or authorization policies.

---

## 8. AI Project Intelligence & Grounded Recommendations (PR 20)

PR 20 introduces real user-facing AI project intelligence to the Project Command Center dashboard:

- **Strict Grounding**: Recommendations and attention areas are grounded in deterministic PR 14 project health telemetry (health status, health reasons, canonical completion percentage, active blocker chains, and milestone deadlines).
- **Advisory Only**: The AI engine is purely interpretive. It cannot mutate project health, change task states, or reassign resources.
- **Categorized Actionability**: Recommendations are classified by urgency (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and category (`BLOCKER`, `DELIVERY_RISK`, `MILESTONE`, `PRIORITY`, `OWNERSHIP`, `WORKLOAD`, `PROCESS`).
- **Defense in Depth**: Every LLM response is parsed and validated by Python Pydantic models before transmission, validated by Node Zod schemas upon receipt, and rendered in React via strongly typed TypeScript interfaces.
- **Abuse Prevention**: Dedicated rate limiting (10 requests per minute) prevents external LLM provider abuse.
