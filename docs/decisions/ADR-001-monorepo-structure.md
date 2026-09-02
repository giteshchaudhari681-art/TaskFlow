# ADR 001: Monorepo Structure Using Native npm Workspaces

## Status

Accepted

## Context

TaskFlow is a full-stack system requiring shared TypeScript definitions, validation schemas, and common configs across both client (`apps/web`) and server (`apps/api`). We needed to decide whether to use:

1. Separate Git repositories.
2. An external monorepo tool (Nx, Turborepo, Lerna, Rush).
3. Native npm workspaces (`npm@10+`).

## Decision

We adopted **npm workspaces** with a clean directory convention:

```
TaskFlow/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── shared/
│   ├── validation/
│   └── config/
```

## Rationale

- **Zero Tooling Overhead**: Native to standard Node.js/npm without needing proprietary orchestrators or additional CLI tools.
- **Defensible in Technical Interviews**: Every developer understands native package workspaces without having to explain complex Nx/Turborepo caching mechanics.
- **Type Safety**: Enables instant cross-workspace resolution of `@taskflow/shared` and `@taskflow/validation`.

## Consequences

- Requires unified dependency management at root.
- Simple workspace scripts (`npm run build --workspaces`) orchestrate multi-package builds.
