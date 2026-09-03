# TaskFlow ⚡

### AI-Powered Project Operations Platform

[![CI](https://github.com/giteshchaudhari681-art/TaskFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/giteshchaudhari681-art/TaskFlow/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

**TaskFlow** is a modern, high-fidelity project operations platform designed for engineering and product delivery teams. It moves beyond passive task tracking to provide deterministic dependency management, real-time collaboration, and proactive AI delivery intelligence that detects schedule slip risks before they cascade.

---

## 🌟 Core Pillars

- **Project Execution Engine**: Multi-tier hierarchy spanning Organizations, Projects, Milestones, Objectives, Tasks, and Subtasks.
- **Deterministic Dependency Graph (DAG)**: Models blocking and relates-to dependencies, computes critical paths, and forecasts cascading delay impacts.
- **Real-Time Collaboration**: Instant task state propagation and operational presence powered by Socket.IO.
- **AI Delivery Intelligence**: Proactive risk radar, automated task breakdown, velocity forecasting, and daily executive summaries.
- **Engineering UX**: High-fidelity dark obsidian interface, keyboard-first navigation, and responsive typography.

---

## 🏗 System Architecture

```
+-------------------------------------------------------------+
|                     Client Application                      |
|       React 18/19 SPA • Vite • TypeScript • Tailwind CSS    |
|       TanStack Query • React Hook Form • Zod • Lucide       |
+------------------------------+------------------------------+
                               |
               +---------------+---------------+
               | HTTPS / REST                  | WSS (Socket.IO)
               v                               v
+-------------------------------------------------------------+
|                      TaskFlow API Server                    |
|   Express.js • TypeScript • Helmet • CORS • Rate Limiting   |
|   Zod Validation • JWT Auth • Layered Controller/Service    |
+--------------+---------------+---------------+--------------+
               |               |               |
               v               v               v
     +-------------------+     |               |
     | PostgreSQL DB     |     v               v
     | Prisma ORM        |  +-------------+  +--------------+
     | ACID Migrations   |  | OpenAI API  |  | Cloudinary   |
     +-------------------+  | (AI Engine) |  | (File Store) |
                            +-------------+  +--------------+
```

---

## 📂 Monorepo Structure

```
TaskFlow/
├── apps/
│   ├── web/                     # Frontend Vite + React SPA
│   │   ├── src/
│   │   │   ├── App.tsx          # Platform shell & status probe
│   │   │   └── index.css        # Semantic tokens & custom theme
│   │   └── package.json
│   │
│   ├── api/                     # Backend Node.js + Express REST API (Primary Backend)
│   │   ├── src/
│   │   │   ├── config/          # Zod environment validation
│   │   │   ├── controllers/     # HTTP transport controllers
│   │   │   ├── middleware/      # Error handling, 404, rate limit
│   │   │   ├── routes/          # Express route definitions
│   │   │   ├── utils/           # Standard response envelope
│   │   │   └── server.ts        # Express app configuration
│   │   └── package.json
│   │
│   └── ai/                      # Python AI Service Subsystem (FastAPI + Pydantic v2)
│       ├── app/                 # FastAPI application, models, routes, services
│       ├── tests/               # Pytest suite
│       ├── pyproject.toml       # Python package configuration
│       └── requirements.txt     # Pinned Python dependencies
│
├── packages/
│   ├── shared/                  # Universal types, enums, response models
│   ├── validation/              # Shared Zod schemas
│   └── config/                  # Shared presets and configurations
│
├── docs/                        # Architectural Blueprints & ADRs
│   ├── architecture/            # System, backend, frontend, DB, auth, security, AI
│   ├── product/                 # Vision, information architecture
│   ├── api/                     # REST conventions & error contracts
│   └── decisions/               # Architecture Decision Records (ADRs)
│
├── .github/workflows/ci.yml     # Automated CI verification workflow
├── .env.example                 # Environment configuration template
└── package.json                 # Monorepo workspaces & lifecycle scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `>= 20.0.0` (Tested on Node 25)
- **npm**: `>= 10.0.0`
- **Python**: `>= 3.12` (For AI Subsystem)
- **Docker & Docker Compose**: `>= 24.0.0` / `>= v2.20.0` (Optional, for containerized development)

### Installation

Clone the repository and install dependencies at the monorepo root:

```bash
git clone https://github.com/giteshchaudhari681-art/TaskFlow.git
cd TaskFlow
npm install
```

For the Python AI service (local non-Docker setup):

```bash
cd apps/ai
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Unix:
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### Environment Setup

Copy the environment files to your workspace environments:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/ai/.env.example apps/ai/.env
```

---

## 🐳 Docker-Based Development

TaskFlow provides complete containerized orchestration using Docker Compose:

```bash
# Build and start all backend services (PostgreSQL, Python AI, Express API)
docker compose up -d --build

# Verify container status and healthchecks
docker compose ps

# View service logs
docker compose logs -f taskflow-api taskflow-ai

# Stop all containers
docker compose down
```

### Service Architecture in Docker:

- **taskflow-postgres** (`postgres:16-alpine`): Runs on port `5432` with named volume persistence (`taskflow-postgres-data`).
- **taskflow-ai** (`apps/ai/Dockerfile`): Runs Python 3.13 FastAPI on port `8000` with non-root security and healthcheck.
- **taskflow-api** (`apps/api/Dockerfile`): Runs Node.js Express on port `5000`, waits for PostgreSQL and AI service health before starting.

---

## 💻 Local Non-Docker Development

To run the platform services concurrently in local development mode:

**Terminal 1 — Express API Server (runs on http://localhost:5000):**

```bash
npm run dev:api
```

**Terminal 2 — Web Frontend (runs on http://localhost:5173):**

```bash
npm run dev:web
```

**Terminal 3 — Python AI Service (runs on http://127.0.0.1:8000):**

```bash
cd apps/ai
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 📖 API Documentation & OpenAPI Contracts

TaskFlow provides formal OpenAPI 3.1.0 specifications and interactive Swagger UI explorers for both its public application backend and its internal AI subsystem.

### 1. Public Application REST API (Node.js / Express)

The public API manages all user sessions, organizations, projects, Kanban tasks, milestones, comments, notifications, search, and dashboard telemetry.

- **Interactive Swagger UI**: [http://localhost:5000/docs](http://localhost:5000/docs) (or `http://localhost:5000/api/docs`)
- **Raw OpenAPI 3.1 JSON**: [http://localhost:5000/openapi.json](http://localhost:5000/openapi.json) (or `http://localhost:5000/api/openapi.json`)
- **Authentication**: Bearer JWT (`Authorization: Bearer <access_token>`). Refresh tokens are transmitted strictly via secure HTTP-only cookies.

### 2. Internal AI Processing Subsystem (Python / FastAPI)

> ⚠️ **INTERNAL SERVICE ONLY**: This API is strictly an internal service. Public clients and frontend applications must use the Node.js TaskFlow API. Protected AI analysis operations require the internal `X-TaskFlow-Service-Token` header.

- **Internal Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Internal OpenAPI JSON**: [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)
- **ReDoc Explorer**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🔭 Production Observability & Error Monitoring

TaskFlow features multi-tier error monitoring powered by **Sentry**:

- **Frontend SPA (`apps/web`)**: Integrated `@sentry/react` runtime telemetry and React `<ErrorBoundary>` fallback with sanitized client telemetry.
- **Node.js API (`apps/api`)**: Integrated `@sentry/node` capturing unexpected 5xx runtime errors, tracing requests via `X-Request-ID` correlation middleware, and filtering out expected 4xx operational errors.
- **Python AI Service (`apps/ai`)**: Integrated `sentry-sdk[fastapi]` capturing provider failures (502) and unhandled exceptions (500) while scrubbing authentication secrets.
- **Architecture Guide**: Detailed documentation is available at [`docs/architecture/observability.md`](docs/architecture/observability.md).

---

## 🧪 Verification & Quality Checks

Run the following scripts from the monorepo root:

| Command                | Description                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- |
| `npm run type-check`   | Runs TypeScript compilation verification across all workspaces                |
| `npm run build`        | Builds `@taskflow/shared`, `@taskflow/validation`, `apps/api`, and `apps/web` |
| `npm run test`         | Executes Vitest unit and integration test suite                               |
| `npm run test:e2e`     | Runs full Playwright browser automation test suite headlessly                 |
| `npm run test:e2e:ui`  | Launches Playwright interactive runner with time-travel debugging             |
| `npm run format:check` | Verifies code formatting consistency with Prettier                            |
| `npm run format`       | Automatically formats all codebase files                                      |

### Health Check Endpoint

Once the API server is running, probe system telemetry at:

- `http://localhost:5000/health`
- `http://localhost:5000/api/v1/health`

Response:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "taskflow-api",
    "version": "0.1.0",
    "environment": "development",
    "timestamp": "2026-09-02T08:25:00.000Z",
    "uptimeSeconds": 42
  }
}
```

---

## 🗺 Milestone Roadmap

- [x] **PR 1**: Monorepo Foundation, Repository Audit, Product Definition & Architecture Blueprint
- [ ] **PR 2**: Database Migration, Prisma ORM Models, Seed Scripts & Data Access Layer
- [ ] **PR 3**: Authentication & Multi-Tenant Authorization (JWT, bcrypt, RBAC)
- [ ] **PR 4**: Project Operations & Workspace Management
- [ ] **PR 5**: Task Execution, Subtasks & DAG Dependency Graph Engine
- [ ] **PR 6**: Real-Time Collaboration & Operational Sync (Socket.IO)
- [ ] **PR 7**: AI Delivery Intelligence & Critical Path Risk Radar
- [ ] **PR 8**: High-Fidelity UI Polish, Command Palette & Performance Optimization

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
