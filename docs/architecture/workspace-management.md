# TaskFlow Architecture: Workspace & Identity Management (PR 4)

## 1. Overview

PR 4 advances TaskFlow from foundational authentication into full tenant and identity operations. It allows authenticated users to inspect and update their user profiles, securely rotate passwords with automated remote session invalidation, switch across organization workspaces, update organization metadata, and manage workspace memberships via a strictly enforced Role-Based Access Control (RBAC) matrix.

---

## 2. User Profile & Password Security

### Profile Retrieval & Mutation

- **`GET /api/v1/users/me`**: Returns identity details (`id`, `name`, `email`, `avatarUrl`, `createdAt`, `organizationCount`).
- **`PATCH /api/v1/users/me`**: Allows updating mutable display details (`name`, `avatarUrl`). Protected identity properties (`id`, `email`, `passwordHash`) and tenant associations are immutable through this endpoint.

### Password Lifecycle & Remote Session Revocation

- **`PATCH /api/v1/users/me/password`**:
  1. Validates current password using bcrypt.
  2. Enforces password entropy requirements (minimum 8 characters, uppercase, lowercase, numbers).
  3. Rejects identical old-to-new password re-use.
  4. Hashes and updates password in PostgreSQL.
  5. **Session Revocation Strategy**: Revokes all existing refresh sessions in PostgreSQL (`sessionRepository.revokeAllForUser`), then issues a fresh replacement session for the active client device, setting the new HTTP-only cookie and returning a new JWT access token. This ensures smooth workflow continuity on the active device while immediately terminating all remote or compromised sessions.

---

## 3. Organization & Workspace Operations

### Multi-Tenant Isolation Model

- Tenants are partitioned by `Organization`.
- Users access organizations through `OrganizationMember` records with a specific `UserRole` (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`).
- All workspace-scoped routes enforce both JWT identity and database-backed membership. A token containing an organization ID does not bypass database membership verification.

### Endpoints Contract

```
GET    /api/v1/organizations                  -> List all workspaces for authenticated user
GET    /api/v1/organizations/:organizationId   -> Get workspace details & telemetry
PATCH  /api/v1/organizations/:organizationId   -> Update workspace name & branding (OWNER, ADMIN)
GET    /api/v1/organizations/:organizationId/members -> List members with roles (members only)
POST   /api/v1/organizations/:organizationId/members -> Add/invite registered member (OWNER, ADMIN)
PATCH  /api/v1/organizations/:organizationId/members/:userId -> Change member role (strict RBAC rules)
DELETE /api/v1/organizations/:organizationId/members/:userId -> Remove member (with owner safeguards)
```

---

## 4. RBAC Permission Matrix & Owner Safeguards

| Operation                       |  OWNER  |    ADMIN     |    MEMBER    |    GUEST     | Safeguards / Invariants                             |
| :------------------------------ | :-----: | :----------: | :----------: | :----------: | :-------------------------------------------------- |
| **Inspect Workspace**           | Allowed |   Allowed    |   Allowed    |   Allowed    | Must belong to workspace (403 if foreign)           |
| **Update Workspace Name**       | Allowed |   Allowed    | Denied (403) | Denied (403) | Protected against non-admin edits                   |
| **List Members**                | Allowed |   Allowed    |   Allowed    |   Allowed    | Tenant-isolated; password hashes strictly omitted   |
| **Add Member**                  | Allowed |   Allowed    | Denied (403) | Denied (403) | ADMIN cannot grant OWNER role                       |
| **Change Role to ADMIN/MEMBER** | Allowed |   Allowed    | Denied (403) | Denied (403) | Cannot modify own role (no self-elevation)          |
| **Promote to OWNER**            | Allowed | Denied (403) | Denied (403) | Denied (403) | Only existing OWNER can create new OWNER            |
| **Demote OWNER**                | Allowed | Denied (403) | Denied (403) | Denied (403) | Prohibited if user is the **sole remaining OWNER**  |
| **Remove Member**               | Allowed |   Allowed    | Denied (403) | Denied (403) | ADMIN cannot remove OWNER; cannot remove sole OWNER |

### Key Security Invariants

1. **Zero-Owner Prevention**: An organization can never be left ownerless. Any action attempting to demote or remove the last remaining `OWNER` of a workspace is rejected with code `400` (`SOLE_OWNER_PROTECTION`).
2. **Self-Elevation Prevention**: Non-owners cannot alter their own organizational role (`actorUserId === targetUserId` is blocked).
3. **Cross-Tenant Protection**: Modifying or inspecting resources outside the caller's membership scope returns `403 Forbidden` or `404 Not Found` without leaking data.
4. **Data Privacy**: Member and profile endpoints project safe user records (`id`, `name`, `email`, `avatarUrl`), completely stripping `passwordHash`, `refreshTokenHash`, and private session state.
