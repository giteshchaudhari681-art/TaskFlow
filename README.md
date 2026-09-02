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
│   └── api/                     # Backend Node.js + Express REST API
│       ├── src/
│       │   ├── config/          # Zod environment validation
│       │   ├── controllers/     # HTTP transport controllers
│       │   ├── middleware/      # Error handling, 404, rate limit
│       │   ├── routes/          # Express route definitions
│       │   ├── utils/           # Standard response envelope
│       │   └── server.ts        # Express app configuration
│       └── package.json
│
├── packages/
│   ├── shared/                  # Universal types, enums, response models
│   ├── validation/              # Shared Zod schemas
│   └── config/                  # Shared presets and configurations
│
├── docs/                        # Architectural Blueprints & ADRs
│   ├── architecture/            # System, backend, frontend, DB, auth, security
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

### Installation

Clone the repository and install dependencies at the monorepo root:

```bash
git clone https://github.com/giteshchaudhari681-art/TaskFlow.git
cd TaskFlow
npm install
```

### Environment Setup

Copy the root `.env.example` to your workspace environments:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### Running Locally

To run both backend and frontend concurrently in development mode:

**Terminal 1 — API Server (runs on http://localhost:5000):**

```bash
npm run dev:api
```

**Terminal 2 — Web Frontend (runs on http://localhost:5173):**

```bash
npm run dev:web
```

---

## 🧪 Verification & Quality Checks

Run the following scripts from the monorepo root:

| Command                | Description                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- |
| `npm run type-check`   | Runs TypeScript compilation verification across all workspaces                |
| `npm run build`        | Builds `@taskflow/shared`, `@taskflow/validation`, `apps/api`, and `apps/web` |
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
