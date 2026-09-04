"""Command-line evaluation runner and reporting harness for TaskFlow AI."""

import argparse
import asyncio
import sys
from pathlib import Path
from typing import Dict, List, Optional

# Ensure apps/ai is in sys.path regardless of execution entrypoint
_ai_root = str(Path(__file__).resolve().parent.parent)
if _ai_root not in sys.path:
    sys.path.insert(0, _ai_root)

from app.config import get_settings
from app.models.requests import AIAnalysisContext, AIOperation
from app.models.responses import (
    ActionConfidence,
    ActionTarget,
    ActionType,
    AIAnalysisResponse,
    AIAttentionArea,
    AIDecomposedSubtask,
    AIDependencyImpact,
    AIRecommendation,
    AITaskActionProposal,
    RecommendationCategory,
    RecommendationPriority,
)
from app.services.providers.base import BaseAIProvider
from app.services.providers.openai_provider import OpenAIProvider
from evals.evaluators import (
    EvaluationResult,
    evaluate_action_invariants,
    evaluate_boundedness,
    evaluate_decomposition,
    evaluate_deterministic_boundary,
    evaluate_grounding,
    evaluate_no_invention,
    evaluate_safety_and_injection,
    evaluate_structural_validity,
)
from evals.fixtures.scenarios import load_all_scenarios


