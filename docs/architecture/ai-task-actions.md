# Human-Approved AI Task Actions Architecture (PR 23)

## 1. Executive Summary

**Human-Approved AI Task Actions** introduces an advisory proposal mechanism for TaskFlow tasks. The system enables the AI subsystem to detect concrete optimization opportunities (such as overdue dates, missing assignees, critical path priority adjustments, or status transitions) and produce structured mutation proposals.

It adheres to the strict security, privacy, and architectural patterns established across PR 15 through PR 22:

- Single authoritative endpoint: `POST /api/v1/organizations/:organizationId/projects/:projectId/ai/analyze`
- Operation: `operation: AIOperation.TASK_ACTIONS` with scoped `taskId`
- Structured, discriminated proposal schema (`AITaskActionProposal`) bounded to a maximum of 5 proposals per analysis
- **Zero direct mutation authority** for AI services
- **Ephemeral proposals**: AI proposals are not stored in any database table (`no AIAction table`)

---

## 2. Most Important Architectural Invariants

### Zero Direct Mutation Authority

> **CRITICAL ARCHITECTURAL INVARIANT**:
> **AI services have no mutation authority.**
> The Python AI microservice has **zero database write connections**, executes no API tool calls against TaskFlow endpoints, and cannot mutate application state directly.

### AI Proposals are Not Authorization Credentials

> **CRITICAL SECURITY INVARIANT**:
> **AI proposals are not authorization credentials.**
> The Node.js authoritative backend treats all AI output as untrusted client input. Generating or approving an AI proposal does not grant permission to execute mutations. Every mutation executed upon human approval must pass through the authoritative domain API with standard authentication, organization tenant isolation, project membership validation, and RBAC permission checks.

---

## 3. End-to-End Approval & Mutation Flow

```
AI Model (Inference)
       ↓ (Generates structured advisory proposal)
Action Proposal (Ephemeral JSON)
       ↓ (Sent to web client via Node.js API gateway)
Frontend Review (<AITaskIntelligence /> Actions Tab)
       ↓ (User inspects diff: current vs proposed, title, rationale, confidence)
Explicit Human Approval (User clicks descriptive Apply button)
       ↓ (Calls standard PATCH /tasks/:taskId with expectedCurrentState)
Existing Authoritative Domain API (apps/api)
       ↓ (Extracts JWT session, tenant, and project context)
Authorization & RBAC (Verifies user permissions: Project Lead, Admin, Member)
       ↓
Validation (Zod schema validation, valid enums, dates, member existence)
       ↓
Stale Proposal Concurrency Check (Verifies current DB state matches expectedCurrentState)
       ↓ (If state diverged: aborts with 409 Conflict STALE_TASK_STATE)
Database Mutation (Prisma taskRepository.update)
       ↓
Activity Logging & Notifications (Reuses standard TASK_PRIORITY_CHANGED, TASK_ASSIGNED, etc.)
```

---

## 4. Supported Action Set

For PR 23, the supported action set is deliberately kept small and strictly typed:

| Action Type       | Target   | Parameters                                              | Authoritative Domain Endpoint Reused |
| ----------------- | -------- | ------------------------------------------------------- | ------------------------------------ |
| `UPDATE_STATUS`   | `taskId` | `{ status: TaskStatus }`                                | `PATCH /tasks/:taskId`               |
| `UPDATE_PRIORITY` | `taskId` | `{ priority: TaskPriority }`                            | `PATCH /tasks/:taskId`               |
| `UPDATE_DUE_DATE` | `taskId` | `{ dueDate: string \| null }`                           | `PATCH /tasks/:taskId`               |
| `ASSIGN_TASK`     | `taskId` | `{ assigneeId: string \| null, assigneeName?: string }` | `PATCH /tasks/:taskId`               |

### Explicitly Excluded Actions

The following mutations are explicitly prohibited in the action proposal framework for safety:

