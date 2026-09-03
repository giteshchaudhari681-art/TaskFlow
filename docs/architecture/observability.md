# TaskFlow Production Observability & Error Monitoring Architecture

## 1. Overview & Architectural Role

TaskFlow employs **Sentry** as a diagnostic telemetry and runtime error monitoring layer across all three application tiers:

$$\text{React 18 SPA (Vite)} \xrightarrow{\text{X-Request-ID}} \text{Node.js API (Express)} \xrightarrow{\text{X-Request-ID}} \text{Python AI Subsystem (FastAPI)}$$

### Core Principle: Observability, NOT Business Logic

Sentry serves strictly as an **external telemetry observer**. It never participates in:

- Authentication or authorization decisions
- Core domain or task execution workflows
- Database transactions or state mutations
- Workflow orchestration or notification delivery

The application remains **100% functional** even when Sentry is completely disabled or unreachable.

---

## 2. Runtime Coverage Matrix

| Tier             | Runtime & Framework              | Sentry SDK            | Key Entrypoint                      |
| :--------------- | :------------------------------- | :-------------------- | :---------------------------------- |
| **Frontend**     | React 18 / Vite / TypeScript     | `@sentry/react`       | `apps/web/src/monitoring/sentry.ts` |
| **Backend API**  | Node.js / Express / TypeScript   | `@sentry/node`        | `apps/api/src/monitoring/sentry.ts` |
| **AI Subsystem** | Python 3.13 / FastAPI / Pydantic | `sentry-sdk[fastapi]` | `apps/ai/app/monitoring.py`         |

---

## 3. Request Correlation (`X-Request-ID`)

Cross-service traceability is maintained through deterministic request ID propagation:

1. **Client / Gateway**: A unique UUID is supplied via the `X-Request-ID` HTTP header, or generated upon receipt.
2. **Express API**: The `requestIdMiddleware` attaches `req.id` and echoes `X-Request-ID` in the response header.
3. **Internal AI Client**: When invoking Python AI endpoints (`POST /ai/analyze`), the Node.js `AIClient` attaches:
   - `X-Request-ID: <correlationId>`
   - `X-TaskFlow-Service-Token: <internalServiceToken>` (strictly excluded from telemetry)
4. **FastAPI AI Subsystem**: Extracts `X-Request-ID` and binds it to request context and error telemetry.

---

## 4. Error Classification & Severity Strategy

To prevent high-volume noise and preserve telemetry signal quality, errors are categorized into **Expected Operational Errors** and **Unexpected Application Failures**:

### A. Expected Operational Errors (Filtered / NOT Reported to Sentry)

- **HTTP 400 Validation Errors**: Client input schema violations caught by Zod or Pydantic.
- **HTTP 401 Authentication Required**: Invalid passwords, expired tokens, or unauthenticated requests.
- **HTTP 403 Forbidden**: Role-based access control restrictions (e.g. non-admin attempting workspace member invite).
- **HTTP 404 Not Found**: Querying non-existent tasks, projects, or users.
- **HTTP 409 Conflict**: Concurrent edits, unique constraint collisions, or existing email registrations.
- **HTTP 429 Rate Limit**: Rate limiter thresholds exceeded.

### B. Unexpected Application Failures (Captured & Reported to Sentry)

- **HTTP 500 Unhandled Runtime Errors**: `TypeError`, `ReferenceError`, invariant violations, unhandled rejections.
- **Database Failures**: Prisma connection timeouts, network drops, or query execution faults.
- **Upstream AI Provider Failures (HTTP 502)**: OpenAI API downtime, socket timeouts, or upstream quota exhaustion.
- **React Rendering Crashes**: JavaScript exceptions caught by the high-level React `ErrorBoundary`.

---

## 5. Sensitive Data Scrubbing & PII Protection

Both the client and server SDK configurations enforce strict `beforeSend` event scrubbing:

### Explicitly Excluded / Redacted Headers

- `Authorization` (`Bearer <token>`)
- `Cookie` and `Set-Cookie`
- `X-TaskFlow-Service-Token` (internal AI authorization token)
- `X-API-Key` / `Proxy-Authorization`

### Explicitly Excluded / Redacted Payload Fields

- Passwords (`password`, `currentPassword`, `newPassword`)
- Secrets & Tokens (`token`, `refreshToken`, `accessToken`, `clientSecret`)
- API Keys (`openai_api_key`, `apiKey`)
- Raw AI prompts containing user context (only operation enum and request ID are tagged)

---

## 6. Frontend Error Boundary Strategy

The React frontend encapsulates the entire application tree in `ErrorBoundary`:

- **Location**: [`apps/web/src/components/common/ErrorBoundary.tsx`](file:///d:/TaskFlow/apps/web/src/components/common/ErrorBoundary.tsx)
- **UX Fallback**: An obsidian-styled recovery view that:
  - Informs the user that an unexpected interface error occurred.
  - Explains that diagnostic telemetry has recorded the incident.
  - Provides intuitive recovery actions: "Try Again", "Reload Workspace", and "Go to Dashboard".
  - **Never** exposes stack traces, SQL queries, or internal component parameters to end-users.

---

## 7. Environment Separation

Sentry telemetry is strictly segregated by environment:

- `development`: Local development instances. Telemetry is disabled by default unless `SENTRY_DSN` is configured.
- `test`: Automated test runners (Vitest, Pytest, Playwright). Sentry initialization gracefully skips without errors, avoiding test pollution.
- `production`: Staged and production deployments with sample rates and releases pinned.

### Environment Configuration Variables

| Variable                    | Tier | Description                                              |
| :-------------------------- | :--- | :------------------------------------------------------- |
| `SENTRY_DSN`                | API  | Node.js Sentry project DSN                               |
| `SENTRY_ENVIRONMENT`        | API  | Environment tag (`production`, `staging`, `development`) |
| `SENTRY_TRACES_SAMPLE_RATE` | API  | Performance tracing sample rate (`0.0` to `1.0`)         |
| `VITE_SENTRY_DSN`           | Web  | React client Sentry DSN                                  |
| `VITE_SENTRY_ENVIRONMENT`   | Web  | React client environment tag                             |
| `sentry_dsn`                | AI   | Python AI subsystem Sentry DSN                           |
| `sentry_environment`        | AI   | Python AI subsystem environment tag                      |

---

## 8. Incident Investigation Workflow

When investigating a production incident in Sentry:

```
1. Sentry Alert Triggered
       │
       ▼
2. Inspect Event Tags (service, environment, release, status_code)
       │
       ▼
3. Locate request_id tag (e.g. 8f4c28f1-...)
       │
       ▼
4. Trace correlated Node.js API logs via request_id
       │
       ▼
5. Trace correlated Python AI service logs via matching request_id
       │
       ▼
6. Determine Root Cause & Deploy Patch
```