class DeterministicEvalProvider(BaseAIProvider):
    """Deterministic, zero-network mock provider executing evaluation scenarios."""

    async def analyze(
        self,
        request_id: str,
        operation: AIOperation,
        context: AIAnalysisContext,
        user_prompt: Optional[str] = None,
    ) -> AIAnalysisResponse:
        task = context.target_task

        if operation == AIOperation.PROJECT_INSIGHT:
            return AIAnalysisResponse(
                request_id=request_id,
                operation=operation,
                summary=(
                    "Project is facing critical delivery risks driven by 5 blocked tasks "
                    "and 8 overdue items past scheduled milestone dates."
                ),
                recommendations=[
                    AIRecommendation(
                        title="Unblock database cluster dependency",
                        description="Prioritize unblocking the production database infrastructure.",
                        priority=RecommendationPriority.CRITICAL,
                        category=RecommendationCategory.BLOCKER,
                    ),
                    AIRecommendation(
                        title="Reassign unowned high-priority work",
                        description="Assign ownership for the 6 unassigned tasks.",
                        priority=RecommendationPriority.HIGH,
                        category=RecommendationCategory.OWNERSHIP,
                    ),
                ],
                attention_areas=[
                    AIAttentionArea(
                        title="Critical Delivery Path",
                        description="Overdue tasks jeopardize the upcoming release milestone.",
                        severity=RecommendationPriority.CRITICAL,
                    )
                ],
                metadata={"provider": "deterministic-eval", "model": "mock-eval"},
            )

        if operation == AIOperation.TASK_DECOMPOSITION:
            # Case A: Atomic task
            if task and "LICENSE" in (task.title or ""):
                return AIAnalysisResponse(
                    request_id=request_id,
                    operation=operation,
                    summary="Task is atomic and single-scoped. No further decomposition required.",
                    subtasks=[],
                    notes=["Task is already appropriately sized."],
                    metadata={"provider": "deterministic-eval"},
                )

            # Case B: Duplicate avoidance scenario
            if task and task.subtasks:
                return AIAnalysisResponse(
                    request_id=request_id,
                    operation=operation,
                    summary="Proposed complementary subtasks avoiding existing 3 subtasks.",
                    subtasks=[
                        AIDecomposedSubtask(
                            title="Implement automated token refresh cycle",
                            description="Refresh expired OAuth access tokens using refresh token.",
                            priority=RecommendationPriority.HIGH,
                            order=1,
                        ),
                        AIDecomposedSubtask(
                            title="Add integration test suite for OAuth providers",
                            description="Test callback and error paths with mock OAuth server.",
                            priority=RecommendationPriority.MEDIUM,
                            order=2,
                        ),
                    ],
                    notes=["Existing credentials and UI buttons were not duplicated."],
                    metadata={"provider": "deterministic-eval"},
                )

            # Case C: Complex task
            return AIAnalysisResponse(
                request_id=request_id,
                operation=operation,
                summary="Decomposed complex subscription billing into 4 sequential subtasks.",
                subtasks=[
                    AIDecomposedSubtask(
                        title="Create Stripe customer webhook listener",
                        description="Implement signature-verified webhook route.",
                        priority=RecommendationPriority.HIGH,
                        order=1,
                    ),
                    AIDecomposedSubtask(
                        title="Create Prisma subscription ledger schema and migrations",
                        description="Add subscription table with billing period dates.",
                        priority=RecommendationPriority.HIGH,
                        order=2,
                    ),
                    AIDecomposedSubtask(
                        title="Build checkout session controller with idempotency keying",
                        description="Integrate Stripe checkout redirect flow.",
                        priority=RecommendationPriority.HIGH,
                        order=3,
                    ),
                    AIDecomposedSubtask(
                        title="Add customer portal redirect in billing settings",
                        description="Frontend account settings management.",
                        priority=RecommendationPriority.MEDIUM,
                        order=4,
                    ),
                ],
                notes=["Review webhook secrets before deploying to production."],
                metadata={"provider": "deterministic-eval"},
            )

        if operation == AIOperation.TASK_ACTIONS:
            target_id = task.task_id if task else "default-task"

            # Case A: Prompt injection / adversary
            if task and (
                "script" in (task.title or "").lower()
                or "override" in (task.description or "").lower()
            ):
                return AIAnalysisResponse(
                    request_id=request_id,
                    operation=operation,
                    summary=(
                        "Task content contained untrusted instructions. "
                        "Maintained standard action evaluation."
                    ),
                    actions=[],
                    notes=["No actions justified."],
                    metadata={"provider": "deterministic-eval"},
                )

            # Case B: Cross boundary attempt
            if task and "org-secret-999" in (task.description or ""):
                return AIAnalysisResponse(
                    request_id=request_id,
                    operation=operation,
                    summary="Security policy: cross-tenant assignments rejected.",
                    actions=[],
                    notes=["External assignee not eligible."],
                    metadata={"provider": "deterministic-eval"},
                )

            # Case C: Unassigned task with eligible assignees
            if task and task.assignee is None and task.eligible_assignees:
                selected_assignee = task.eligible_assignees[0]
                return AIAnalysisResponse(
                    request_id=request_id,
                    operation=operation,
                    summary="Identified unassigned task with available eligible project member.",
                    actions=[
                        AITaskActionProposal(
                            action_id="act-eval-assign-01",
                            type=ActionType.ASSIGN_TASK,
                            title=f"Assign task to {selected_assignee.display_name}",
                            reason="Task is unassigned and candidate is an eligible member.",
                            confidence=ActionConfidence.HIGH,
                            target=ActionTarget(task_id=target_id),
                            expected_current_state={"assigneeId": None},
                            parameters={
                                "assigneeId": selected_assignee.id,
                                "assigneeName": selected_assignee.display_name,
                            },
                        )
                    ],
                    metadata={"provider": "deterministic-eval"},
                )

            # Case D: Overdue task
            return AIAnalysisResponse(
                request_id=request_id,
                operation=operation,
                summary=(
                    "Identified overdue high-risk vulnerability requiring priority "
                    "and date adjustment."
                ),
                actions=[
                    AITaskActionProposal(
                        action_id="act-eval-priority-01",
                        type=ActionType.UPDATE_PRIORITY,
                        title="Elevate priority to HIGH",
                        reason="Task is a critical security vulnerability currently marked as LOW.",
                        confidence=ActionConfidence.HIGH,
                        target=ActionTarget(task_id=target_id),
                        expected_current_state={"priority": "LOW"},
                        parameters={"priority": "HIGH"},
                    ),
                    AITaskActionProposal(
                        action_id="act-eval-date-01",
                        type=ActionType.UPDATE_DUE_DATE,
                        title="Extend due date to 2026-09-10",
                        reason="Past due date requires scheduling alignment.",
                        confidence=ActionConfidence.MEDIUM,
                        target=ActionTarget(task_id=target_id),
                        expected_current_state={"dueDate": "2026-08-01"},
                        parameters={"dueDate": "2026-09-10"},
                    ),
                ],
                metadata={"provider": "deterministic-eval"},
            )

        # Default: TASK_SUMMARY
        is_blocked = any(
            d.relationship == "BLOCKING_PREDECESSOR" for d in (task.dependencies if task else [])
        )
        return AIAnalysisResponse(
            request_id=request_id,
            operation=operation,
            summary=(
                "Task is blocked by unresolved infrastructure dependencies."
                if is_blocked
                else "Task is progressing normally without blocking dependencies."
            ),
            dependency_impact=AIDependencyImpact(
                has_blocking_dependencies=is_blocked,
                description=(
                    "Blocked by predecessor dependency 'Provision production database cluster'."
                    if is_blocked
                    else "No unresolved blocking dependencies detected."
                ),
            ),
            recommendations=[
                AIRecommendation(
                    title="Resolve infrastructure blocker" if is_blocked else "Continue execution",
                    description="Coordinate with platform team to unblock database deployment.",
                    priority=RecommendationPriority.HIGH
                    if is_blocked
                    else RecommendationPriority.LOW,
                    category=RecommendationCategory.BLOCKER
                    if is_blocked
                    else RecommendationCategory.EXECUTION,
                )
            ],
            metadata={"provider": "deterministic-eval"},
        )


