# TaskFlow — Database Architecture & Entity Implementation

## 1. Database Overview

TaskFlow uses **PostgreSQL** paired with **Prisma ORM** as its primary relational datastore. PostgreSQL provides native ACID guarantees, relational integrity, JSONB support for dynamic AI telemetry, and performant B-Tree indexing for complex hierarchical queries.

The Prisma schema is defined at [`apps/api/prisma/schema.prisma`](file:///d:/TaskFlow/apps/api/prisma/schema.prisma) and migrations reside at [`apps/api/prisma/migrations/`](file:///d:/TaskFlow/apps/api/prisma/migrations/).

---

## 2. Entity Dictionary & Implementation

### 1. User (`users`)

- **Purpose**: Represents an individual user identity.
- **Fields**: `id (UUID)`, `email (unique)`, `passwordHash`, `name`, `avatarUrl`, `createdAt`, `updatedAt`.
- **Relationships**:
  - 1-to-Many `OrganizationMember` (`Cascade` on delete)
  - 1-to-Many `ProjectMember` (`Cascade` on delete)
  - 1-to-Many `Task` as Assignee (`SetNull` on delete)
  - 1-to-Many `Task` as Reporter (`SetNull` on delete)
  - 1-to-Many `Subtask` as Assignee (`SetNull` on delete)
  - 1-to-Many `Comment`, `Attachment`, `Activity`, `Notification`, `PlannerItem`, `Discussion`.
- **Indexes**: `UNIQUE(email)`.
- **Security**: Passwords hashed with bcrypt; excluded from standard client projections.

### 2. Organization (`organizations`)

- **Purpose**: Top-level multi-tenant container for all projects, users, and billing/settings.
- **Fields**: `id (UUID)`, `name`, `slug (unique)`, `logoUrl`, `createdAt`, `updatedAt`.
- **Relationships**: 1-to-Many `OrganizationMember` (`Cascade`), 1-to-Many `Project` (`Cascade`), 1-to-Many `Label` (`Cascade`).
- **Indexes**: `UNIQUE(slug)`.
- **Security**: Tenant boundary. All queries enforce organization context.

### 3. OrganizationMember (`organization_members`)

- **Purpose**: Maps user membership and organization-level role (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`).
- **Fields**: `id (UUID)`, `organizationId (UUID)`, `userId (UUID)`, `role (UserRole)`, `joinedAt`.
- **Relationships**: Belongs to `Organization` (`Cascade`), belongs to `User` (`Cascade`).
- **Indexes**: `UNIQUE(organizationId, userId)`, `INDEX(userId)`.

### 4. Project (`projects`)

- **Purpose**: Autonomous workstream with custom key, workflow states, and settings.
- **Fields**: `id (UUID)`, `organizationId (UUID)`, `name`, `key`, `description`, `status (ProjectStatus)`, `createdAt`, `updatedAt`.
- **Relationships**:
  - Belongs to `Organization` (`Cascade`)
  - 1-to-Many `ProjectMember`, `Objective`, `Milestone`, `Task`, `Discussion`, `Activity`, `ProjectInsight`, `AIRecommendation` (`Cascade` on delete).
- **Indexes**: `UNIQUE(organizationId, key)`, `INDEX(organizationId, status)`.

### 5. ProjectMember (`project_members`)

- **Purpose**: Controls explicit project-level access and permissions (`LEAD`, `MEMBER`, `VIEWER`).
- **Fields**: `id (UUID)`, `projectId (UUID)`, `userId (UUID)`, `role (ProjectRole)`, `joinedAt`.
- **Relationships**: Belongs to `Project` (`Cascade`), belongs to `User` (`Cascade`).
- **Indexes**: `UNIQUE(projectId, userId)`, `INDEX(userId)`.

### 6. Objective (`objectives`)

- **Purpose**: High-level strategic OKR/Goal that groups related milestones and tasks.
- **Fields**: `id (UUID)`, `projectId (UUID)`, `title`, `description`, `status (ObjectiveStatus)`, `targetDate`, `createdAt`, `updatedAt`.
- **Relationships**: Belongs to `Project` (`Cascade`), 1-to-Many `Task` (`SetNull`).
- **Indexes**: `INDEX(projectId)`.

### 7. Milestone (`milestones`)

- **Purpose**: Fixed delivery checkpoint or release target with target completion date.
- **Fields**: `id (UUID)`, `projectId (UUID)`, `title`, `description`, `dueDate`, `status (MilestoneStatus)`, `progressPercent`, `createdAt`, `updatedAt`.
- **Relationships**: Belongs to `Project` (`Cascade`), 1-to-Many `Task` (`SetNull`).
- **Indexes**: `INDEX(projectId, dueDate)`.

### 8. Task (`tasks`)

- **Purpose**: Primary unit of work and dependency modeling.
- **Fields**: `id (UUID)`, `taskNumber (INT)`, `projectId (UUID)`, `title`, `description`, `status (TaskStatus)`, `priority (TaskPriority)`, `assigneeId (UUID?)`, `reporterId (UUID?)`, `milestoneId (UUID?)`, `objectiveId (UUID?)`, `dueDate`, `estimateHours`, `createdAt`, `updatedAt`.
- **Relationships**:
  - Belongs to `Project` (`Cascade`)
  - Belongs to `User` (Assignee/Reporter) (`SetNull` on delete)
  - Belongs to `Milestone` / `Objective` (`SetNull` on delete)
  - 1-to-Many `Subtask`, `TaskDependency` (as predecessor and successor), `TaskLabel`, `Comment`, `Attachment`, `Activity`, `PlannerItem` (`Cascade` on delete).
- **Indexes**: `UNIQUE(projectId, taskNumber)`, `INDEX(projectId, status)`, `INDEX(assigneeId)`, `INDEX(dueDate)`, `INDEX(milestoneId)`, `INDEX(objectiveId)`.

### 9. TaskDependency (`task_dependencies`)

- **Purpose**: Defines relational DAG constraints between tasks (`BLOCKS`, `BLOCKED_BY`, `RELATES_TO`).
- **Fields**: `id (UUID)`, `predecessorId (UUID)`, `successorId (UUID)`, `type (DependencyType)`, `createdAt`.
- **Relationships**: Belongs to `predecessor (Task)` (`Cascade`), belongs to `successor (Task)` (`Cascade`).
- **Indexes**: `UNIQUE(predecessorId, successorId)`, `INDEX(successorId)`.

### 10. Subtask (`subtasks`)

- **Purpose**: Lightweight checklist items inside a task.
- **Fields**: `id (UUID)`, `taskId (UUID)`, `title`, `isCompleted`, `order`, `assigneeId (UUID?)`, `createdAt`, `updatedAt`.
- **Relationships**: Belongs to `Task` (`Cascade`), belongs to `User` (`SetNull`).
- **Indexes**: `INDEX(taskId, order)`.

### 11. Label (`labels`) & TaskLabel (`task_labels`)

- **Purpose**: Categorization tags scoped to an organization.
- **Fields**: `Label: id, organizationId, name, colorHex, createdAt`. `TaskLabel: id, taskId, labelId, createdAt`.
- **Relationships**: Many-to-Many between `Task` and `Label` through `TaskLabel` (`Cascade` on both).
- **Indexes**: `UNIQUE(organizationId, name)` on `Label`, `UNIQUE(taskId, labelId)` on `TaskLabel`, `INDEX(labelId)`.

### 12. Discussion (`discussions`)

- **Purpose**: Dedicated discussion topics and RFCs scoped to a project.
- **Fields**: `id (UUID)`, `projectId (UUID)`, `authorId (UUID?)`, `title`, `content`, `createdAt`, `updatedAt`.
- **Relationships**: Belongs to `Project` (`Cascade`), belongs to `User` (`SetNull`), 1-to-Many `Comment` (`Cascade`).
- **Indexes**: `INDEX(projectId, createdAt)`.

### 13. Comment (`comments`)

- **Purpose**: Threaded discussions on tasks or project topics.
- **Fields**: `id (UUID)`, `taskId (UUID?)`, `discussionId (UUID?)`, `authorId (UUID?)`, `parentId (UUID?)`, `content`, `createdAt`, `updatedAt`.
- **Relationships**: Belongs to `Task` (`Cascade`), belongs to `Discussion` (`Cascade`), belongs to `User` (`SetNull`), self-referencing `parent/replies` (`Cascade`).
- **Indexes**: `INDEX(taskId, createdAt)`, `INDEX(discussionId, createdAt)`.

### 14. Attachment (`attachments`)

- **Purpose**: Metadata for files uploaded to secure storage.
- **Fields**: `id (UUID)`, `taskId (UUID)`, `uploadedById (UUID?)`, `filename`, `fileUrl`, `fileSize`, `mimeType`, `createdAt`.
- **Relationships**: Belongs to `Task` (`Cascade`), belongs to `User` (`SetNull`).
- **Indexes**: `INDEX(taskId)`.

### 15. Activity (`activities`)

- **Purpose**: Immutable audit ledger for project and task mutations.
- **Fields**: `id (UUID)`, `projectId (UUID?)`, `taskId (UUID?)`, `actorId (UUID?)`, `actionType (ActivityActionType)`, `fieldChanged`, `oldValue`, `newValue`, `metadata (JSONB)`, `createdAt`.
- **Relationships**: Belongs to `Project` (`Cascade`), belongs to `Task` (`Cascade`), belongs to `User` (`SetNull`).
- **Indexes**: `INDEX(taskId, createdAt)`, `INDEX(projectId, createdAt)`.

### 16. Notification (`notifications`)

- **Purpose**: User alert stream for unblocking, assignments, mentions, and delivery risks.
- **Fields**: `id (UUID)`, `userId (UUID)`, `title`, `message`, `linkUrl`, `isRead`, `createdAt`.
- **Relationships**: Belongs to `User` (`Cascade`).
- **Indexes**: `INDEX(userId, isRead, createdAt)`.

### 17. PlannerItem (`planner_items`)

- **Purpose**: Personalized "My Day" agenda and daily task focus.
- **Fields**: `id (UUID)`, `userId (UUID)`, `taskId (UUID?)`, `date (Date)`, `order`, `notes`, `createdAt`, `updatedAt`.
- **Relationships**: Belongs to `User` (`Cascade`), belongs to `Task` (`SetNull`).
- **Indexes**: `INDEX(userId, date)`.

### 18. ProjectInsight (`project_insights`)

- **Purpose**: AI-generated health diagnostics and critical path delivery risks.
- **Fields**: `id (UUID)`, `projectId (UUID)`, `riskLevel (RiskLevel)`, `title`, `summary`, `recommendedAction`, `metadata (JSONB)`, `isDismissed`, `createdAt`, `updatedAt`.
- **Relationships**: Belongs to `Project` (`Cascade`).
- **Indexes**: `INDEX(projectId, riskLevel, isDismissed)`.

### 19. AIRecommendation (`ai_recommendations`)

- **Purpose**: Actionable AI schedule compression and workload balancing proposals.
- **Fields**: `id (UUID)`, `projectId (UUID)`, `type`, `title`, `suggestion`, `impactScore`, `status (RecommendationStatus)`, `metadata (JSONB)`, `createdAt`, `updatedAt`.
- **Relationships**: Belongs to `Project` (`Cascade`).
- **Indexes**: `INDEX(projectId, status)`.

---

## 3. Cascade & Institutional Data Protection

1. **User Account Deletion Safeguards**:
   - `Task.assigneeId` and `Task.reporterId` use `onDelete: SetNull`. Tasks are corporate institutional assets that must not vanish when an employee leaves.
   - `Comment.authorId` and `Activity.actorId` use `onDelete: SetNull`. Historical audit trails remain intact.
2. **Tenant & Project Containment**:
   - Deleting an `Organization` cascades to its `Projects`, `Labels`, and `Memberships`.
   - Deleting a `Project` cascades to its `Tasks`, `Milestones`, `Objectives`, and `Discussions`.
3. **Task Decomposition Deletion**:
   - Deleting a `Task` cleanly cascades to its `Subtasks`, `TaskLabels`, `TaskDependencies`, and task-specific `Comments`.

---

## 4. Prisma Client Architecture

The Prisma Client is instantiated strictly as a singleton in [`apps/api/src/lib/prisma.ts`](file:///d:/TaskFlow/apps/api/src/lib/prisma.ts):

- Configures query logging in development mode.
- Attaches to `globalThis` in development to avoid connection exhaustion during hot module reloading.
- Exports `checkDatabaseHealth()` for low-overhead status probes without credential leakage.

---

## 5. Development Seed Script

A deterministic seed script is provided at [`apps/api/prisma/seed.ts`](file:///d:/TaskFlow/apps/api/prisma/seed.ts):

- Purges development records in reverse dependency order.
- Hashes sample passwords using bcrypt (`TaskFlow2026!Dev`).
- Seeds Organization `TaskFlow Technologies` (`taskflow-hq`), 3 users (`Alex Chen`, `Sam Miller`, `Jordan Taylor`), Project `OPS`, Milestones, Tasks with dependencies (`OPS-2` blocked by `OPS-1`), Discussions, and AI Insights.
- Run via: `npm run prisma:seed`.
