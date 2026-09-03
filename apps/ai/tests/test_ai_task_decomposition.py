"""Unit and integration tests for AI-Assisted Task Decomposition (PR 22)."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.config import Settings
from app.models.requests import (
    AIAnalysisContext,
    AIAnalysisRequest,
    AIOperation,
    ProjectContext,
    SubtaskContext,
    TaskDependencyContext,
    TaskDetailContext,
)
from app.models.responses import (
    AIAnalysisResponse,
    AIDecomposedSubtask,
    RecommendationPriority,
)
from app.services.providers.openai_provider import OpenAIProvider


def test_task_decomposition_models():
    """Verify AIDecomposedSubtask model and AIAnalysisResponse with subtasks."""
    subtask = AIDecomposedSubtask(
        title="Configure OAuth Credentials",
        description="Set client ID and secret in environment",
        priority=RecommendationPriority.HIGH,
        order=1,
    )
    assert subtask.title == "Configure OAuth Credentials"
    assert subtask.order == 1
    assert subtask.priority == RecommendationPriority.HIGH

    resp = AIAnalysisResponse(
        request_id="decomp-trace-001",
        operation=AIOperation.TASK_DECOMPOSITION,
        summary="Proposed 3 sequential subtasks for auth integration.",
        subtasks=[subtask],
        notes=["Review secrets before deploy"],
    )
    assert resp.operation == AIOperation.TASK_DECOMPOSITION
    assert len(resp.subtasks) == 1
    assert resp.subtasks[0].title == "Configure OAuth Credentials"
    assert resp.notes == ["Review secrets before deploy"]


def test_system_prompt_decomposition_grounding():
    """Verify prompt grounding rules for TASK_DECOMPOSITION."""
    settings = Settings(
        openai_api_key="test-key",
        service_token="test-service-token",
        sentry_dsn="",
    )
    provider = OpenAIProvider(settings)
    prompt = provider._build_system_prompt(AIOperation.TASK_DECOMPOSITION)

    assert "Expert Task Decomposition Assistant" in prompt
    assert "DUPLICATE AVOIDANCE" in prompt
    assert "DEPENDENCY AWARENESS" in prompt
    assert "ATOMIC / SIMPLE TASKS" in prompt
    assert "untrusted user data" in prompt
    assert "subtasks" in prompt
    assert "notes" in prompt


@pytest.mark.asyncio
async def test_analyze_task_decomposition_success():
    """Verify provider parses subtasks, notes, and assigns sequential orders."""
    settings = Settings(
        openai_api_key="test-key",
        service_token="test-service-token",
        sentry_dsn="",
    )
    provider = OpenAIProvider(settings)

    mock_llm_json = {
        "summary": "Decomposed OAuth authentication feature into 4 concrete subtasks.",
        "subtasks": [
            {
                "title": "Configure OAuth provider credentials",
                "description": "Register client ID and secret in vault",
                "priority": "HIGH",
                "order": 1,
            },
            {
                "title": "Implement callback redirect handler",
                "description": "Add express endpoint to exchange auth code for JWT",
                "priority": "HIGH",
                "order": 2,
            },
            {
                "title": "Add frontend login buttons",
                "description": "Render Google and GitHub buttons on LoginPage",
                "priority": "MEDIUM",
                "order": 3,
            },
        ],
        "notes": [
            "Ensure provider callback URLs match production domains",
        ],
        "recommendations": [],
        "attention_areas": [],
    }

    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps(mock_llm_json)

    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.model = "gpt-4o-mini"
    mock_response.usage = MagicMock(prompt_tokens=320, completion_tokens=140, total_tokens=460)

    context = AIAnalysisContext(
        project=ProjectContext(
            project_id="11111111-1111-1111-1111-111111111111",
            project_key="AUTH",
            project_name="Authentication Service",
        ),
        target_task=TaskDetailContext(
            task_id="22222222-2222-2222-2222-222222222222",
            issue_key="AUTH-42",
            title="Implement OAuth login",
            status="IN_PROGRESS",
            priority="HIGH",
            subtasks=[
                SubtaskContext(
                    id="sub-1",
                    title="Design user DB schema",
                    status="DONE",
                    is_completed=True,
                )
            ],
            dependencies=[
                TaskDependencyContext(
                    task_id="dep-1",
                    issue_key="AUTH-10",
                    title="User table migration",
                    relationship="BLOCKING_PREDECESSOR",
                    status="DONE",
                )
            ],
        ),
    )

    with patch.object(provider, "_get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_get_client.return_value = mock_client

        result = await provider.analyze(
            request_id="decomp-trace-002",
            operation=AIOperation.TASK_DECOMPOSITION,
            context=context,
            user_prompt="Prioritize security checklist",
        )

        assert result.operation == AIOperation.TASK_DECOMPOSITION
        assert len(result.subtasks) == 3
        assert result.subtasks[0].title == "Configure OAuth provider credentials"
        assert result.subtasks[0].order == 1
        assert result.subtasks[0].priority == RecommendationPriority.HIGH
        assert result.subtasks[1].title == "Implement callback redirect handler"
        assert result.subtasks[2].title == "Add frontend login buttons"
        assert len(result.notes) == 1
        assert "Ensure provider callback URLs" in result.notes[0]
        assert result.metadata["total_tokens"] == 460


@pytest.mark.asyncio
async def test_analyze_task_decomposition_atomic_task_empty_proposal():
    """Verify provider correctly returns 0 subtasks when task is already atomic."""
    settings = Settings(
        openai_api_key="test-key",
        service_token="test-service-token",
        sentry_dsn="",
    )
    provider = OpenAIProvider(settings)

    mock_llm_json = {
        "summary": "This task is atomic and small; further decomposition is unnecessary.",
        "subtasks": [],
        "notes": ["Can be executed directly by one engineer in a single PR."],
        "recommendations": [],
        "attention_areas": [],
    }

    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps(mock_llm_json)

    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.model = "gpt-4o-mini"
    mock_response.usage = MagicMock(prompt_tokens=150, completion_tokens=30, total_tokens=180)

    context = AIAnalysisContext(
        target_task=TaskDetailContext(
            task_id="33333333-3333-3333-3333-333333333333",
            issue_key="FIX-1",
            title="Fix typo in login button",
            status="TODO",
            priority="LOW",
        )
    )

    with patch.object(provider, "_get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_get_client.return_value = mock_client

        result = await provider.analyze(
            request_id="decomp-trace-003",
            operation=AIOperation.TASK_DECOMPOSITION,
            context=context,
        )

        assert result.operation == AIOperation.TASK_DECOMPOSITION
        assert len(result.subtasks) == 0
        assert "atomic and small" in result.summary


def test_ai_analysis_request_decomposition_validation():
    """Verify AIAnalysisRequest accepts TASK_DECOMPOSITION."""
    req = AIAnalysisRequest(
        operation=AIOperation.TASK_DECOMPOSITION,
        context=AIAnalysisContext(),
        user_prompt="Break down by frontend and backend",
    )
    assert req.operation == AIOperation.TASK_DECOMPOSITION
    assert req.user_prompt == "Break down by frontend and backend"
