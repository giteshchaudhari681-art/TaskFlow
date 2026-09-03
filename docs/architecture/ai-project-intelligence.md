# TaskFlow Architecture — AI Project Intelligence & Recommendations (PR 20)

## Executive Summary

TaskFlow's **AI Project Intelligence** capability is an interpretive, advisory engine embedded within the Project Command Center dashboard. Rather than relying on static rules alone or handing core operational governance to non-deterministic LLMs, TaskFlow implements a **grounded advisory model**:

1. **Authoritative Deterministic Foundation (PR 14)**: The Project Health Engine remains strictly authoritative for quantitative project health state (`ON_TRACK`, `AT_RISK`, `CRITICAL`, `NO_DATA`), canonical completion percentages, blocker DAG chain detection, and milestone deadlines.
2. **Interpretive Qualitative Layer (PR 20)**: The AI service consumes bounded, sanitized project telemetry produced by the deterministic engine and synthesizes:
   - **Executive Synthesis**: What is progressing smoothly and overall project trajectory.
   - **Actionable Recommendations**: Prioritized actions (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) categorized into domain concerns (`BLOCKER`, `DELIVERY_RISK`, `MILESTONE`, `PRIORITY`, `OWNERSHIP`, `WORKLOAD`, `PROCESS`).
   - **Attention Areas**: Focused operational items requiring immediate management review.

---

## Architectural Separation of Concerns

```
┌────────────────────────────────────────────────────────────────────────┐
│               DETERMINISTIC ENGINE (PR 14 — AUTHORITATIVE)             │
│  - Project Health State (ON_TRACK / AT_RISK / CRITICAL / NO_DATA)       │
│  - Exact Mathematical Health Score (0 - 100)                           │
│  - Canonical Completion Percentage Formula                             │
│  - Topological Blocker Chain Analysis & Dependency Cycles             │
│  - Milestone Health Evaluation & Target Date Calculations              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Bounded Telemetry Payload
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 AI INTELLIGENCE LAYER (PR 20 — ADVISORY)               │
│  - Explains WHY signals are occurring in clear, executive language    │
│  - Highlights key delivery risks & trade-offs                          │
│  - Formulates concrete, prioritized next steps for engineering leads   │
│  - Strictly advisory — CANNOT alter project state or database entities │
└────────────────────────────────────────────────────────────────────────┘
```

### What AI is Responsible For:

- Reading live, bounded telemetry from the deterministic engine.
- Synthesizing qualitative executive summaries.
- Suggesting tactical next steps grounded strictly in existing tasks and blockers.
- Identifying ownership gaps or milestone trajectory concerns.

### What AI is FORBIDDEN From Doing:

- Altering project health state, score, or risk levels.
- Reassigning tasks, modifying deadlines, or mutating database entities automatically.
- Hallucinating non-existent tasks, assignees, dates, or metrics.
- Direct database access (Python AI service is strictly stateless and internal).
- Direct browser communication (all traffic routes through Node.js API with JWT authentication and RBAC).

---

## End-to-End Request Pipeline

```
[Browser: React SPA]
        │
        │  POST /api/v1/organizations/:orgId/projects/:projectId/ai/analyze
        │  Headers: Authorization: Bearer <JWT>, X-Request-ID: <UUID>
        ▼
[Node.js Express API]
        │  1. Authentication & RBAC Verification (Owner, Admin, Member; Viewers rejected)
        │  2. Abuse Protection / Rate Limiting (10 req/min per IP on AI endpoint)
        │  3. aiContextBuilder: Assembles PR14 health, delivery risks, tasks, milestones
        │
        │  Internal HTTP POST /ai/analyze
        │  Headers: X-TaskFlow-Service-Token: <SECRET>, X-Request-ID: <UUID>
        ▼
[Python FastAPI AI Subsystem]
        │  1. Internal Service Token Authentication
        │  2. Pydantic Request Validation (AIAnalysisRequest)
        │  3. Strict System Prompt Construction & Context Grounding
        │  4. AsyncOpenAI (gpt-4o-mini, json_object response format, temp=0.3)
        │  5. Upstream Response Validation via Pydantic (AIAnalysisResponse)
        ▼
[Node.js Express API]
        │  1. Defense-in-depth Zod Validation (aiAnalysisResponseSchema)
        │  2. Return JSON envelope: { success: true, data: AIAnalysisResponse }
        ▼
[Browser: React SPA]
        Renders AIProjectIntelligence component within Project Dashboard View
```

---

## Strict Grounding & Behavioral Rules

The Python AI prompt enforces seven inviolable constraints on every completion:

1. **Context Grounding**: Base recommendations and insights ONLY on the supplied telemetry and context.
2. **Zero Hallucination**: Never invent tasks, milestones, metrics, assignees, dates, or non-existent risks.
3. **Fact vs. Recommendation**: Clearly distinguish observed database facts from advisory suggestions.
4. **No Retroactive Claims**: Do NOT claim an action has already taken place.
5. **Advisory Invariance**: All recommendations and priorities are advisory and do not alter deterministic project health.
6. **Sparse Data Handling**: If the project has `NO_DATA` or zero tasks, explicitly indicate that more tasks/milestones are needed rather than fabricating context.
7. **Actionable Taxonomy**: Recommendations are mapped to controlled enums:
   - Priority: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`
   - Category: `BLOCKER`, `DELIVERY_RISK`, `MILESTONE`, `PRIORITY`, `OWNERSHIP`, `WORKLOAD`, `PROCESS`, `RISK_MITIGATION`, `PLANNING`, `QUALITY`, `RESOURCE`

---

## Defense-in-Depth Schema Validation

TaskFlow enforces structured validation at every boundary:

1. **Python Pydantic Layer**: Validates upstream OpenAI completion JSON against `AIAnalysisResponse`, `AIRecommendation`, and `AIAttentionArea`.
2. **HTTP Service Token Boundary**: Ensures only the authenticated Node backend can invoke the Python AI container.
3. **Node Zod Layer**: The Node API does not trust raw responses from Python; it validates the payload against `aiAnalysisResponseSchema` from `@taskflow/validation`.
4. **TypeScript Frontend Layer**: React components consume strongly-typed interfaces from `@taskflow/shared`.

---

## Observability & Sentry Integration

As established in PR 19:

- All AI operations carry the end-to-end `X-Request-ID` correlation header across React, Node, Python, and upstream provider logs.
- Unexpected upstream failures (502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout) are automatically captured in Sentry with correlated breadcrumbs and scrubbed PII.
- Rate limit violations (429) and RBAC authorization blocks (403) are filtered from Sentry error alerts to prevent noise.

---

## Cost Control & Rate Limiting

To mitigate uncontrolled LLM provider expenditure:

- AI analysis is strictly **on-demand**; it is never triggered on page load loops or background polling intervals.
- The React UI disables the action button and prevents concurrent in-flight requests.
- The Express route `/api/v1/organizations/:organizationId/projects/:projectId/ai/analyze` is governed by a dedicated rate limiter allowing up to 10 requests per minute per IP.
