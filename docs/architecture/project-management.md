# TaskFlow Project Management Foundation Architecture [PR 5]

## Overview

TaskFlow PR 5 implements the **Project Management Layer**, establishing the multi-tenant domain hierarchy:
$$\text{User} \longrightarrow \text{Organization (Workspace)} \longrightarrow \text{Project} \longrightarrow \text{Tasks (PR 6+)}$$

Each organization hosts isolated projects with dedicated key namespaces, member rosters, execution statuses, and visual identities.

---

## 1. Domain Hierarchy & Security Invariants

### 1.1 Tenant Containment

Projects are strictly scoped to their parent organization:

- `projects.organizationId` references `organizations.id` with `ON DELETE CASCADE`.
- A composite unique constraint `@@unique([organizationId, key])` guarantees that project keys are unique within an organization while permitting identical keys across distinct organizations.

### 1.2 Member Origin Constraint

A user **must** belong to the parent organization before joining a project:
$$\text{ProjectMember}(U, P) \implies \text{OrganizationMember}(U, \text{Org}(P))$$
Attempting to add an external user returns `400 Bad Request` (`USER_NOT_IN_ORGANIZATION`).

### 1.3 Sole-Lead Protection

A project can never become lead-less:

- Demoting the sole remaining `LEAD` returns `400 Bad Request` (`SOLE_LEAD_PROTECTION`).
- Removing the sole remaining `LEAD` returns `400 Bad Request` (`SOLE_LEAD_PROTECTION`).

### 1.4 Self-Elevation Prevention

Project members cannot elevate their own role:
$$\text{actorUserId} === \text{targetUserId} \implies \text{Blocked (403 CANNOT\_MODIFY\_OWN\_ROLE)}$$

---

## 2. Project Roles & RBAC Matrix

| Role                  | Rank | View | Create Projects | Update Settings  | Archive / Unarchive |    Manage Members    |
| :-------------------- | :--: | :--: | :-------------: | :--------------: | :-----------------: | :------------------: |
| **Org OWNER / ADMIN** |  5   |  ✅  |       ✅        | ✅ (Super-admin) |  ✅ (Super-admin)   |   ✅ (Super-admin)   |
| **Project LEAD**      |  4   |  ✅  |        —        |        ✅        |         ✅          |   ✅ (Full Roster)   |
| **Project ADMIN**     |  3   |  ✅  |        —        |        ✅        |      ❌ (403)       | ✅ (MEMBER / VIEWER) |
| **Project MEMBER**    |  2   |  ✅  |        —        |     ❌ (403)     |      ❌ (403)       |       ❌ (403)       |
| **Project VIEWER**    |  1   |  ✅  |        —        |     ❌ (403)     |      ❌ (403)       |       ❌ (403)       |

---

## 3. Project Key Rules

- Normalized to uppercase trimmed string: `^[A-Z0-9]{2,10}$`
- Length between 2 and 10 alphanumeric characters.
- Immutable after creation to protect URL routing, API tokens, and task issue keys (`TASK-101`).
- Duplicate key in same organization returns `409 Conflict` (`PROJECT_KEY_EXISTS`).

---

## 4. REST API Specification

All endpoints require an active JWT session (`Bearer <token>`):

### Project CRUD

| Method  | Path                                                  | Required Role          | Purpose                                                      |
| :------ | :---------------------------------------------------- | :--------------------- | :----------------------------------------------------------- |
| `GET`   | `/api/v1/organizations/:orgId/projects`               | Org Member             | List workspace projects with search/status filters           |
| `POST`  | `/api/v1/organizations/:orgId/projects`               | Org Member (non-guest) | Create project (creator becomes LEAD)                        |
| `GET`   | `/api/v1/organizations/:orgId/projects/:id`           | Org Member             | Inspect project details and team directory                   |
| `PATCH` | `/api/v1/organizations/:orgId/projects/:id`           | Project ADMIN / LEAD   | Update name, description, status, visual identity            |
| `POST`  | `/api/v1/organizations/:orgId/projects/:id/archive`   | Project LEAD           | Soft-archive project (`status: ARCHIVED`, sets `archivedAt`) |
| `POST`  | `/api/v1/organizations/:orgId/projects/:id/unarchive` | Project LEAD           | Restore project (`status: ACTIVE`, clears `archivedAt`)      |

### Project Members

| Method   | Path                                                        | Required Role        | Purpose                            |
| :------- | :---------------------------------------------------------- | :------------------- | :--------------------------------- |
| `GET`    | `/api/v1/organizations/:orgId/projects/:id/members`         | Org Member           | List project roster                |
| `POST`   | `/api/v1/organizations/:orgId/projects/:id/members`         | Project ADMIN / LEAD | Add existing org member to project |
| `PATCH`  | `/api/v1/organizations/:orgId/projects/:id/members/:userId` | Project LEAD         | Promote or demote member role      |
| `DELETE` | `/api/v1/organizations/:orgId/projects/:id/members/:userId` | Project ADMIN / LEAD | Remove member from project         |

---

## 5. Verification & Testing

Run full validation suite:

```bash
npm run format:check
npm run lint
npm run prisma:format:check
npm run prisma:validate
npm run type-check
npm run test
npm run build
```

Expected result: **70 / 70 tests passing**.
