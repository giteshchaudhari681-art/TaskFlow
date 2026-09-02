# TaskFlow — Frontend Architecture Blueprint

## Architectural Philosophy

TaskFlow's frontend is organized around **Feature Modules** with clear boundaries between UI presentation, server state management, and client interactive state.

```
apps/web/src/
├── app/                  # Application initialization, root providers, theme provider
├── components/           # Reusable presentation components
│   ├── ui/               # Base primitives (Button, Dialog, Input, Dropdown, etc.)
│   ├── layout/           # App layout, Sidebar, Header, Status Bar
│   └── shared/           # Cross-feature components (StatusBadge, UserAvatar, EmptyState)
├── features/             # Business domain feature slices
│   ├── auth/             # Login, register, session management
│   ├── dashboard/        # Operational overview, project health, velocity cards
│   ├── projects/         # Project workspaces, settings, milestones
│   ├── tasks/            # Task list, Kanban board, dependency graph, detail drawer
│   ├── planner/          # "My Day" agenda, calendar view, personal workload
│   ├── intelligence/     # AI recommendations, risk radar, critical path viewer
│   └── team/             # Members, invitations, role permissions
├── hooks/                # Global utilities and custom hooks (useDebounce, useMediaQuery)
├── lib/                  # Library wrappers (api client, query client, socket client)
├── routes/               # Route definitions, protected route guards
├── services/             # HTTP API request functions
└── types/                # Local frontend UI types
```

## State Management Strategy

1. **Server State (TanStack Query)**:
   - All asynchronous remote data (tasks, projects, comments, health) is managed via TanStack Query.
   - Handles caching, optimistic updates, background refetching, and error states out of the box.
2. **Form State (React Hook Form + Zod)**:
   - Form handling with schema-driven validation using `@taskflow/validation` schemas.
3. **Local Interactive State (React State / Context)**:
   - Drawer toggle, command palette visibility, active filters, and transient UI selections.
4. **Real-Time Push (Socket.IO Hook)**:
   - Subscribes to project rooms; invalidates relevant TanStack Query keys upon receiving server events.
