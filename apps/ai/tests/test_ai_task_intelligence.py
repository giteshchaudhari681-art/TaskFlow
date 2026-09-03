"""Tests for PR 21: AI-Powered Task Intelligence."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.models.requests import (
    AIAnalysisContext,
    AIAnalysisRequest,
    AIOperation,
    ProjectContext,
    SubtaskContext,
    TaskCommentContext,
    TaskDependencyContext,
    TaskDetailContext,
)
from app.models.responses import (
    AIDependencyImpact,
    AIRecommendation,
    RecommendationCategory,
    RecommendationPriority,
)
from app.services.providers.openai_provider import (
    AIProviderExecutionError,
    OpenAIProvider,
)


def test_analyze_task_summary_with_target_task_context(
    client: TestClient,
    sample_context: AIAnalysisContext,
) -> None:
    """POST /ai/analyze executes TASK_SUMMARY with target_task details."""
    sample_context.target_task = TaskDetailContext(
        task_id="task-pr21-uuid-1",
        issue_key="ALPHA-42",
        title="Integrate Payment Gateway API",
        status="IN_PROGRESS",
        priority="HIGH",
        due_date="2026-09-10T12:00:00Z",
        created_at="2026-09-01T09:00:00Z",
        assignee="Sarah Connor",
        labels=["backend", "security", "payments"],
        description="Connect Stripe webhooks and handle idempotency keys.",
        subtasks=[
            SubtaskContext(
                id="subtask-1",
                title="Configure webhook secret",
                status="DONE",
                is_completed=True,
            ),
            SubtaskContext(
                id="subtask-2",
                title="Implement replay protection",
                status="TODO",
                is_completed=False,
            ),
        ],
        dependencies=[
            TaskDependencyContext(
                task_id="dep-1",
                issue_key="ALPHA-40",
                title="Database migration for customer ledger",
                status="DONE",
                relationship="BLOCKING_PREDECESSOR",
            ),
            TaskDependencyContext(
                task_id="dep-2",
                issue_key="ALPHA-45",
                title="Checkout UI checkout button",
                status="TODO",
                relationship="BLOCKED_SUCCESSOR",
            ),
        ],
        recent_comments=[
            TaskCommentContext(
                author="Alex Dev",
                content="Stripe test keys are configured in dev vault.",
                created_at="2026-09-02T14:30:00Z",
            )
        ],
        parent_project=ProjectContext(
            project_id="proj-uuid-1",
            project_key="ALPHA",
            project_name="Alpha Core Platform",
        ),
    )

    req = AIAnalysisRequest(
        request_id="req-pr21-task-summary-001",
        operation=AIOperation.TASK_SUMMARY,
        context=sample_context,
    )

    response = client.post("/ai/analyze", json=req.model_dump(mode="json"))
    assert response.status_code == 200

    data = response.json()
    assert data["request_id"] == "req-pr21-task-summary-001"
    assert data["operation"] == "TASK_SUMMARY"
    assert "summary" in data
    assert isinstance(data["recommendations"], list)
    assert isinstance(data["attention_areas"], list)


def test_dependency_impact_and_task_models() -> None:
    """Direct model validation for task-specific models."""
    dep_impact = AIDependencyImpact(
        has_blocking_dependencies=True,
        description="Blocked by unmerged database migration task ALPHA-40.",
    )
    assert dep_impact.has_blocking_dependencies is True
    assert "ALPHA-40" in dep_impact.description

    rec = AIRecommendation(
        title="Unblock API credentials",
        description="Verify webhook secrets in testing environment.",
        priority=RecommendationPriority.HIGH,
        category=RecommendationCategory.UNBLOCK,
    )
    assert rec.category == RecommendationCategory.UNBLOCK
    assert rec.priority == RecommendationPriority.HIGH

    subtask = SubtaskContext(
        id="sub-1",
        title="Write tests",
        status="IN_PROGRESS",
        is_completed=False,
    )
    assert subtask.is_completed is False


def test_openai_provider_task_summary_prompt_grounding(test_settings: Settings) -> None:
    """OpenAIProvider formats task facts, untrusted data delimiters, and grounding."""
    provider = OpenAIProvider(settings=test_settings)

    # 1. System prompt
    sys_prompt = provider._build_system_prompt(AIOperation.TASK_SUMMARY)
    assert "Enterprise Task Intelligence Assistant" in sys_prompt
    assert "STRICT GROUNDING & BEHAVIORAL RULES" in sys_prompt
    assert "untrusted user data" in sys_prompt
    assert "dependency_impact" in sys_prompt

    # 2. User content with target_task
    ctx = AIAnalysisContext(
        target_task=TaskDetailContext(
            task_id="t-1",
            issue_key="ALPHA-101",
            title="Refactor Session Auth",
            status="IN_PROGRESS",
            priority="CRITICAL",
            assignee="Dana Scully",
            description="Update cookie flags and JWT rotation.",
            subtasks=[
                SubtaskContext(id="s-1", title="Unit tests", status="DONE", is_completed=True)
            ],
            dependencies=[
                TaskDependencyContext(
                    task_id="d-1",
                    issue_key="ALPHA-99",
                    title="Redis store upgrade",
                    status="BLOCKED",
                    relationship="BLOCKING_PREDECESSOR",
                )
            ],
        )
    )

    user_content = provider._build_user_content(ctx, "Analyze urgency")
    assert "ALPHA-101" in user_content
    assert "Refactor Session Auth" in user_content
    assert "Dana Scully" in user_content
    assert "<task_description>" in user_content
    assert "Update cookie flags and JWT rotation." in user_content
    assert "BLOCKING_PREDECESSOR" in user_content
    assert "ALPHA-99" in user_content
    assert "Analyze urgency" in user_content


@pytest.mark.asyncio
async def test_openai_provider_parses_dependency_impact(test_settings: Settings) -> None:
    """OpenAIProvider properly parses raw LLM JSON with dependency_impact."""
    mock_client = MagicMock()
    mock_chat = AsyncMock()

    mock_completion_payload = {
        "summary": "Task is progressing but is blocked by pending infrastructure migration.",
        "recommendations": [
            {
                "title": "Coordinate with Infra Team",
                "description": "Ensure task ALPHA-99 is deployed before finishing session work.",
                "priority": "HIGH",
                "category": "DEPENDENCY",
            }
        ],
        "attention_areas": [
            {
                "title": "Unresolved Blocker",
                "description": "Predecessor ALPHA-99 has not completed.",
                "severity": "CRITICAL",
            }
        ],
        "dependency_impact": {
            "has_blocking_dependencies": True,
            "description": "Work cannot merge until ALPHA-99 is complete.",
        },
    }

    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps(mock_completion_payload)
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.usage.prompt_tokens = 120
    mock_response.usage.completion_tokens = 90
    mock_response.usage.total_tokens = 210
    mock_response.model = "gpt-4o-mini"

    mock_chat.completions.create.return_value = mock_response
    mock_client.chat = mock_chat

    provider = OpenAIProvider(settings=test_settings, client=mock_client)

    result = await provider.analyze(
        request_id="test-task-intel-req-1",
        operation=AIOperation.TASK_SUMMARY,
        context=AIAnalysisContext(),
    )

    assert result.request_id == "test-task-intel-req-1"
    assert result.operation == AIOperation.TASK_SUMMARY
    assert "pending infrastructure" in result.summary
    assert len(result.recommendations) == 1
    assert result.recommendations[0].category == RecommendationCategory.DEPENDENCY
    assert len(result.attention_areas) == 1
    assert result.attention_areas[0].severity == RecommendationPriority.CRITICAL

    assert result.dependency_impact is not None
    assert result.dependency_impact.has_blocking_dependencies is True
    assert "ALPHA-99" in result.dependency_impact.description


@pytest.mark.asyncio
async def test_openai_provider_handles_malformed_json_for_task_summary(
    test_settings: Settings,
) -> None:
    """OpenAIProvider raises AIProviderExecutionError when LLM returns invalid JSON."""
    mock_client = MagicMock()
    mock_chat = AsyncMock()

    mock_choice = MagicMock()
    mock_choice.message.content = "Malformed raw text instead of JSON"
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    mock_chat.completions.create.return_value = mock_response
    mock_client.chat = mock_chat

    provider = OpenAIProvider(settings=test_settings, client=mock_client)

    with pytest.raises(AIProviderExecutionError, match="Invalid JSON structure"):
        await provider.analyze(
            request_id="test-task-fail-req",
            operation=AIOperation.TASK_SUMMARY,
            context=AIAnalysisContext(),
        )
