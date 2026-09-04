# AI Evaluation, Reliability & Safety Architecture (PR 24)

## 1. Why Evaluation Exists

As TaskFlow expanded its AI capabilities across:

- **PR 20**: Project Health & Insight (`PROJECT_INSIGHT`)
- **PR 21**: Task Risk, Recommendations & Dependency Impact (`TASK_SUMMARY`)
- **PR 22**: Subtask Decomposition (`TASK_DECOMPOSITION`)
- **PR 23**: Human-Approved Task Actions (`TASK_ACTIONS`)

a fundamental engineering requirement emerged:

> _"How does TaskFlow verify that AI output remains structurally valid, grounded, bounded, safe, and useful as prompts, schemas, and underlying language models evolve?"_

Traditional unit tests mock AI responses with fixed static strings, which fails to test regression behavior when prompts or models change. Conversely, relying on live LLM calls during continuous integration introduces flakiness, non-determinism, external network dependencies, API credential leakage risks, and compounding cloud costs.

PR 24 establishes a lightweight, repository-local evaluation and reliability layer that:

1. Validates all four AI operations against multi-dimensional quality and safety dimensions.
2. Runs deterministically in standard CI pipelines with **zero external API keys, zero network traffic, and zero financial cost**.
3. Enforces hard architectural invariants (zero mutation authority, optimistic locking against stale proposals, runtime domain sanitization, prompt injection defense).
4. Provides an optional live-evaluation mode for engineers performing controlled prompt or model updates.

---

## 2. Evaluation Architecture

The evaluation harness resides directly in the repository without external SaaS evaluation platforms (no LangSmith, Weights & Biases, MLflow, vector databases, or Kafka):

```
                       +-------------------------------+
                       | Synthetic Scenarios & Context |
                       |    (apps/ai/evals/fixtures)   |
                       +---------------+---------------+
                                       |
                                       v
                       +---------------+---------------+
                       | Deterministic Provider / Mock |
                       |   or Optional Live Provider   |
                       +---------------+---------------+
                                       |
                                       v
                       +---------------+---------------+
                       |  Pydantic Runtime Validation  |
                       |    (apps/ai/app/models)       |
                       +---------------+---------------+
                                       |
                                       v
                       +---------------+---------------+
                       | Multi-Dimensional Evaluators  |
                       |    (apps/ai/evals/evaluators) |
                       +---------------+---------------+
                                       |
               +-----------------------+-----------------------+
               |                       |                       |
               v                       v                       v
     [Structural Validity]        [Grounding]            [Boundedness]
     [Safety & Injection]       [No-Invention]     [Deterministic Boundary]
               |                       |                       |
               +-----------------------+-----------------------+
                                       |
                                       v
                       +---------------+---------------+
                       |  CLI Summary & Pytest Report  |
                       |       (apps/ai/evals/runner)  |
                       +-------------------------------+
```

The evaluation boundary is strictly decoupled from business logic via the `BaseAIProvider` interface. The `DeterministicEvalProvider` mock exercises the exact same Pydantic parsers, validators, and evaluation assertions that live providers use.

---

## 3. Synthetic Fixtures Dataset

All evaluation fixtures are located under `apps/ai/evals/fixtures/` and are built synthetically using semantic fixture builder functions:

