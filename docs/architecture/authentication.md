# TaskFlow — Authentication & Authorization Blueprint

## Authentication Strategy

TaskFlow employs a production-grade **Dual-Token JWT Authentication Architecture** designed to balance low latency with secure session revocation.

```
+-----------+                    +-----------------+                    +-------------------+
|  Client   | -- POST /login --> |  TaskFlow API   | -- Verify bcrypt - | PostgreSQL (User) |
+-----------+                    +-----------------+                    +-------------------+
      |                                   |
      |<-- Return Access Token (JSON) ----+
      |<-- Set Refresh Token (HttpOnly) --+
      |
+-----------+
| Protected | -- Bearer <Access Token> -> [requireAuth Middleware] -> Validates JWT & User Context
| Request   |
+-----------+
```

## Token Specifications

1. **Access Token**:
   - Format: JSON Web Token (JWT) signed with HMAC-SHA256 (`JWT_SECRET`).
   - Lifespan: **15 minutes**.
   - Payload: `{ sub: userId, email: string, defaultOrgId?: string }`.
   - Transmission: Authorization HTTP header: `Bearer <token>`.
2. **Refresh Token**:
   - Format: Opaque cryptographically random token or signed JWT (`JWT_REFRESH_SECRET`).
   - Lifespan: **7 days**.
   - Storage: HTTP-only, `SameSite=Lax`, `Secure` cookie (preventing XSS theft).
   - Invalidation: Stored in a revocable sessions table to support instant remote logout.

## Password Security

- Passwords are hashed using **bcrypt** with a work factor of **12 salt rounds**.
- Passwords must meet strict entropy rules enforced via Zod (minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, and 1 special symbol).
- Password hashes are excluded by default in all ORM select projections.

## Authorization & RBAC

TaskFlow uses a hierarchical **Role-Based Access Control (RBAC)** model:

1. **Organization Level (`OrganizationMember.role`)**:
   - `OWNER`: Full billing, tenant deletion, member role assignment.
   - `ADMIN`: Project creation, member management, organization settings.
   - `MEMBER`: Create and update tasks/projects assigned to them.
   - `GUEST`: Read-only access to specifically shared projects.
2. **Project Level (`ProjectMember.role`)**:
   - `LEAD`: Milestone management, project settings, member assignments.
   - `MEMBER`: Full task lifecycle management.
   - `VIEWER`: Read-only inspection of tasks and discussions.
3. **Enforcement Middleware**:
   - `requireAuth`: Verifies access token and populates `req.user`.
   - `requireOrgRole(minRole)`: Validates tenant membership and role hierarchy.
   - `requireProjectRole(minRole)`: Validates project-specific permissions before granting mutation access.