- `DELETE_TASK`, `DELETE_PROJECT`, `ARCHIVE_PROJECT`
- `REMOVE_USERS`, `CHANGE_ROLES`
- `CREATE_DEPENDENCY`, `DELETE_DEPENDENCY`
- Bulk project changes or arbitrary payload mutations

---

## 5. Stale Proposal Protection

AI proposals are generated asynchronously and can become stale if human team members update task fields before an action is approved.

### Concurrency Contract

Every action proposal includes an `expectedCurrentState` object:

```json
{
  "actionId": "act-550e8400-e29b-41d4-a716-446655440000",
  "type": "UPDATE_PRIORITY",
  "title": "Increase priority to HIGH",
  "reason": "Task is on the critical delivery path and blocks milestone release.",
  "confidence": "HIGH",
  "target": { "taskId": "33333333-3333-3333-3333-333333333333" },
  "expectedCurrentState": {
    "priority": "MEDIUM"
  },
  "parameters": {
    "priority": "HIGH"
  }
}
```

### Server-Side Authoritative Verification

When the user clicks Apply, the frontend submits `expectedCurrentState` alongside the update payload.
In `TaskService.updateTask`:

1. The authoritative task record is loaded from the database.
2. If `expectedCurrentState.priority` is supplied and does not match `existing.priority`:
   Throws `AppError('STALE_TASK_STATE', 'Task state has been modified since the action was proposed', 409)`.
3. The mutation is aborted without altering database records.

### Client-Side Reactive Stale Detection

In the React UI:

1. `isActionStale(action)` continuously compares `action.expectedCurrentState` with reactive task props (`currentStatus`, `currentPriority`, `currentDueDate`, `currentAssigneeId`).
2. If state diverges:
   - The proposal card displays an amber warning: _"This recommendation was generated from an older version of the task."_
   - The Apply button is disabled.
   - A _"Refresh Task"_ button is provided.

---

## 6. Assignee & Domain Safety Rules

1. **Candidate Bounding**: When constructing task context in `AIContextBuilder`, eligible assignees are extracted exclusively from project members (`projectRepository.listMembers(projectId)`) and formatted with bounded fields: `id` and `name`. Full organization user rosters are never exposed.
2. **Node Runtime Sanitization**: In `AIService`, even after Pydantic validates the Python AI response, Node re-checks all `ASSIGN_TASK` proposals against the authoritative project member list. Any proposed `assigneeId` not in the active project member list is stripped out before returning the response to the client.
3. **Cross-Tenant & Cross-Project Isolation**: The database mutation endpoint enforces organization and project membership, ensuring an assignee cannot be assigned across tenant boundaries.

---

## 7. Frontend User Experience

The existing `AITaskIntelligence` component in `TaskDetailDrawer` is extended with a third tab:

- **Assessment**: Task summary, blocker analysis, dependency risk evaluation.
- **Breakdown**: AI subtask decomposition and human-reviewed subtask creation.
- **Actions**: AI-suggested task actions requiring explicit human approval.

### Proposal Card States

- **Proposed**: Renders title, confidence badge, reason, diff preview (`Status: TODO → IN_PROGRESS`), Dismiss button, and explicit Apply button (`Move to In Progress`).
- **Applying**: Disables controls and displays loading spinner.
- **Applied**: Displays green confirmation badge (_"Action applied successfully"_).
- **Stale**: Displays warning banner with task refresh option; disables mutation.
- **Failed**: Displays error message and allows retry or dismissal.
- **Dismissed**: Proposal is discarded from the review list without affecting the task.

---

## 8. Telemetry & Observability

- Reuses existing Sentry transaction and error monitoring.
- Preserves `X-Request-ID` across React frontend, Node.js API gateway, and Python AI service.
- All approved mutations reuse authoritative `activityRepository` logging (`TASK_PRIORITY_CHANGED`, `TASK_STATUS_CHANGED`, `TASK_ASSIGNED`).
- Reuses existing notification dispatchers for assignees and project collaborators.
