# ADR 002: Frontend Architecture & Technology Stack

## Status

Accepted

## Context

The TaskFlow frontend requires high responsiveness, complex interactive views (Kanban, DAG dependency graphs, timeline roadmaps), fast developer feedback, and a sleek, modern visual aesthetic.

## Decision

We chose the following technology stack for `apps/web`:

- **Vite**: Ultra-fast build tool and HMR.
- **React (TypeScript)**: Industry standard component model.
- **Tailwind CSS**: Utility-first CSS configured with custom semantic tokens.
- **TanStack Query (React Query)**: Declarative server-state caching, invalidation, and optimistic UI.
- **React Hook Form + Zod**: High-performance form state management with strict schema validation.
- **Lucide Icons**: Consistent, clean iconography.

## Rationale

- Decouples server state from UI state cleanly.
- Avoids bloated global state managers (Redux) when server data handles 90% of state needs.
- Highly defensible in engineering interviews.

## Consequences

- Routing and component primitives will be integrated cleanly in subsequent PRs.