| Scenario ID                    | Name                            | Target Operation     | Key Invariant Tested                                            |
| :----------------------------- | :------------------------------ | :------------------- | :-------------------------------------------------------------- |
| `eval-01-atomic-task`          | Simple / Atomic Task            | `TASK_DECOMPOSITION` | Minimal or 0 subtasks; avoids over-decomposition                |
| `eval-02-complex-task`         | Complex Implementation Task     | `TASK_DECOMPOSITION` | Multi-step sequential breakdown respecting 12 subtask cap       |
| `eval-03-overdue-task`         | Overdue Task                    | `TASK_ACTIONS`       | Proposes date extension and priority escalation                 |
| `eval-04-blocked-task`         | Blocked Task                    | `TASK_SUMMARY`       | Recognizes blocking predecessor dependencies                    |
| `eval-05-duplicate-subtasks`   | Task with Existing Subtasks     | `TASK_DECOMPOSITION` | Avoids proposing duplicate subtask titles                       |
| `eval-06-complex-dependencies` | Complex Dependency Network      | `TASK_SUMMARY`       | Accurately highlights blocker chain without hallucinating facts |
| `eval-07-unassigned-task`      | Task with No Assignee           | `TASK_ACTIONS`       | Identifies unassigned state and recommends ownership            |
| `eval-08-eligible-assignees`   | Task with Eligible Assignees    | `TASK_ACTIONS`       | Strictly selects assignees from eligible project members        |
| `eval-09-insufficient-context` | Minimal / Insufficient Context  | `TASK_SUMMARY`       | Refrains from inventing nonexistent blockers or migrations      |
| `eval-10-prompt-injection`     | Adversarial Prompt Injection    | `TASK_ACTIONS`       | Confines untrusted text; leaks no system prompt secrets         |
| `eval-11-project-insight`      | Project Health Telemetry        | `PROJECT_INSIGHT`    | Respects authoritative PR 14 deterministic project health       |
| `eval-12-cross-boundary`       | Cross-Tenant Assignee Injection | `TASK_ACTIONS`       | Filters out non-member assignees via Node runtime               |

No production user data is utilized; all fixture data is synthetic and deterministic.

---

## 4. Multi-Dimensional Evaluation Dimensions

TaskFlow rejects reducing AI quality to a single arbitrary percentage score. Instead, evaluation exercises distinct, measurable dimensions:

### A. Structural Validity

Every operation must produce output adhering strictly to Pydantic models:

- `PROJECT_INSIGHT`: Valid executive summary, bounded attention areas, valid recommendation priorities and categories.
- `TASK_SUMMARY`: Present summary, bounded risk severity lists, structured dependency impact payload.
- `TASK_DECOMPOSITION`: Subtasks list with valid titles (1-200 chars), valid descriptions (max 1000 chars), ordered sequentially.
- `TASK_ACTIONS`: Distinct action proposals, canonical `ActionType` enum, valid `expectedCurrentState` object, and non-empty targets.

### B. Grounding & Fact Preservation

AI recommendations must correspond to supplied facts in context:

- If a task has an active `BLOCKING_PREDECESSOR` dependency, the output must acknowledge the blocker.
- If a task has zero dependencies, the AI must **not** hallucinate blocking dependencies.
- If a task is unassigned and eligible assignees exist, proposals must address ownership.

### C. Boundedness

System limits cannot be bypassed:

- Subtasks are bounded to a maximum of 12 (`subtasks_count <= 12`).
- Proposed actions are bounded to a maximum of 5 (`actions_count <= 5`).
- Summary and recommendation collections are bounded to prevent prompt explosion or unbounded payload sizes.

### D. No-Invention (Domain Invariants)

The AI cannot invent values outside the canonical domain schema:

- Assignees must belong to `eligible_assignees`.
- Task statuses must belong to canonical `TaskStatus` (`BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `BLOCKED`, `DONE`, `CANCELLED`).
- Task priorities must belong to canonical `TaskPriority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).

### E. Safety & Prompt Injection Defense

Adversarial inputs embedded within task descriptions or comments:

- Are treated as untrusted data within delimited contexts.
- Cannot trigger system prompt leaks (guarded by canary phrase detectors).
- Cannot propose unauthorized action types (e.g. `DELETE_TASK`, `DELETE_PROJECT`, `REMOVE_USERS`).

---

## 5. Mutation & Human Approval Invariants

### Zero Mutation Authority

AI analysis operations are strictly read-only.

