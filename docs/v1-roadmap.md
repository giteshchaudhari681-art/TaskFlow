# TaskFlow v1 Roadmap & Boundaries

## V1.0 COMPLETE (FEATURE-FROZEN)

TaskFlow v1.0 establishes the core, fully-functional, secure, and production-validated baseline. The following capabilities are considered complete and frozen for v1.0:

- Core Organization & Project Management
- Task & Subtask Management (Kanban, Dependencies, Milestones)
- Role-Based Access Control (RBAC) & Tenant Isolation
- Secure JWT & Refresh Token Authentication
- AI Project Intelligence & Task Decomposition (Advisory bounds)
- Real-time Notifications & Collaboration (Socket.IO integration)
- Background Worker Processing
- Security Hardening (Rate limiting, Zod validation, HTTP-only secure cookies)
- Docker Containerization & Release Artifact Generation

_No further feature development will occur in v1.0. Future work is strictly deferred to v1.1+._

## V1.1 / FUTURE (DEFERRED INENTIONALLY FROM V1.0)

The following capabilities are deferred intentionally from v1.0 and belong to the future v1.1+ roadmap:

- Redis distributed rate limiting (Currently process-local)
- Stripe billing integration
- Enterprise SAML / OIDC / SCIM integration
- CRDT / Yjs live document collaboration
- Workflow automation & Webhooks
- Multi-region read replicas
- Horizontal worker scaling
- Vector search / advanced RAG capabilities