async def run_evaluation_suite(
    live: bool = False, verbose: bool = False
) -> Dict[str, Dict[str, bool]]:
    """Runs the full evaluation harness across all 12 scenarios and returns dimension results."""
    settings = get_settings()

    if live:
        if not settings.openai_api_key:
            print("ERROR: --live evaluation requires OPENAI_API_KEY environment variable.")
            sys.exit(1)
        print(">>> Running LIVE evaluation against OpenAI API (costs apply)...")
        provider: BaseAIProvider = OpenAIProvider(settings)
    else:
        print(">>> Running DETERMINISTIC evaluation (zero-network, mock provider)...")
        provider = DeterministicEvalProvider()

    scenarios = load_all_scenarios()
    op_results: Dict[str, Dict[str, bool]] = {
        "PROJECT_INSIGHT": {
            "structural validity": True,
            "bounded output": True,
            "deterministic boundary": True,
        },
        "TASK_SUMMARY": {
            "grounding": True,
            "bounded output": True,
            "injection defense": True,
        },
        "TASK_DECOMPOSITION": {
            "atomic task handling": True,
            "duplicate awareness": True,
            "dependency awareness": True,
        },
        "TASK_ACTIONS": {
            "allowed actions": True,
            "assignee bounding": True,
            "stale-state invariant": True,
            "mutation boundary": True,
        },
    }

    for sc in scenarios:
        try:
            resp = await provider.analyze(
                request_id=f"eval-{sc.scenario_id}",
                operation=sc.operation,
                context=sc.context,
                user_prompt=sc.user_prompt,
            )

            # Evaluate dimensions
            res_struct = evaluate_structural_validity(resp, sc.operation)
            res_bound = evaluate_boundedness(resp, sc.operation)
            res_ground = evaluate_grounding(resp, sc.context)
            res_decomp = evaluate_decomposition(resp, sc.context)
            res_action = evaluate_action_invariants(resp, sc.context)
            res_safety = evaluate_safety_and_injection(resp, sc.user_prompt)
            res_no_inv = evaluate_no_invention(resp, sc.context)
            res_det = evaluate_deterministic_boundary(resp, sc.context)

            all_results: List[EvaluationResult] = (
                res_struct
                + res_bound
                + res_ground
                + res_decomp
                + res_action
                + res_safety
                + res_no_inv
                + res_det
            )

            for r in all_results:
                if not r.passed:
                    if verbose:
                        print(f"  FAILED check in {sc.scenario_id}: {r}")

                    # Map failures to summary buckets
                    op_key = sc.operation.value
                    if "structural_validity" in r.check_name:
                        op_results[op_key]["structural validity"] = False
                    if "boundedness" in r.check_name:
                        op_results[op_key]["bounded output"] = False
                    if "grounding" in r.check_name:
                        op_results[op_key]["grounding"] = False
                    if "atomic_task" in r.check_name:
                        op_results[op_key]["atomic task handling"] = False
                    if "duplicate_awareness" in r.check_name:
                        op_results[op_key]["duplicate awareness"] = False
                    if "dependency_awareness" in r.check_name:
                        op_results[op_key]["dependency awareness"] = False
                    if "safety" in r.check_name:
                        if op_key == "TASK_ACTIONS":
                            op_results[op_key]["allowed actions"] = False
                        else:
                            op_results[op_key]["injection defense"] = False
                    if "no_invention" in r.check_name:
                        op_results[op_key]["assignee bounding"] = False
                    if "stale_state" in r.check_name:
                        op_results[op_key]["stale-state invariant"] = False
                    if "deterministic_boundary" in r.check_name:
                        op_results[op_key]["deterministic boundary"] = False

        except Exception as exc:
            for k in op_results[sc.operation.value]:
                op_results[sc.operation.value][k] = False
            print(f"  EXCEPTION during scenario {sc.scenario_id}: {exc}")

    return op_results


def print_evaluation_summary(op_results: Dict[str, Dict[str, bool]]) -> bool:
    """Renders the standard AI evaluation summary table to console."""
    print("\nAI Evaluation Summary")
    print("-------------------------------------------------------------")

    overall_pass = True

    for op, checks in op_results.items():
        print(f"{op}")
        for check_name, passed in checks.items():
            status = "PASS" if passed else "FAIL"
            if not passed:
                overall_pass = False
            print(f"  {check_name:<26} {status}")

    print("-------------------------------------------------------------")
    print(f"Overall:\n{'PASS' if overall_pass else 'FAIL'}\n")
    return overall_pass


def main():
    """CLI entry point for python -m evals.runner."""
    parser = argparse.ArgumentParser(description="TaskFlow AI Evaluation and Reliability Harness")
    parser.add_argument(
        "--live", action="store_true", help="Run against real OpenAI provider (requires API key)"
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Print detailed assertion outputs"
    )
    args = parser.parse_args()

    results = asyncio.run(run_evaluation_suite(live=args.live, verbose=args.verbose))
    passed = print_evaluation_summary(results)
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
