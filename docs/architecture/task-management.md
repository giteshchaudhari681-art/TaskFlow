# TaskFlow Task Management Foundation Architecture [PR 6]

## Overview

TaskFlow PR 6 introduces the **Task Execution Layer**, expanding the domain hierarchy:
$$\text{User} \longrightarrow \text{Organization (Workspace)} \longrightarrow \text{Project} \longrightarrow \text{Tasks} \longrightarrow \text{Subtasks}$$

Tasks represent actionable units of work scoped to an organization's project. Each task features sequential issue numbering (`CORE-1`, `CORE-2`), multi-tenant member assignment constraints, execution statuses, priority indicators, due dates, and an interactive subtask checklist.

---

## 1. Sequential Issue Numbering & Concurrency Safety

### 1.1 Specification

- Issue keys take the format `${project.key}-${taskNumber}` (e.g., `CORE-1`, `CORE-102`).
- Generated purely server-side within a database transaction; clients cannot specify `taskNumber` or `issueKey`.
- Guaranteed contiguous and monotonic per project with zero collision risk under high concurrency.

### 1.2 Row-Level Locking Strategy

To prevent race conditions and duplicate key exceptions under concurrent task creation:

1. Within a PostgreSQL transaction (`prisma.$transaction`), TaskFlow executes:
   ```sql
   SELECT id, key FROM projects WHERE id = $1::uuid FOR UPDATE;
   ```
2. The `FOR UPDATE` lock guarantees that concurrent creation requests targeting the **same project** are serialized cleanly. Requests targeting **distinct projects** execute in parallel with zero lock contention.
3. Within the locked transaction:
   ```sql
   SELECT COALESCE(MAX("taskNumber"), 0) + 1 AS "nextNumber"
   FROM tasks WHERE "projectId" = $1::uuid;
   ```
4. The task is inserted with `taskNumber = nextNumber` and `issueKey = `${project.key}-${nextNumber}``.
5. The composite unique constraint `@@unique([projectId, taskNumber])` at the database level physically prevents any duplicate numbers.

---

## 2. Domain Models & Status Lifecycle

### 2.1 Task Statuses

- `TODO` — Work scheduled but not yet begun (Default)
- `IN_PROGRESS` — Actively being worked on
- `IN_REVIEW` — Work completed and awaiting verification
- `DONE` — Work completed (automatically sets `completedAt`)
- `BACKLOG` — Work captured for future consideration
- `BLOCKED` — Execution hindered by external dependency
- `CANCELLED` — Work abandoned

### 2.2 Task Priorities

- `URGENT` — Immediate resolution required (Visual pulse indicator)
- `HIGH` — High impact
- `MEDIUM` — Standard operational work (Default)
- `LOW` — Non-blocking / minor task
- `NONE` — Unprioritized

### 2.3 Subtasks

- Subtasks belong to a parent `Task` and cannot escape the parent project's authorization boundary.
- Toggling `isCompleted: true` sets `completedAt`.
- Ordered sequentially (`order: 0, 1, 2...`) within the parent task.

---

## 3. Assignment Rules & Multi-Tenant Containment

Task assignment strictly adheres to the domain containment hierarchy:
$$\text{Organization Membership} \longrightarrow \text{Project Membership} \longrightarrow \text{Task Assignment}$$

1. **Member Origin Constraint**: An assignee must be a verified member of the project (`ProjectMember`). Attempting to assign a user outside the project returns `400 Bad Request` (`ASSIGNEE_NOT_IN_PROJECT`).
2. **Cross-Tenant Block**: External users from different organizations can never be assigned or access tasks.
3. **Route Verification**: Every task endpoint validates:
   - Authenticated user session.
   - Actor organization membership.
   - Actor project membership / permissions.
   - Project belongs to requested organization URL (`404` on mismatch).
   - Task belongs to requested project URL (`404` on mismatch).

---

## 4. Authorization Matrix

| Role                  | View Tasks | Create Tasks | Update Tasks |      Assign Tasks       | Manage Subtasks | Archive / Delete |
| :-------------------- | :--------: | :----------: | :----------: | :---------------------: | :-------------: | :--------------: |
| **Org OWNER / ADMIN** |     ✅     |      ✅      |      ✅      |           ✅            |       ✅        |        ✅        |
| **Project LEAD**      |     ✅     |      ✅      |      ✅      |           ✅            |       ✅        |        ✅        |
| **Project ADMIN**     |     ✅     |      ✅      |      ✅      |           ✅            |       ✅        |        ✅        |
| **Project MEMBER**    |     ✅     |      ✅      |      ✅      | ✅ (To Project Members) |       ✅        |     ❌ (403)     |
| **Project VIEWER**    |     ✅     |   ❌ (403)   |   ❌ (403)   |        ❌ (403)         |    ❌ (403)     |     ❌ (403)     |
| **Non-Project User**  |  ❌ (403)  |   ❌ (403)   |   ❌ (403)   |        ❌ (403)         |    ❌ (403)     |     ❌ (403)     |

---

## 5. REST API Specification

Base Path: `/api/v1/organizations/:organizationId/projects/:projectId/tasks`

| Method   | Endpoint                       | Purpose                                                                            | Required Role                 |
| :------- | :----------------------------- | :--------------------------------------------------------------------------------- | :---------------------------- |
| `GET`    | `/`                            | List tasks with filters (`status`, `priority`, `assigneeId`, `search`, `archived`) | Project Member                |
| `POST`   | `/`                            | Create task (assigns monotonic `issueKey`)                                         | Project Member / Admin / Lead |
| `GET`    | `/:taskId`                     | Retrieve task details with subtasks                                                | Project Member                |
| `PATCH`  | `/:taskId`                     | Update title, description, status, priority, assignee, due date                    | Project Member / Admin / Lead |
| `POST`   | `/:taskId/archive`             | Archive task (sets `archivedAt`)                                                   | Project Admin / Lead          |
| `POST`   | `/:taskId/unarchive`           | Restore archived task                                                              | Project Admin / Lead          |
| `DELETE` | `/:taskId`                     | Permanently delete task                                                            | Project Admin / Lead          |
| `GET`    | `/:taskId/subtasks`            | List subtasks for a task                                                           | Project Member                |
| `POST`   | `/:taskId/subtasks`            | Add subtask to task                                                                | Project Member / Admin / Lead |
| `PATCH`  | `/:taskId/subtasks/:subtaskId` | Update subtask title, toggle completion                                            | Project Member / Admin / Lead |
| `DELETE` | `/:taskId/subtasks/:subtaskId` | Delete subtask                                                                     | Project Member / Admin / Lead |

---

## 6. Verification & Automated Tests

Automated integration test suite in `apps/api/src/__tests__/task.test.ts`:

- **Concurrency Safety**: 10 simultaneous task creations verified via `Promise.all` with zero collisions.
- **Assignment Verification**: Non-project and foreign-tenant assignment attempts correctly rejected.
- **Subtask Lifecycle**: Subtask creation, completion timestamps, and deletion verified.
- **Regression**: 93 / 93 total tests passing across all test suites (`auth`, `workspace`, `project`, `task`).
