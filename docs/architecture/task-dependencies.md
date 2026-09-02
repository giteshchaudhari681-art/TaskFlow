# TaskFlow Architecture — Task Dependencies & Dependency Graph (PR 9)

## 1. Overview

The TaskFlow Task Dependency Engine introduces directed and non-blocking relational structures between project tasks:
$$\text{Project} \longrightarrow \text{Tasks} \longrightarrow \text{Task Dependencies (DAG)}$$

Dependencies enable engineering and operations teams to model execution order, critical path blockers, and related activities with mathematical cycle safety and strict multi-tenant project isolation.

---

## 2. Canonical Dependency Representation

### 2.1 The Single Source of Truth Principle

To prevent duplicate state, cache invalidation race conditions, and divergent bidirectional rows, all task relationships are stored in a **single canonical row** within `task_dependencies`:

```prisma
model TaskDependency {
  id            String         @id @default(uuid()) @db.Uuid
  projectId     String         @db.Uuid
  predecessorId String         @db.Uuid
  successorId   String         @db.Uuid
  type          DependencyType @default(BLOCKS)
  createdAt     DateTime       @default(now())

  project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  predecessor Task    @relation("TaskPredecessor", fields: [predecessorId], references: [id], onDelete: Cascade)
  successor   Task    @relation("TaskSuccessor", fields: [successorId], references: [id], onDelete: Cascade)

  @@unique([predecessorId, successorId])
  @@index([projectId])
  @@index([predecessorId])
  @@index([successorId])
  @@map("task_dependencies")
}
```

### 2.2 Semantic Rules & Normalization

1. **`BLOCKS` (Directed Blocker)**:
   - Meaning: `predecessorId` blocks `successorId`.
   - The predecessor must be completed before the successor can be resolved.
   - Stored canonically as: `(predecessor: source, successor: target, type: BLOCKS)`.
2. **`BLOCKED_BY` (Inverse User Concept)**:
   - Meaning: When a user says _"Task B is blocked by Task A"_, they are declaring that _Task A blocks Task B_.
   - **Normalized on write** to: `(predecessor: Task A, successor: Task B, type: BLOCKS)`.
   - Never stored as an independent type in the database.
   - When querying dependencies from Task B's vantage point, the API returns Task A under `blockedBy` with `direction: 'INCOMING'`.
3. **`RELATES_TO` (Undirected Association)**:
   - Meaning: Non-blocking semantic relationship between two tasks.
   - Normalized lexicographically by UUID:
     - `predecessorId = min(taskA, taskB)`
     - `successorId = max(taskA, taskB)`
     - `type = RELATES_TO`
   - Guarantees $A \leftrightarrow B$ and $B \leftrightarrow A$ map to the exact same physical record.
   - Composite unique constraint `@@unique([predecessorId, successorId])` naturally prevents duplicate links.

---

## 3. Deterministic Cycle Detection

Blocking dependencies form a Directed Acyclic Graph (DAG). Circular loops (e.g. $A \rightarrow B \rightarrow A$ or $A \rightarrow B \rightarrow C \rightarrow A$) paralyze execution workflows and are strictly rejected.

### 3.1 Algorithm: Breadth-First Search (BFS) Reachability

When a user requests to add a directed edge $A \xrightarrow{\text{BLOCKS}} B$:

1. Check for immediate self-dependency ($A == B$): rejected immediately (`400 Bad Request`, `SELF_DEPENDENCY`).
2. Query all existing `BLOCKS` dependencies in the same `projectId`.
3. Build adjacency list $G = (V, E)$ containing only `BLOCKS` edges.
4. Execute BFS traversal starting from target node $B$:
   $$\text{Queue} \leftarrow [B], \quad \text{Visited} \leftarrow \{B\}$$
   While $\text{Queue}$ is not empty:
   - Dequeue $u$.
   - If $u == A$, **a path from $B$ to $A$ already exists!** Adding $A \rightarrow B$ would close a cycle. Reject immediately (`400 Bad Request`, `DEPENDENCY_CYCLE_DETECTED`).
   - For each neighbor $v$ in $G[u]$:
     - If $v \notin \text{Visited}$: add $v$ to $\text{Visited}$ and enqueue $v$.
5. If BFS completes without reaching $A$, the graph remains a strict DAG. Insert the dependency.

### 3.2 Complexity & Invariants

- **Time Complexity**: $O(V + E)$ where $V$ is tasks in project and $E$ is blocking edges. For project-scoped graphs ($< 50,000$ tasks), traversal completes in $< 2\text{ms}$.
- **Space Complexity**: $O(V + E)$ for adjacency map and visited set.
- **Independence of `RELATES_TO`**: `RELATES_TO` edges are omitted from the adjacency list and **never participate in cycle detection**.

---

## 4. Authorization Matrix

| Role                            | View Dependencies & Graph | Add Dependency | Delete Dependency |
| :------------------------------ | :-----------------------: | :------------: | :---------------: |
| **Org OWNER / ADMIN**           |            ✅             |       ✅       |        ✅         |
| **Project LEAD**                |            ✅             |       ✅       |        ✅         |
| **Project ADMIN**               |            ✅             |       ✅       |        ✅         |
| **Project MEMBER**              |            ✅             |       ✅       |        ✅         |
| **Project VIEWER**              |            ✅             |    ❌ (403)    |     ❌ (403)      |
| **Non-Member / Foreign Tenant** |         ❌ (403)          |    ❌ (403)    |     ❌ (403)      |

---

## 5. REST API Endpoints

### 5.1 Task Dependency Endpoints

Mounted under `/api/v1/organizations/:organizationId/projects/:projectId/tasks/:taskId/dependencies`:

| Method   | Route            | Payload                                                                  | Purpose                                                                 | Access Control                         |
| :------- | :--------------- | :----------------------------------------------------------------------- | :---------------------------------------------------------------------- | :------------------------------------- |
| `GET`    | `/`              | —                                                                        | Get task dependencies categorized into `blockedBy`, `blocks`, `related` | Project Member / Admin / Lead / Viewer |
| `POST`   | `/`              | `{ targetTaskId: UUID, type: "BLOCKS" \| "BLOCKED_BY" \| "RELATES_TO" }` | Create dependency (idempotent duplicate rejection & cycle validation)   | Project Member / Admin / Lead          |
| `DELETE` | `/:dependencyId` | —                                                                        | Remove dependency relationship (preserves both tasks)                   | Project Member / Admin / Lead          |

### 5.2 Project Dependency Graph Endpoint

Mounted under `/api/v1/organizations/:organizationId/projects/:projectId/dependencies/graph`:

| Method | Route | Purpose                                                               | Access Control                         |
| :----- | :---- | :-------------------------------------------------------------------- | :------------------------------------- |
| `GET`  | `/`   | Retrieve complete project DAG (`nodes` and `edges`) for visualization | Project Member / Admin / Lead / Viewer |

---

## 6. Database Constraints & Migration Safety

- **Migration**: `20260903030000_add_task_dependencies_foundation`.
- **Database Foreign Key**: Foreign key on `projectId` referencing `projects(id) ON DELETE CASCADE`.
- **Composite Unique Index**: `@@unique([predecessorId, successorId])`.
- **Self-Dependency Constraint**: PostgreSQL check constraint `CHECK ("predecessorId" != "successorId")`.
- **Performance Indexes**:
  - `@@index([projectId])`: Fast project-wide DAG loading.
  - `@@index([predecessorId])`: Fast lookup of outgoing blocking dependencies.
  - `@@index([successorId])`: Fast lookup of incoming blockers.
