# TaskFlow Architecture — Task Labels & Organization System (PR 8)

## 1. Overview

The TaskFlow Task Labels and Tag Management system provides flexible, multi-dimensional classification and organization for project tasks.
It introduces the relational hierarchy:
$$\text{Project} \longrightarrow \text{Labels} \longrightarrow \text{Task ↔ Labels (TaskLabel)}$$

Labels are strictly **project-scoped**, eliminating tag namespace collisions across projects while enabling focused, project-specific classification taxonomies (e.g. `Frontend`, `Backend`, `Bug`, `Security`, `Design`, `Urgent`).

---

## 2. Database Schema & Indexing

### 2.1 Evolved `Label` Model

```prisma
model Label {
  id             String   @id @default(uuid()) @db.Uuid
  projectId      String   @db.Uuid
  name           String
  normalizedName String
  color          String   @default("cyan")
  description    String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  project    Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  taskLabels TaskLabel[]

  @@unique([projectId, normalizedName])
  @@index([projectId])
  @@map("labels")
}
```

### 2.2 Evolved `TaskLabel` Model (Join Table)

```prisma
model TaskLabel {
  id        String   @id @default(uuid()) @db.Uuid
  taskId    String   @db.Uuid
  labelId   String   @db.Uuid
  createdAt DateTime @default(now())

  task  Task  @relation(fields: [taskId], references: [id], onDelete: Cascade)
  label Label @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@unique([taskId, labelId])
  @@index([labelId])
  @@index([taskId])
  @@map("task_labels")
}
```

### 2.3 Indexing Strategy

- `@@unique([projectId, normalizedName])`: Enforces case-insensitive uniqueness per project at the database level.
- `@@index([projectId])`: Fast retrieval when listing all labels for a project.
- `@@unique([taskId, labelId])`: Prevents duplicate associations between a task and a label.
- `@@index([labelId])`: Accelerates task-count aggregation and reverse lookups.
- `@@index([taskId])`: Accelerates relational joins when loading tasks with their attached labels.

---

## 3. Label Name Normalization & Uniqueness

### 3.1 Normalization Strategy

Before writing to the database, label names undergo deterministic normalization:

```ts
const displayName = name.trim().replace(/\s+/g, ' ');
const normalizedName = displayName.toLowerCase();
```

- `displayName`: Preserves user-facing casing and spacing (e.g. `"Bug Fix"`).
- `normalizedName`: Lowercase canonical representation (e.g. `"bug fix"`).

### 3.2 Uniqueness Invariant

Uniqueness is validated both in application services and enforced by the PostgreSQL composite unique constraint `(projectId, normalizedName)`.

- `"Bug Fix"` and `"bug fix"` within the same project are treated as duplicates (`409 Conflict`).
- Two different projects may each have a `"Bug Fix"` label without conflict.

---

## 4. Controlled Color Token System

To prevent arbitrary or unsafe CSS injection, labels use a predefined, design-system-aligned color token system.

### Allowed Color Tokens:

`slate`, `gray`, `red`, `orange`, `amber`, `yellow`, `green`, `emerald`, `teal`, `cyan`, `blue`, `indigo`, `violet`, `purple`, `pink`, `rose`.

Each token maps deterministically to a dark-mode palette consisting of:

- Background (`bg-{token}-500/10`)
- Text (`text-{token}-300`)
- Border (`border-{token}-500/20`)
- Indicator dot (`bg-{token}-400`)

---

## 5. Authorization Matrix

| Role                  | View Labels | Create Label | Edit / Rename Label | Delete Label | Assign / Remove on Task |
| :-------------------- | :---------: | :----------: | :-----------------: | :----------: | :---------------------: |
| **Org OWNER / ADMIN** |     ✅      |      ✅      |         ✅          |      ✅      |           ✅            |
| **Project LEAD**      |     ✅      |      ✅      |         ✅          |      ✅      |           ✅            |
| **Project ADMIN**     |     ✅      |      ✅      |         ✅          |      ✅      |           ✅            |
| **Project MEMBER**    |     ✅      |   ❌ (403)   |      ❌ (403)       |   ❌ (403)   |           ✅            |
| **Project VIEWER**    |     ✅      |   ❌ (403)   |      ❌ (403)       |   ❌ (403)   |        ❌ (403)         |
| **Non-Project User**  |  ❌ (403)   |   ❌ (403)   |      ❌ (403)       |   ❌ (403)   |        ❌ (403)         |

---

## 6. REST API Endpoints

### 6.1 Project Label Endpoints

All endpoints are mounted under `/api/v1/organizations/:organizationId/projects/:projectId/labels`:

| Method   | Route       | Purpose                                              | Access Control                         |
| :------- | :---------- | :--------------------------------------------------- | :------------------------------------- |
| `GET`    | `/`         | List all labels in project with task counts          | Project Member / Admin / Lead / Viewer |
| `POST`   | `/`         | Create a new project label                           | Project Admin / Lead                   |
| `PATCH`  | `/:labelId` | Update label name, color, or description             | Project Admin / Lead                   |
| `DELETE` | `/:labelId` | Delete label (removes associations; preserves tasks) | Project Admin / Lead                   |

### 6.2 Task Label Assignment Endpoints

Mounted under `/api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/labels`:

| Method   | Route       | Payload               | Purpose                           | Access Control                |
| :------- | :---------- | :-------------------- | :-------------------------------- | :---------------------------- |
| `POST`   | `/`         | `{ labelId: string }` | Assign label to task (idempotent) | Project Member / Admin / Lead |
| `DELETE` | `/:labelId` | —                     | Remove label from task            | Project Member / Admin / Lead |

---

## 7. Cross-Project & Cross-Tenant Security Invariants

When assigning or removing a label from a task:

1. The **Actor** must be authenticated and belong to the organization and project.
2. The **Task** must belong to the specified `projectId`.
3. The **Label** must belong to the **same** `projectId`.
4. If a user attempts to attach a label from Project B to a task in Project A, the server returns `404 Not Found` (`LABEL_NOT_FOUND`), preventing cross-project label contamination.

---

## 8. Filtering & Search Semantics

The task listing endpoint (`GET /api/v1/organizations/:organizationId/projects/:projectId/tasks`) accepts:

- `labelIds`: Comma-separated list or array of label IDs.
- `labelMatch`: Matching mode:
  - `ANY` (default): Tasks having at least one of the specified labels (`labels: { some: { labelId: { in: labelIds } } }`).
  - `ALL`: Tasks having all of the specified labels (`AND: labelIds.map(...)`).

Label filtering seamlessly combines with existing filters:

- Status filter (`status=IN_PROGRESS`)
- Priority filter (`priority=URGENT`)
- Assignee filter (`assigneeId=UUID`)
- Search queries across key, title, and description (`search=auth`)
- Soft-archive toggle (`archived=true`)

---

## 9. Deletion Semantics

Deleting a label:

- Disassociates the label from all tasks via `onDelete: Cascade` on `TaskLabel`.
- **Tasks are preserved.** No tasks are ever deleted when a label is deleted.
