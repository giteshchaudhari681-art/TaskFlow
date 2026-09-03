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

Pydantic (v2) provides high-performance, Rust-backed runtime validation, strict type coercion, JSON schema generation, and first-class integration with modern AI tooling (including OpenAI structured outputs). It serves as the strict runtime contract guardian at the AI service boundary.

### Why Node.js Remains the Primary Backend

Node.js/Express remains the authoritative source of truth for:

- User identities, sessions, and passwords (bcrypt, JWT)
- Multi-tenant organization boundaries and workspace settings
- Project membership and granular RBAC (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`)
- Tasks, dependencies, kanban transitions, and milestones
- PostgreSQL persistence and ACID transactions via Prisma
- Real-time client event broadcasting via Socket.IO

Python is **NOT** the database owner and does not perform direct database queries. Express retrieves authoritative data from PostgreSQL, applies tenant filtering, and passes a structured context payload to Python.

---

## 3. Dual Validation Architecture: Zod vs Pydantic

TaskFlow maintains an intentional separation of validation responsibilities:

| Layer                      | Technology                       | Responsibility                                                                                |
| -------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| **Frontend & Express API** | **Zod** (`@taskflow/validation`) | Client-side form validation, API route parameter/body validation, tenant security boundaries. |
| **Python AI Subsystem**    | **Pydantic v2** (`app.models`)   | Internal request/response validation, context constraints, LLM schema enforcement.            |

This avoids forcing TypeScript domain types into Python or replacing battle-tested Zod schemas in Express.

---

## 4. End-to-End Request Flow

```
1. User requests AI Project Summary in React UI
   │
2. Express verifies JWT session, tenant org membership, and project access (RBAC)
   │
3. Express Service queries PostgreSQL via Prisma to fetch project metadata, active tasks,
   milestones, and PR 14 deterministic project health metrics
   │
4. Express dispatches internal HTTP POST /ai/analyze with structured AIAnalysisRequest payload
   │
5. Python FastAPI route receives payload -> Pydantic validates AIAnalysisRequest
   │
6. AIService coordinates execution -> passes context to BaseAIProvider
   │
7. OpenAIProvider constructs system & user prompts -> invokes AsyncOpenAI
   │
8. OpenAI returns structured JSON -> validated against AIAnalysisResponse
   │
9. Response flows back to Express -> Express logs audit activity -> returns to React UI
```

---

## 5. Security & Boundary Isolation

1. **Zero Secret Exposure**: Third-party LLM credentials (`OPENAI_API_KEY`) are kept isolated in the internal AI service environment. They are never transmitted over the network to the browser or returned in health endpoints.
2. **Authoritative Authorization**: Python never decides if a user has permission to view a project. Express is the sole authorization authority.
3. **Internal Network Binding**: The Python service defaults to listening on `127.0.0.1:8000` to prevent public ingress.
4. **Sanitized Error Responses**: Upstream provider failures (rate limits, timeouts, authentication errors) return standardized error envelopes (`AI_PROVIDER_ERROR`, `AI_PROVIDER_NOT_CONFIGURED`) without exposing raw exceptions or stack traces.
5. **Correlation Tracking**: Every request carries a `request_id` (caller-supplied or auto-generated UUID) to support end-to-end tracing across service boundaries.

---

## 6. Supported Operations (PR 15)

The initial operational scope is intentionally focused:

- `PROJECT_SUMMARY`: Synthesizes an executive overview from active tasks, metrics, and milestones.
- `TASK_SUMMARY`: Analyzes task risks, blockers, and execution priorities.
- `PROJECT_INSIGHT`: Evaluates delivery bottlenecks and produces prioritized recommendations.

Operations outside this controlled enumeration are rejected at runtime with HTTP 422.

---

## 7. Future Expansion Roadmap

PR 15 establishes the foundational boundary. Future PRs will expand on this architecture:

- **PR 16–18**: Express client integration, caching, and background task queue dispatch.
- **PR 19**: Sentry tracing and observability correlation across Express and Python.
- **PR 20–24**: Automated testing pipelines (Playwright), containerization (Docker), and OpenAPI synchronization.