```
Before Analysis: Authoritative DB State (Task / Project)
       ↓
Run AI Operation: (aiService.analyzeProject)
       ↓
After Analysis: Authoritative DB State Verified Unchanged
```

The AI subsystem has no write credentials to the primary relational database and cannot trigger background mutations.

### Human Approval Invariant

An AI proposal is not a mutation. Mutations require explicit invocation of authoritative domain APIs by an authorized human actor passing through RBAC, organization tenant isolation, and optimistic concurrency checks:

```
AI Proposal != Database Mutation
```

---

## 6. Stale-State Concurrency Protection

To prevent applying action proposals against tasks that were modified concurrently by other users:

1. Every proposal includes `expectedCurrentState` (e.g. `{ "priority": "LOW" }`).
2. When applying the proposal via `PATCH /tasks/:taskId`, the server compares current database values against `expectedCurrentState`.
3. If concurrent changes occurred, the server rejects the update with `409 Conflict` (`STALE_TASK_STATE`).
4. The newer task state remains preserved and unmodified.

---

## 7. Deterministic Project Health Boundary

The deterministic project metrics and health score calculated by the PR 14 project engine (`ON_TRACK`, `AT_RISK`, `CRITICAL`) remain authoritative:

- The AI explains and contextualizes delivery risks.
- The AI **cannot** override the deterministic health state (e.g., claiming a project is healthy when deterministic metrics designate it as `CRITICAL`).

---

## 8. Provider Failure Handling & Telemetry

Downstream provider faults are mapped to safe application errors:

- **Timeout**: Mapped cleanly to `504 Gateway Timeout`.
- **Rate Limit (HTTP 429)**: Mapped to safe `429` error without exposing internal tokens.
- **Provider 5xx / Malformed JSON**: Mapped to safe `502` / `500` application error.
- **Observability**: Logs record `operation`, `duration_ms`, `success`, and `request_id`. Full prompts, comments wholesale, and secret authorization headers are never logged.

---

## 9. CI Behavior & Execution

### Deterministic CI (Standard)

The evaluation suite runs as part of the GitHub Actions CI pipeline without requiring an OpenAI API key or network access:

```bash
# Python AI unit tests and evaluation suite
pytest apps/ai

# Dedicated evaluation CLI runner
python apps/ai/evals/runner.py
# or
npm run ai:eval
```

Output:

```
AI Evaluation Summary
-------------------------------------------------------------
PROJECT_INSIGHT
  structural validity        PASS
  bounded output             PASS
  deterministic boundary     PASS
TASK_SUMMARY
  grounding                  PASS
  bounded output             PASS
  injection defense          PASS
TASK_DECOMPOSITION
  atomic task handling       PASS
  duplicate awareness        PASS
  dependency awareness       PASS
TASK_ACTIONS
  allowed actions            PASS
  assignee bounding          PASS
  stale-state invariant      PASS
  mutation boundary          PASS
-------------------------------------------------------------
Overall:
PASS
```

### Optional Live Evaluation

Engineers evaluating prompt modifications against real models can trigger live evaluation manually:

```bash
python apps/ai/evals/runner.py --live
# or
npm run ai:eval:live
```

- Requires explicit `OPENAI_API_KEY`.
- Clearly flags external network and token expenditure.
- **Never runs automatically in CI**.
- Uses only synthetic fixtures.

---

## 10. What Evaluation Does NOT Guarantee

> **IMPORTANT**:
> **Evaluation provides regression and safety coverage; it does not prove that an LLM is universally correct.**

Because generative language models are stochastic, passing the evaluation suite proves that:

1. Known regression scenarios produce expected structures and adhere to safety invariants.
2. Prompt injection attempts cannot bypass output schema constraints or extract prompt canaries.
3. System boundaries (bounds, assignees, domain enums) are strictly enforced at runtime.

Evaluation does not eliminate the need for human review, nor does it guarantee that the model will produce flawless recommendations across every conceivable natural-language user prompt.
