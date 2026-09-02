# TaskFlow — Database Architecture & Entity Blueprint

## Database Overview

TaskFlow uses **PostgreSQL** paired with **Prisma ORM**. PostgreSQL provides native ACID guarantees, relational integrity, JSONB support for dynamic AI metadata, and performant indexing for complex hierarchical queries.

---

## Entity Dictionary

### 1. User

- **Purpose**: Represents an individual platform account.
- **Key Fields**: `id (UUID)`, `email (unique)`, `passwordHash`, `name`, `avatarUrl`, `createdAt`, `updatedAt`.
- **Relationships**:
  - 1-to-Many `OrganizationMember`
  - 1-to-Many `ProjectMember`
  - 1-to-Many `Task` (as Assignee and Reporter)
  - 1-to-Many `Comment`, `Activity`, `Notification`.
- **Indexes**: `UNIQUE(email)`.
- **Security Considerations**: `passwordHash` must never be selected in standard queries; strict email normalization on ingress.

### 2. Organization (Tenant)

- **Purpose**: Top-level multi-tenant container for all projects, users, and billing/settings.
- **Key Fields**: `id (UUID)`, `name`, `slug (unique)`, `logoUrl`, `createdAt`, `updatedAt`.
- **Relationships**: 1-to-Many `OrganizationMember`, 1-to-Many `Project`.
- **Indexes**: `UNIQUE(slug)`.
- **Security Considerations**: Tenant isolation boundary. All queries must enforce organization context.

### 3. OrganizationMember

- **Purpose**: Maps user membership and organization-level role (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`).
- **Key Fields**: `id`, `organizationId`, `userId`, `role`, `joinedAt`.
- **Relationships**: Belongs to `Organization`, belongs to `User`.
- **Indexes**: `UNIQUE(organizationId, userId)`, `INDEX(userId)`.

### 4. Project

- **Purpose**: Autonomous workstream with custom key, workflow states, and settings.
- **Key Fields**: `id`, `organizationId`, `name`, `key (e.g. "ENG")`, `description`, `status`, `createdAt`.
- **Relationships**: Belongs to `Organization`, 1-to-Many `ProjectMember`, `Task`, `Milestone`, `Objective`.
- **Indexes**: `UNIQUE(organizationId, key)`, `INDEX(organizationId, status)`.

### 5. ProjectMember

- **Purpose**: Controls explicit project-level access and permissions (`LEAD`, `MEMBER`, `VIEWER`).
- **Key Fields**: `id`, `projectId`, `userId`, `role`.
- **Relationships**: Belongs to `Project`, belongs to `User`.
- **Indexes**: `UNIQUE(projectId, userId)`.

### 6. Objective

- **Purpose**: High-level strategic OKR/Goal that groups related milestones and tasks.
- **Key Fields**: `id`, `projectId`, `title`, `description`, `targetDate`, `status`.
- **Relationships**: Belongs to `Project`, 1-to-Many `Task`.
- **Indexes**: `INDEX(projectId)`.

### 7. Milestone

- **Purpose**: Fixed delivery checkpoint or release target with target completion date.
- **Key Fields**: `id`, `projectId`, `title`, `dueDate`, `status`, `progressPercent`.
- **Relationships**: Belongs to `Project`, 1-to-Many `Task`.
- **Indexes**: `INDEX(projectId, dueDate)`.

### 8. Task

- **Purpose**: Primary unit of work and dependency modeling.
- **Key Fields**: `id`, `taskNumber (INT, auto-increment per project)`, `projectId`, `title`, `description`, `status`, `priority`, `assigneeId`, `reporterId`, `milestoneId`, `objectiveId`, `dueDate`, `estimateHours`, `createdAt`.
- **Relationships**: Belongs to `Project`, `User (Assignee/Reporter)`, `Milestone`, `Objective`. 1-to-Many `Subtask`, `TaskDependency`, `Comment`, `Attachment`.
- **Indexes**: `UNIQUE(projectId, taskNumber)`, `INDEX(projectId, status)`, `INDEX(assigneeId)`, `INDEX(dueDate)`.

### 9. TaskDependency (Directed Acyclic Graph)

- **Purpose**: Defines relational constraints between tasks (`BLOCKS`, `BLOCKED_BY`, `RELATES_TO`).
- **Key Fields**: `id`, `predecessorId (Task)`, `successorId (Task)`, `type`, `createdAt`.
- **Relationships**: Belongs to two `Task` instances.
- **Indexes**: `UNIQUE(predecessorId, successorId)`, `INDEX(successorId)`.
- **Integrity**: Application layer checks for circular dependency loops before creation.

### 10. Subtask

- **Purpose**: Lightweight checklist items inside a task.
- **Key Fields**: `id`, `taskId`, `title`, `isCompleted`, `order`, `assigneeId`.
- **Relationships**: Belongs to `Task`.
- **Indexes**: `INDEX(taskId, order)`.

### 11. Label & TaskLabel

- **Purpose**: Categorization tags scoped to an organization or project.
- **Key Fields**: `id`, `organizationId`, `name`, `colorHex`.
- **Relationships**: Many-to-Many through `TaskLabel`.
- **Indexes**: `UNIQUE(organizationId, name)`.

### 12. Comment & Discussion

- **Purpose**: Threaded discussions on tasks or project topics.
- **Key Fields**: `id`, `taskId`, `authorId`, `content`, `parentId (for nested replies)`, `createdAt`.
- **Relationships**: Belongs to `Task`, `User`, optional self-relation for parent reply.
- **Indexes**: `INDEX(taskId, createdAt)`.

### 13. Attachment

- **Purpose**: Metadata for files uploaded to secure Cloudinary storage.
- **Key Fields**: `id`, `taskId`, `uploadedById`, `filename`, `fileUrl`, `fileSize`, `mimeType`.
- **Relationships**: Belongs to `Task`, belongs to `User`.
- **Indexes**: `INDEX(taskId)`.

### 14. Activity (Audit Log)

- **Purpose**: Immutable ledger of changes (status transitions, assignments, edits).
- **Key Fields**: `id`, `taskId`, `actorId`, `actionType`, `fieldChanged`, `oldValue`, `newValue`, `createdAt`.
- **Relationships**: Belongs to `Task`, belongs to `User`.
- **Indexes**: `INDEX(taskId, createdAt)`.

### 15. Notification

- **Purpose**: User alert stream for mentions, assignments, due dates, and risk alerts.
- **Key Fields**: `id`, `userId`, `title`, `message`, `linkUrl`, `isRead`, `createdAt`.
- **Relationships**: Belongs to `User`.
- **Indexes**: `INDEX(userId, isRead, createdAt)`.

### 16. PlannerItem ("My Day")

- **Purpose**: User's personalized daily focus and time-blocking planner.
- **Key Fields**: `id`, `userId`, `taskId`, `date`, `order`, `notes`.
- **Relationships**: Belongs to `User`, optional relation to `Task`.
- **Indexes**: `UNIQUE(userId, date, taskId)`.

### 17. ProjectInsight & AIRecommendation

- **Purpose**: AI-generated health diagnostics, delivery bottleneck predictions, and optimization suggestions.
- **Key Fields**: `id`, `projectId`, `riskLevel`, `title`, `summary`, `recommendedAction`, `metadata (JSONB)`, `isDismissed`, `createdAt`.
- **Relationships**: Belongs to `Project`.
- **Indexes**: `INDEX(projectId, riskLevel, isDismissed)`.
