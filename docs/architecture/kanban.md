# TaskFlow Kanban Execution Board Architecture [PR 7]

## Overview

TaskFlow PR 7 introduces the primary visual execution workflow:
$$\text{Project} \longrightarrow \text{Kanban Board} \longrightarrow \text{Status Columns} \longrightarrow \text{Task Cards} \longrightarrow \text{Subtasks}$$

The Kanban execution board operates directly on the canonical `Task` entity. No secondary "board task" entity or shadow status table is introduced; the existing `TaskStatus` enum remains the strict **single source of truth**.

---

## 1. Status Column Design & Deterministic Mapping

Every status in `TaskStatus` maps deterministically to a dedicated Kanban column:

| TaskStatus    | Column Label    | Visual Accent       | Semantics & Lifecycle Behavior                                       |
| :------------ | :-------------- | :------------------ | :------------------------------------------------------------------- |
| `BACKLOG`     | **Backlog**     | Slate (`#94a3b8`)   | Work captured for future consideration; uncommitted backlog.         |
| `TODO`        | **To Do**       | Cyan (`#06b6d4`)    | Scheduled work ready for execution; default for newly created tasks. |
| `IN_PROGRESS` | **In Progress** | Blue (`#3b82f6`)    | Actively undergoing development or execution.                        |
| `IN_REVIEW`   | **In Review**   | Purple (`#a855f7`)  | Work completed by assignee awaiting verification or peer review.     |
| `BLOCKED`     | **Blocked**     | Rose (`#f43f5e`)    | Progress impeded by an external blocker or dependency.               |
| `DONE`        | **Done**        | Emerald (`#10b981`) | Work completed. Automatically populates `completedAt` timestamp.     |
| `CANCELLED`   | **Cancelled**   | Slate (`#64748b`)   | Abandoned or out-of-scope work. Preserved for operational history.   |

---

## 2. API & Backend Architecture

### 2.1 Dedicated Status Update Endpoint

While the general `PATCH /api/v1/organizations/:orgId/projects/:projId/tasks/:taskId` endpoint from PR 6 remains available for full task editing, PR 7 introduces a focused, high-throughput status mutation endpoint:

- **Endpoint:** `PATCH /api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/status`
- **Validation:** Validated with `updateTaskStatusSchema` (`z.nativeEnum(TaskStatus)`).
- **Execution:**
  - Validates actor organization and project permissions.
  - Verifies project containment (`Task` belongs to specified `projectId`).
  - Automatically manages `completedAt`:
    - Set to `new Date()` when transitioning to `TaskStatus.DONE`.
    - Reset to `null` when transitioning away from `DONE`.
  - Re-evaluates subtasks and returns refreshed task payload.

---

## 3. Drag-and-Drop & Optimistic UI Strategy

### 3.1 Interaction Flow

1. **Drag Start (`onDragStart`)**:
   - Captures `taskId` via `dataTransfer.setData('text/plain', task.id)`.
   - Sets `dataTransfer.effectAllowed = 'move'`.
   - Card displays subtle opacity reduction, neon ring glow, and shadow elevation.
2. **Drag Over (`onDragOver`, `onDragEnter`)**:
   - Column container highlights its perimeter border with a cyan neon drop-target glow.
3. **Drop (`onDrop`)**:
   - Prevents default browser handling and extracts `taskId`.
   - **Optimistic State Mutation:** Instantly shifts the task into the destination column in local React state.
   - Dispatches `taskApi.updateTaskStatus(...)` asynchronously in the background.
4. **Rollback & Toast Notifications**:
   - **Success:** Status mutation confirms; subtle non-blocking toast confirms transition.
   - **Failure:** State instantly rolls back to the pre-drag snapshot; non-blocking error toast notifies user of failure.

### 3.2 Accessibility Alternative

- Each card includes an accessible **Quick Move** menu (`MoreHorizontal` action).
- Enables keyboard and screen-reader users to instantly move cards between columns without pointer dragging.

---

## 4. Authorization Matrix

Kanban task movement is a write operation governed by project RBAC:

| Role                  | View Board | Move Cards | Edit Details | Create Tasks | Archive / Delete |
| :-------------------- | :--------: | :--------: | :----------: | :----------: | :--------------: |
| **Org OWNER / ADMIN** |     ✅     |     ✅     |      ✅      |      ✅      |        ✅        |
| **Project LEAD**      |     ✅     |     ✅     |      ✅      |      ✅      |        ✅        |
| **Project ADMIN**     |     ✅     |     ✅     |      ✅      |      ✅      |        ✅        |
| **Project MEMBER**    |     ✅     |     ✅     |      ✅      |      ✅      |     ❌ (403)     |
| **Project VIEWER**    |     ✅     |  ❌ (403)  |   ❌ (403)   |   ❌ (403)   |     ❌ (403)     |
| **Non-Project User**  |  ❌ (403)  |  ❌ (403)  |   ❌ (403)   |   ❌ (403)   |     ❌ (403)     |

---

## 5. Filtering, Sorting & View Switching

### 5.1 Filters

- **Real-Time Search:** Matches issue keys (`CORE-1`), titles, and descriptions.
- **Priority Filter:** Filter by `URGENT`, `HIGH`, `MEDIUM`, `LOW`, or `ALL`.
- **Assignee Filter:** Filter by specific member or `UNASSIGNED`.
- **Archived Toggle:** Soft-archived tasks are excluded by default and surfaced on-demand.

### 5.2 Deterministic Sorting Within Columns

- **Key (Newest / Oldest):** Sorted by monotonic `taskNumber`.
- **Priority (High to Low):** Weighted (`URGENT: 4`, `HIGH: 3`, `MEDIUM: 2`, `LOW: 1`, `NONE: 0`).
- **Due Date:** Earliest deadlines first.
- **Created Date:** Chronological ordering.

### 5.3 View Switcher

- Embedded in `ProjectDetailShell`: toggle between **Board** (Kanban columns) and **List** (Table layout) with zero re-fetching.

---

## 6. Verification & Automated Test Suite

The test suite in `apps/api/src/__tests__/kanban.test.ts` validates:

- Transition between all 7 statuses.
- Automatic setting and clearing of `completedAt`.
- Rejection of invalid status strings (`400 VALIDATION_ERROR`).
- RBAC protection: `ProjectRole.VIEWER` cannot move tasks (`403 INSUFFICIENT_PERMISSIONS`).
- Multi-tenant isolation: Cross-tenant and cross-project moves rejected with 403 / 404.
- Total test suite status: **106 / 106 tests passed (100% green)**.
