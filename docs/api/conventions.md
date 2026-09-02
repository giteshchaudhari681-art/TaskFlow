# TaskFlow — REST API Design Conventions

## URL & Route Structure

1. **Base Prefix**: All REST endpoints are prefixed with `/api/v1`.
2. **Resource Pluralization**: Use plural nouns for resource collections (`/projects`, `/tasks`, `/organizations`).
3. **Sub-resources**: Nest sub-resources when hierarchically dependent:
   - `/api/v1/projects/:projectId/tasks`
   - `/api/v1/tasks/:taskId/comments`
   - `/api/v1/tasks/:taskId/dependencies`

---

## HTTP Method Semantics

- `GET`: Idempotent read of resources.
- `POST`: Create a new resource or execute an action (e.g. `/tasks/:id/breakdown`).
- `PATCH`: Partial update of specified fields.
- `PUT`: Complete resource replacement.
- `DELETE`: Remove a resource.

---

## Standard JSON Response Envelopes

### 1. Success Response

```json
{
  "success": true,
  "data": {
    "id": "c1f7a0be-8456-4dc4-8399-6e3e5cbb3461",
    "title": "Implement Critical Path Analyzer",
    "status": "IN_PROGRESS",
    "priority": "HIGH"
  },
  "meta": {
    "timestamp": "2026-09-02T08:20:00.000Z"
  }
}
```

### 2. Paginated Success Response

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false,
    "timestamp": "2026-09-02T08:20:00.000Z"
  }
}
```

### 3. Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "title",
        "message": "Title must be at least 3 characters long"
      }
    ]
  }
}
```

---

## Query Parameter Standards

| Parameter    | Type            | Default     | Description                                         |
| ------------ | --------------- | ----------- | --------------------------------------------------- |
| `page`       | integer         | 1           | 1-indexed page number                               |
| `limit`      | integer         | 20          | Items per page (max 100)                            |
| `sortBy`     | string          | `createdAt` | Property key to sort on                             |
| `sortOrder`  | `asc` \| `desc` | `desc`      | Sort direction                                      |
| `search`     | string          | -           | Full-text substring search across title/description |
| `status`     | string          | -           | Filter by status enum                               |
| `priority`   | string          | -           | Filter by priority enum                             |
| `assigneeId` | UUID            | -           | Filter by assignee user ID                          |

---

## Core Endpoint Blueprint (Planned)

### Authentication (`/api/v1/auth`)

- `POST /register`: Register new user account.
- `POST /login`: Authenticate and issue access + refresh tokens.
- `POST /refresh`: Issue new access token from valid refresh token.
- `POST /logout`: Revoke active refresh token session.

### Users & Orgs (`/api/v1/users`, `/api/v1/organizations`)

- `GET /users/me`: Return authenticated user profile.
- `GET /organizations`: List user organizations.
- `POST /organizations`: Create new workspace tenant.
- `GET /organizations/:id`: Retrieve workspace details.

### Projects & Milestones (`/api/v1/projects`)

- `GET /projects`: List accessible projects.
- `POST /projects`: Create new project.
- `GET /projects/:id`: Project details, metadata, and stats.
- `PATCH /projects/:id`: Update project configuration.
- `GET /projects/:id/milestones`: List project milestones.
- `POST /projects/:id/milestones`: Create delivery milestone.

### Tasks & Dependencies (`/api/v1/tasks`)

- `GET /tasks`: Query filtered tasks across projects.
- `POST /tasks`: Create new task.
- `GET /tasks/:id`: Deep task inspection with dependencies and subtasks.
- `PATCH /tasks/:id`: Update task attributes.
- `POST /tasks/:id/dependencies`: Establish blocking or related dependency.
- `DELETE /tasks/:id/dependencies/:depId`: Remove dependency link.

### Intelligence (`/api/v1/intelligence`)

- `GET /intelligence/projects/:id/risks`: Retrieve calculated project risk factors.
- `POST /intelligence/tasks/breakdown`: AI-assisted task decomposition.
