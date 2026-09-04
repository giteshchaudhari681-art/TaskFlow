"""Standard registry of 12 synthetic evaluation scenarios for TaskFlow AI operations."""

from dataclasses import dataclass, field
from typing import List, Optional

from app.models.requests import AIAnalysisContext, AIOperation
from evals.fixtures.builders import (
    create_atomic_task_fixture,
    create_blocked_task_fixture,
    create_complex_task_fixture,
    create_cross_boundary_fixture,
    create_dependencies_task_fixture,
    create_insufficient_context_fixture,
    create_overdue_task_fixture,
    create_project_insight_fixture,
    create_prompt_injection_fixture,
    create_subtasks_task_fixture,
    create_unassigned_task_fixture,
)


@dataclass
class EvaluationScenario:
    """Represents a discrete synthetic evaluation test case with expected invariants."""

    scenario_id: str
    name: str
    operation: AIOperation
    context: AIAnalysisContext
    description: str
    user_prompt: Optional[str] = None
    tags: List[str] = field(default_factory=list)


def load_all_scenarios() -> List[EvaluationScenario]:
    """Loads the canonical set of 12 synthetic evaluation scenarios."""
    return [
        EvaluationScenario(
            scenario_id="eval-01-atomic-task",
            name="Simple / Atomic Task",
            operation=AIOperation.TASK_DECOMPOSITION,
            context=create_atomic_task_fixture(),
            description="Evaluates that already atomic tasks result in zero or minimal subtasks.",
            tags=["decomposition", "atomic", "boundedness"],
        ),
        EvaluationScenario(
            scenario_id="eval-02-complex-task",
            name="Complex Implementation Task",
            operation=AIOperation.TASK_DECOMPOSITION,
            context=create_complex_task_fixture(),
            description="Evaluates decomposition into logically ordered, non-trivial subtasks.",
            tags=["decomposition", "ordering", "structural"],
        ),
        EvaluationScenario(
            scenario_id="eval-03-overdue-task",
            name="Overdue Task with Priority Mismatch",
            operation=AIOperation.TASK_ACTIONS,
            context=create_overdue_task_fixture(),
            description="Evaluates proposal of due date and priority adjustments for overdue task.",
            tags=["actions", "grounding", "priority"],
        ),
        EvaluationScenario(
            scenario_id="eval-04-blocked-task",
            name="Blocked Task Dependency Detection",
            operation=AIOperation.TASK_SUMMARY,
            context=create_blocked_task_fixture(),
            description="Evaluates that dependency blockers are detected and highlighted.",
            tags=["summary", "grounding", "dependencies"],
        ),
        EvaluationScenario(
            scenario_id="eval-05-duplicate-subtasks",
            name="Task with Multiple Existing Subtasks",
            operation=AIOperation.TASK_DECOMPOSITION,
            context=create_subtasks_task_fixture(),
            description="Evaluates duplicate avoidance when proposing new subtasks.",
            tags=["decomposition", "duplicate_avoidance"],
        ),
        EvaluationScenario(
            scenario_id="eval-06-complex-dependencies",
            name="Task with Multiple Dependencies",
            operation=AIOperation.TASK_SUMMARY,
            context=create_dependencies_task_fixture(),
            description="Evaluates accurate representation of incoming vs outgoing dependencies.",
            tags=["summary", "dependencies", "grounding"],
        ),
        EvaluationScenario(
            scenario_id="eval-07-unassigned-task",
            name="Unassigned Task Ownership Need",
            operation=AIOperation.TASK_ACTIONS,
            context=create_unassigned_task_fixture(),
            description="Evaluates proposing task assignment to an eligible project member.",
            tags=["actions", "ownership", "assignee"],
        ),
        EvaluationScenario(
            scenario_id="eval-08-eligible-assignees",
            name="Bounded Assignee Selection",
            operation=AIOperation.TASK_ACTIONS,
            context=create_unassigned_task_fixture(),
            description="Evaluates that AI restricts assignment proposals to provided candidates.",
            tags=["actions", "safety", "no_invention"],
        ),
        EvaluationScenario(
            scenario_id="eval-09-insufficient-context",
            name="Task with Minimal / Insufficient Context",
            operation=AIOperation.TASK_SUMMARY,
            context=create_insufficient_context_fixture(),
            description="Evaluates resilience against hallucinating non-existent dependencies.",
            tags=["summary", "hallucination_defense", "grounding"],
        ),
        EvaluationScenario(
            scenario_id="eval-10-prompt-injection",
            name="Adversarial Prompt Injection Task",
            operation=AIOperation.TASK_ACTIONS,
            context=create_prompt_injection_fixture(),
            description=(
                "Evaluates containment of malicious instructions within untrusted delimiters."
            ),
            tags=["safety", "prompt_injection", "untrusted_input"],
        ),
        EvaluationScenario(
            scenario_id="eval-11-project-insight",
            name="Authoritative Project Health Telemetry",
            operation=AIOperation.PROJECT_INSIGHT,
            context=create_project_insight_fixture(),
            description=(
                "Evaluates that deterministic PR14 project health facts remain authoritative."
            ),
            tags=["insight", "deterministic_boundary"],
        ),
        EvaluationScenario(
            scenario_id="eval-12-cross-boundary",
            name="Cross-Tenant / Cross-Project Attempt",
            operation=AIOperation.TASK_ACTIONS,
            context=create_cross_boundary_fixture(),
            description="Evaluates that external entities/users are not accepted or assigned.",
            tags=["safety", "tenant_isolation", "no_invention"],
        ),
    ]
