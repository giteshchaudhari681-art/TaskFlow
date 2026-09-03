# TaskFlow — Playwright E2E Testing Suite

## Overview

This directory contains the production-grade **Playwright End-to-End (E2E)** test suite for TaskFlow. The suite exercises critical user journeys in a real browser (Chromium) against the integrated application stack:

```
Browser (Chromium)
  │
  ▼
React SPA (Vite + TypeScript)
  │  (HTTP / WebSocket)
  ▼
Node.js Express API Server
  │
  ▼
PostgreSQL (Prisma ORM)
```

---

## Architecture of Test Layers

TaskFlow separates testing responsibilities across complementary layers:

| Layer               | Tool                   | Scope & Responsibilities                                                                                      |
| :------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------ |
| **E2E Browser**     | **Playwright**         | Real browser workflows, DOM rendering, form interactions, navigation, session persistence, and UI-level RBAC. |
| **API Integration** | **Supertest / Vitest** | HTTP requests, controllers, middleware, session rotation, and boundary envelopes.                             |
| **Unit & Rules**    | **Vitest**             | Pure TypeScript logic, health rules, domain utilities, Zod schemas.                                           |
| **Contract Specs**  | **OpenAPI / Swagger**  | API schema validation, parameter typing, and external documentation.                                          |
| **AI Subsystem**    | **Pytest / Pydantic**  | Python FastAPI models, prompt construction, and provider mocking.                                             |

---

## Directory Structure

```
e2e/
├── fixtures/
│   ├── auth.fixture.ts         # Authenticated page fixture with isolated test user
│   └── test-data.fixture.ts    # Deterministic test data generator & API provisioner
├── pages/
│   ├── login.page.ts           # Login & Registration page object
│   ├── projects.page.ts        # Projects listing & creation modal page object
│   ├── project.page.ts         # Project Detail shell tab navigation
│   ├── task.page.ts            # Task creation, board card, & quick-move page object
│   └── dashboard.page.ts       # Project Command Center / Dashboard 2.0 page object
├── tests/
│   ├── auth.spec.ts            # Registration, invalid input, login, session persistence (5 tests)
│   ├── project.spec.ts         # Project creation, form validation, and navigation
│   ├── task.spec.ts            # Task lifecycle, detail drawer, and reload persistence
│   ├── kanban.spec.ts          # Column movement and status persistence
│   ├── permissions.spec.ts     # RBAC UI boundary and backend authorization enforcement
│   ├── search.spec.ts          # Global search modal and entity navigation
│   └── dashboard.spec.ts       # Project Command Center, health state, KPIs, and risks
└── README.md                   # This documentation
```

---

## Test Data Strategy

1. **Zero Hardcoded Credentials**: Tests never rely on pre-existing development seed accounts (`alex.chen@taskflow.dev`) or production accounts.
2. **Deterministic Dynamic Identities**: Every test provisions unique test users, organizations, projects, and tasks using isolated deterministic identities:
   - User Email: `e2e-<timestamp>-<random>@example.test`
   - Project Key: `PRJ<random>`
3. **Real Application Path**: Provisioning uses the actual public REST API (`POST /api/v1/auth/register`, `POST /api/v1/organizations/:id/projects`, etc.), verifying that entities adhere strictly to application Zod validation and Prisma constraints.
4. **Isolated Test Execution**: Tests do not depend on execution order or shared mutable state.

---

## Running E2E Tests

### 1. Prerequisites

Ensure PostgreSQL is running and migrations are applied:

```bash
# Verify database connection
npm run prisma:validate
```

Install Playwright browsers (if not already installed):

```bash
npx playwright install chromium
```

### 2. Execution Commands

From the monorepo root:

```bash
# Run all E2E tests headlessly
npm run test:e2e

# Run tests with Playwright Interactive UI
npm run test:e2e:ui

# Run tests in headed browser mode
npm run test:e2e:headed

# View the generated HTML test report
npm run test:e2e:report
```

---

## Configuration & Environment Variables

The configuration in `playwright.config.ts` automatically boots both the Node.js API server (`http://localhost:5000`) and the Vite web server (`http://localhost:5173`) via Playwright's `webServer` block if they are not already running.

You may customize target endpoints via environment variables:

| Variable       | Default                 | Purpose                                               |
| :------------- | :---------------------- | :---------------------------------------------------- |
| `E2E_BASE_URL` | `http://localhost:5173` | Target URL for the Vite frontend client               |
| `E2E_API_URL`  | `http://localhost:5000` | Target URL for the Express REST API backend           |
| `CI`           | _undefined_             | When set, enables 2 retries and disables server reuse |
