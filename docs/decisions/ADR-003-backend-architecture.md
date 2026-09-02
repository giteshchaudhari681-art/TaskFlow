# ADR 003: Backend Architecture & Technology Stack

## Status

Accepted

## Context

TaskFlow needs a performant, maintainable backend capable of handling REST APIs, real-time WebSocket broadcasting, secure authentication, and AI service orchestration.

## Decision

We established the following backend architecture for `apps/api`:

- **Node.js + Express.js + TypeScript**: Battle-tested, minimal overhead, clear lifecycle.
- **Layered Architecture**: Strict boundaries between `Routes`, `Controllers`, `Services`, `Repositories`, and `Middleware`.
- **Zod Environment & Input Validation**: Validates all runtime environment variables and incoming request payloads.
- **Security Middleware Suite**: Helmet (secure HTTP headers), CORS, and express-rate-limit.
- **Prisma ORM + PostgreSQL**: Type-safe schema definition, declarative migrations, and parameterized query execution.

## Rationale

- Balances simplicity with strict scalability.
- Prevents the dreaded "anemic controller" or "fat controller with SQL queries" anti-patterns.
- Prepares cleanly for Socket.IO attachment and OpenAI integration in later PRs.

## Consequences

- Requires disciplined enforcement that routes and controllers contain no raw business logic or database queries.
