# TaskFlow — Backend Architecture Blueprint

## Architectural Principles

The backend uses a **Layered Service-Oriented Architecture** designed to keep code maintainable, testable, and easily defensible in technical interviews.

```
Request Flow:
Client Request
      │
      ▼
Middleware (Helmet, CORS, Rate Limit, Auth, Validation)
      │
      ▼
Routes (URL endpoint definitions and handler attachments)
      │
      ▼
Controllers (HTTP transport: request extraction, status codes, response envelope)
      │
      ▼
Services (Pure business logic, orchestration, validation rules, AI dispatch)
      │
      ▼
Repositories / Data Access Layer (Prisma ORM database queries, transactions)
      │
      ▼
PostgreSQL Database
```

## Layer Responsibilities

1. **Config Layer (`src/config/`)**:
   - Validates environment variables at application startup via Zod (`env.ts`).
   - Prevents the application from running with missing secrets or invalid configurations.

2. **Routes Layer (`src/routes/`)**:
   - Defines URL mapping and middleware chains (e.g. `validateRequest(schema)`, `requireAuth`, `requireProjectRole`).
   - Contains zero business logic or direct database queries.

3. **Controllers Layer (`src/controllers/`)**:
   - Extracts typed request body, params, and query.
   - Delegates business execution to Services.
   - Formats responses using standard `sendSuccess` and `sendError` utilities.

4. **Services Layer (`src/services/`)**:
   - Implements domain rules (e.g., verifying circular dependencies before creating a task dependency, calculating project velocity).
   - Independent of HTTP constructs (`req`, `res`), making services 100% unit-testable.

5. **Repositories Layer (`src/repositories/`)**:
   - Encapsulates Prisma queries and complex database transactions.
   - Prevents ORM queries from being scattered across controllers.

6. **Middleware Layer (`src/middleware/`)**:
   - Centralized error handling (`errorHandler.ts`).
   - 404 handler (`notFound.ts`).
   - Authentication & JWT extraction (`authenticate.ts` - upcoming PR).
   - Input validation (`validate.ts`).
