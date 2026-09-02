# TaskFlow — Authentication, Session Management & Multi-Tenant Authorization Specification

## 1. Authentication Architecture Overview

TaskFlow implements a production-grade **Dual-Token Authentication and Multi-Tenant Session Architecture**. It is designed to combine low-latency in-memory API verification with instantaneous server-side session revocation and multi-tenant isolation.

```
+-----------------------------------------------------------------------------------------+
|                                  CLIENT LAYER (apps/web)                                |
|                                                                                         |
|  - Short-Lived Access Token: Kept strictly in JavaScript memory (never localStorage)   |
|  - Long-Lived Refresh Token: Managed automatically in secure HTTP-Only cookie           |
|  - Axios / Fetch Client: Single-flight 401 interceptor automatically calls /auth/refresh |
+-----------------------------------------------------------------------------------------+
                                       │                      │
             POST /api/v1/auth/login   │                      │  Bearer <Access Token>
            (or POST /auth/register)   │                      │
                                       ▼                      ▼
+-------------------------------------------------+   +-----------------------------------+
|               API AUTH ROUTER                   |   |       PROTECTED RESOURCE ROUTE    |
|                                                 |   |                                   |
| - Validates input with Zod                      |   | - requireAuth middleware          |
| - Hashes/verifies passwords with bcrypt         |   | - requireOrgRole middleware       |
| - Issues signed JWT access token                |   | - requireProjectRole middleware   |
| - Creates Session record in PostgreSQL          |   +-----------------------------------+
| - Sets HTTP-only, SameSite=Lax cookie           |
+-------------------------------------------------+
                                       │
                                       ▼
+-----------------------------------------------------------------------------------------+
|                                DATABASE LAYER (PostgreSQL)                              |
|                                                                                         |
|  - users table: Email, name, bcrypt passwordHash                                        |
|  - sessions table: SHA-256 refreshTokenHash, expiresAt, revokedAt, rotatedFromSessionId |
|  - organizations & organization_members: Multi-tenant workspace RBAC boundaries         |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Token Specifications & Security Profile

| Attribute                | Access Token                                      | Refresh Token                                      |
| :----------------------- | :------------------------------------------------ | :------------------------------------------------- |
| **Type**                 | JSON Web Token (JWT)                              | Cryptographically Secure 256-bit Hex Token         |
| **Lifespan**             | 15 minutes (`JWT_EXPIRES_IN=15m`)                 | 7 days (`REFRESH_TOKEN_EXPIRES_DAYS=7`)            |
| **Signing / Encryption** | HMAC-SHA256 (`JWT_SECRET`)                        | SHA-256 One-Way Database Hash                      |
| **Transmission Channel** | `Authorization: Bearer <token>` Header            | `Cookie: taskflow_refresh_token=<token>`           |
| **Storage Location**     | Frontend runtime memory                           | Secure, HttpOnly, SameSite=Lax Cookie              |
| **Database State**       | Stateless (verified via cryptographic signature)  | Persistent in `sessions` table (SHA-256 hash only) |
| **XSS Protection**       | Ephemeral memory storage                          | Inaccessible to JavaScript via `HttpOnly` flag     |
| **CSRF Protection**      | Bearer header requires explicit client attachment | `SameSite=Lax` cookie constraint                   |

---

## 3. Database Session Model

The `Session` model (`apps/api/prisma/schema.prisma`) represents revocable device sessions:

```prisma
model Session {
  id                   String    @id @default(uuid()) @db.Uuid
  userId               String    @db.Uuid
  refreshTokenHash     String    @unique
  expiresAt            DateTime
  revokedAt            DateTime?
  rotatedFromSessionId String?   @db.Uuid
  userAgent            String?
  ipAddress            String?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@index([revokedAt])
  @@map("sessions")
}
```

### Key Schema Characteristics:

- **`onDelete: Cascade`**: When a `User` account is deleted, all associated device sessions are automatically purged.
- **SHA-256 Hashing**: The database **never stores raw refresh tokens**. Even with full database read access, an attacker cannot forge refresh tokens.
- **Fast Indexed Lookups**: Indexed on `userId`, `expiresAt`, and `revokedAt` for rapid session validation and cleanup.

---

## 4. Session Lifecycle & Refresh Token Rotation

### Rotation Workflow

1. Client sends `POST /api/v1/auth/refresh` with the `taskflow_refresh_token` cookie.
2. Server hashes the incoming raw token with SHA-256 and queries `sessions`.
3. If valid and unexpired:
   - Server marks the existing session as revoked (`revokedAt = new Date()`).
   - Server generates a new 256-bit raw token, hashes it, and creates a replacement `Session` record linked via `rotatedFromSessionId`.
   - Server issues a replacement HTTP-only cookie and returns a new 15-minute access token.

### Reuse Detection (Replay Defense)

If an incoming refresh token resolves to a session that **has already been revoked** (`revokedAt !== null`), this signals an attempted replay attack or stolen token. The server immediately:

1. Logs a security violation alert: `🚨 Suspicious refresh token reuse detected for user <id>`.
2. Revokes **all active sessions** belonging to that user (`sessionRepository.revokeAllForUser(userId)`).
3. Rejects the request with `401 Unauthorized`.

---

## 5. Multi-Tenant Authorization & RBAC

TaskFlow enforces strict hierarchical access control at both the Organization and Project levels.

### A. Organization Level Roles

- **`OWNER` (Rank 4)**: Full billing, tenant deletion, member role assignment.
- **`ADMIN` (Rank 3)**: Project creation, member invitations, workspace settings.
- **`MEMBER` (Rank 2)**: Standard project participant, task assignee/reporter.
- **`GUEST` (Rank 1)**: Restricted read-only view of designated projects.

### B. Project Level Roles

- **`LEAD` (Rank 3)**: Milestone management, project settings, member assignments.
- **`MEMBER` (Rank 2)**: Full task lifecycle management.
- **`VIEWER` (Rank 1)**: Read-only inspection of tasks and discussions.

### C. Enforcement Middleware

- **`requireAuth`**: Validates the Bearer JWT from the `Authorization` header, queries the user, and injects `req.user`.
- **`requireOrgRole(...roles)`**: Extracts the organization context (via header `x-organization-id` or route params), queries `OrganizationMember`, checks rank hierarchy, and injects `req.orgMember`.
- **`requireProjectRole(...roles)`**: Verifies project membership, verifies tenant boundary (`membership.project.organizationId === activeOrgId`), checks role rank, and injects `req.projectMember`.

---

## 6. REST API Endpoint Contract

| Method | Path                    | Auth     | Rate Limit | Description                                                       |
| :----- | :---------------------- | :------- | :--------- | :---------------------------------------------------------------- |
| `POST` | `/api/v1/auth/register` | None     | 30 / 15m   | Register new user + provision initial workspace with `OWNER` role |
| `POST` | `/api/v1/auth/login`    | None     | 30 / 15m   | Authenticate email/password + set refresh cookie                  |
| `POST` | `/api/v1/auth/refresh`  | Cookie   | 500 / 15m  | Rotate refresh token + return new access token                    |
| `POST` | `/api/v1/auth/logout`   | Optional | None       | Revoke session + clear refresh cookie (idempotent)                |
| `GET`  | `/api/v1/auth/me`       | Bearer   | None       | Return current user profile and tenant memberships                |

---

## 7. Automated Test Suite

Automated integration tests are implemented in `apps/api/src/__tests__/auth.test.ts` using **Vitest** and **Supertest** running against an isolated PostgreSQL database.

Test coverage guarantees:

1. **Registration**: Valid registration, transactional organization provisioning, duplicate email rejection (409), password entropy enforcement (400).
2. **Login**: Valid login, password verification, generic credentials error (401), exclusion of `passwordHash` in payload.
3. **Session Context**: `/auth/me` extraction with valid Bearer token, missing token rejection, invalid token rejection.
4. **Token Rotation**: Seamless refresh cookie rotation, new access token generation.
5. **Reuse Detection**: Immediate token family revocation upon presenting an already-rotated token.
6. **Logout**: Session revocation, cookie clearing, subsequent refresh rejection.
7. **RBAC**: Organization OWNER vs MEMBER privileges, non-member rejection (403), Project member access, cross-tenant isolation enforcement.
