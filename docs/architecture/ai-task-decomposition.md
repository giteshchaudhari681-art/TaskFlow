# AI-Assisted Task Decomposition Architecture (PR 22)

## 1. Executive Summary

**AI-Assisted Task Decomposition** provides engineering teams with structured, actionable subtask proposals to break down complex tasks into manageable work units.

It adheres to the foundational TaskFlow AI architecture established in PR 15, PR 16, PR 20, and PR 21 by utilizing the single authoritative endpoint (`POST /api/v1/organizations/:organizationId/projects/:projectId/ai/analyze`) with `operation: AIOperation.TASK_DECOMPOSITION` and scoped `taskId`.

### Human-in-the-Loop Safety Invariant

> **CRITICAL ARCHITECTURAL INVARIANT**:
> The AI engine possesses **zero direct database mutation authority**. The AI service never creates subtasks directly in the database, has no database write connections, and receives no tool-calling functions with write permissions.
>
> Subtasks are **only created** when:
>
> 1. A human user reviews the proposed subtasks in the frontend UI.
> 2. The user edits or selects specific items.
> 3. The user explicitly clicks **"Create Selected Subtasks"**.
> 4. The frontend calls the existing, authoritative `POST .../tasks/:taskId/subtasks` endpoint under the user's authenticated session, undergoing full RBAC and business logic validation.

---

## 2. Core Architecture & Request Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          React Frontend (apps/web)                          │
│                                                                             │
│   TaskDetailDrawer.tsx ──> <AITaskIntelligence />                           │
│   Modes: [Assessment] | [Breakdown]                                         │
│                                                                             │
│   In Breakdown Mode:                                                        │
│   - Idle: "Suggest Breakdown" button + optional focus prompt                │
│   - Loading: Pulsing skeleton during generation                             │
│   - Review UI:                                                              │
│     * Checklist of proposed subtasks (ordered, categorized)                 │
│     * Duplicate detection against existing subtasks (unselected by default) │
│     * Inline editable titles                                                │
│     * Advisory notes & executive decomposition scope summary                │
│     * User explicitly selects items & clicks "Create Selected Subtasks"     │
└───────────────────────┬───────────────────────────────┬─────────────────────┘
                        │                               │
       (1) POST /ai/analyze                             │ (2) POST .../subtasks
       { operation: 'TASK_DECOMPOSITION', taskId }      │ (One per selected item)
                        ▼                               ▼
┌─────────────────────────────────────────────────┐ ┌─────────────────────────┐
│       Node.js Authoritative API (apps/api)      │ │ Existing Subtask API    │
│                                                 │ │ (Normal RBAC, Tenant    │
│   1. Authenticate JWT & verify tenant boundary  │ │ Isolation, Audit Log,   │
│   2. Enforce Project RBAC (VIEWER restricted)   │ │ and Order Auto-Assign)  │
│   3. Validate task belongs to target project    │ └─────────────────────────┘
│   4. AIContextBuilder:                          │
│      - Task details, description, status        │
│      - Existing subtasks (for duplicate defense)│
│      - Active dependencies & blockers           │
│      - Project metadata & progress context      │
│   5. Dispatch to internal AI microservice       │
└───────────────────────┬─────────────────────────┘
                        │ Internal HTTP + Shared Secret
                        │ POST /ai/analyze
                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Python AI Microservice (apps/ai)                       │
│                                                                             │
│   1. Validate Pydantic v2 Request Models                                    │
│   2. Prompt Injection Hardening & Grounding Rules:                          │
│      - 3-12 bounded, concrete subtasks                                      │
│      - Duplicate avoidance: compare against existing subtasks in context    │
│      - Dependency awareness: respect predecessor blocker chains             │
│      - Atomic tasks: return empty subtasks list if already focused          │
│      - Untrusted user data containment                                      │
│   3. OpenAI ChatCompletion (gpt-4o-mini, json_object)                       │
│   4. Pydantic Response Validation (AIDecomposedSubtask, subtasks, notes)    │
│   5. Return structured proposal payload                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Grounding & Anti-Hallucination Guardrails

1. **Duplicate Avoidance**:
   - The context builder provides all existing subtasks on the target task.
   - The LLM is instructed: `"Review existing subtasks in context and NEVER propose duplicate or overlapping items."`
   - The frontend independently checks normalized titles against existing subtasks, flags matching items with an `"Already exists"` badge, and unchecks them by default.

2. **Atomic / Simple Tasks**:
   - If a task is small or already completed, the LLM returns an empty subtasks array with a concise explanation in `summary` rather than inventing unnecessary work.
   - The frontend renders an informative empty card indicating no further breakdown is necessary.

3. **Prompt Injection Containment**:
   - Task descriptions, subtask titles, and comments are treated strictly as untrusted user data.
   - Prompt instructions are never executed if found inside task descriptions or comments.

4. **Bounded Decomposition**:
   - The number of proposed subtasks is capped at 12 items.
   - Subtask titles are capped at 200 characters; descriptions are capped at 1000 characters.

---

## 4. Shared Contracts & Types

### Shared Interface (`@taskflow/shared`):

```ts
export interface AIDecomposedSubtask {
  title: string;
  description?: string;
  priority?: RecommendationPriority;
  order: number;
}

export interface AIAnalysisResponse {
  request_id: string;
  operation: AIOperation;
  summary: string;
  recommendations: AIRecommendation[];
  attention_areas?: AIAttentionArea[];
  dependency_impact?: AIDependencyImpact;
  subtasks?: AIDecomposedSubtask[];
  notes?: string[];
  metadata: Record<string, unknown>;
}
```

---

## 5. Security & RBAC Boundary

- **Authentication**: All requests require a valid user JWT bearer token.
- **Tenant Isolation**: Tasks and projects are strictly validated against the user's active organization ID.
- **RBAC**: Project `VIEWER` roles are rejected with `403 Forbidden` for all AI analysis endpoints.
- **Auditing**: Individual subtask creation triggered from human approval passes through the standard audit trail and activity log system.
