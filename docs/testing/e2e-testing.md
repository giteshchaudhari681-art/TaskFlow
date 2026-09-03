# TaskFlow End-to-End (E2E) Browser Testing Guide

## 1. Overview & Test Pyramid Architecture

TaskFlow implements a multi-tiered testing strategy where each layer provides targeted guarantees:

```
                  ┌──────────────────────┐
                  │    Playwright E2E    │  ← Real browser automation (11 critical journeys)
                  ├──────────────────────┤
                  │   API Integration    │  ← Supertest + Vitest (51 routes, 64 operations)
                  ├──────────────────────┤
                  │    Contract Tests    │  ← OpenAPI 3.1.0 Swagger schema validation
                  ├──────────────────────┤
                  │   Unit & Pure Logic  │  ← Vitest domain engines, health calculators
                  ├──────────────────────┤
                  │   AI Service Tests   │  ← Python Pytest + Pydantic schema validation
                  └──────────────────────┘
```

### Why Playwright E2E?

While unit and integration tests validate backend logic and API contracts in isolation, Playwright E2E tests guarantee that:

- The React SPA client correctly compiles, hydrates, renders, and handles asynchronous events.
- Client state transitions (e.g. `AuthContext`, workspace switching, tab navigation) operate without race conditions or memory leaks.
- Real HTTP cookies (`refreshToken`), CORS headers, and bearer tokens circulate securely between browser and server.
- Drag-and-drop / DOM interactions work on real Chromium browser engines.

---

## 2. Directory Layout

```
e2e/
├── fixtures/
│   ├── auth.fixture.ts         # Custom Playwright test fixture with authenticatedPage
│   └── test-data.fixture.ts    # Deterministic entity provisioner and unique ID generator
├── pages/
│   ├── login.page.ts           # Login and Registration page model
│   ├── projects.page.ts        # Projects list and Create Project modal model
│   ├── project.page.ts         # Project Detail shell tab navigation model
│   ├── task.page.ts            # Task creation, board card, drawer inspection model
│   └── dashboard.page.ts       # Project Command Center / Dashboard 2.0 model
├── tests/
│   ├── auth.spec.ts            # 5 authentication tests: registration, validation, login, reload
│   ├── project.spec.ts         # Project creation, auto-key generation, list navigation
│   ├── task.spec.ts            # Task creation, card rendering, drawer inspection, persistence
│   ├── kanban.spec.ts          # Quick status transitions, column movement, reload persistence
│   ├── permissions.spec.ts     # RBAC boundary enforcement (MEMBER UI vs API 403)
│   ├── search.spec.ts          # Global search palette, debouncing, entity selection
│   └── dashboard.spec.ts       # Project Command Center, health state, KPIs, delivery risks
├── playwright.config.ts        # Playwright test runner configuration
└── README.md                   # Quick reference readme
```

---

## 3. Test Data Strategy & Determinism

### Guiding Principles:

1. **Zero Hardcoded Accounts**: Tests never rely on hardcoded developer accounts (`alex.chen@taskflow.dev`) or static database seeds.
2. **Dynamic Isolated Identities**: Every test provisions fresh users and organizations with timestamps and random suffixes:
   - Email format: `e2e-<timestamp>-<rand>@example.test`
   - Workspace format: `E2E Workspace <rand>`
   - Project key format: `PRJ<rand>`
3. **Public API Path**: Provisioning uses the actual Node.js REST endpoints (`POST /api/v1/auth/register`, `POST /api/v1/organizations/:id/projects`), ensuring full Zod validation and Prisma constraints are exercised.
4. **Order Independence**: Tests do not share state and can execute independently.

---

## 4. Running Tests Locally

### Quick Execution

```bash
# Run all E2E tests headlessly
npm run test:e2e

# Run with interactive UI mode (debugger & time-travel)
npm run test:e2e:ui

# Run in headed browser mode
npm run test:e2e:headed

# View generated HTML report
npm run test:e2e:report
```

### Targeted Execution

```bash
# Run a specific test spec
npx playwright test e2e/tests/auth.spec.ts

# Run tests matching a grep title filter
npx playwright test -g "TEST 1"
```

---

## 5. Debugging & Artifacts

When an E2E test fails, Playwright captures detailed diagnostic artifacts in `test-results/`:

1. **Screenshots**: Captured automatically upon test failure (`screenshot: 'only-on-failure'`).
2. **Trace Viewer**: Traces are recorded on retry or failure (`trace: 'on-first-retry'`). View traces via:
   ```bash
   npx playwright show-trace test-results/<test-dir>/trace.zip
   ```
3. **Video Recording**: High-framerate video recordings are retained on failure (`video: 'retain-on-failure'`).

---

## 6. How to Add New E2E Tests Safely

1. **Use Page Objects**: Encapsulate DOM selectors inside `e2e/pages/` rather than spreading raw CSS/XPath selectors across tests.
2. **Use Accessible Playwright Locators**: Prefer `getByRole`, `getByPlaceholder`, `getByText`, and `locator('text=...')` over fragile class names.
3. **Avoid Arbitrary Sleep**: Never use `page.waitForTimeout(5000)`. Rely on Playwright's built-in web-first assertions like `expect(locator).toBeVisible()` or `page.waitForResponse(...)`.
4. **Use Test Fixtures**: Leverage `authenticatedPage` from `e2e/fixtures/auth.fixture.ts` to skip redundant UI login steps when testing post-authentication workflows.

---

## 7. CI Pipeline Integration

E2E testing is executed as part of the GitHub Actions `validate` job (`.github/workflows/ci.yml`):

1. **Service Container**: PostgreSQL 16 runs as a Docker service in CI.
2. **Playwright Installation**: Runs `npx playwright install --with-deps chromium`.
3. **Automatic WebServer**: Playwright launches both the Express backend and the Vite frontend via `webServer` configuration.
4. **Artifact Upload**: If any test fails, the complete `playwright-report/` artifact is uploaded to the workflow run and retained for 14 days.
