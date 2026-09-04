"""Unit and integration tests for Human-Approved AI Task Actions (PR 23)."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.config import Settings
from app.models.requests import (
    AIAnalysisContext,
    AIOperation,
    EligibleAssigneeContext,
    ProjectContext,
    TaskDetailContext,
)
from app.models.responses import (
    ActionConfidence,
    ActionTarget,
    ActionType,
    AIAnalysisResponse,
    AITaskActionProposal,
)
from app.services.providers.openai_provider import OpenAIProvider


def test_task_actions_models():
    """Verify AITaskActionProposal model, enums, and AIAnalysisResponse with actions."""
    action = AITaskActionProposal(
        action_id="proposal-priority-001",
        type=ActionType.UPDATE_PRIORITY,
        title="Increase priority to HIGH",
        reason="Task is blocking 2 critical path dependencies and is due tomorrow.",
        confidence=ActionConfidence.HIGH,
        target=ActionTarget(task_id="e2e-task-123"),
        expected_current_state={"priority": "MEDIUM"},
        parameters={"priority": "HIGH"},
    )
    assert action.action_id == "proposal-priority-001"
    assert action.type == ActionType.UPDATE_PRIORITY
    assert action.confidence == ActionConfidence.HIGH
    assert action.target.task_id == "e2e-task-123"
    assert action.expected_current_state == {"priority": "MEDIUM"}
    assert action.parameters == {"priority": "HIGH"}

    resp = AIAnalysisResponse(
        request_id="action-trace-001",
        operation=AIOperation.TASK_ACTIONS,
        summary="Identified 1 high-priority action proposal.",
        actions=[action],
        notes=["Review blocker dependencies"],
    )
    assert resp.operation == AIOperation.TASK_ACTIONS
    assert len(resp.actions) == 1
    assert resp.actions[0].title == "Increase priority to HIGH"
    assert resp.notes == ["Review blocker dependencies"]


def test_system_prompt_actions_grounding():
    """Verify prompt grounding and safety rules for TASK_ACTIONS."""
    settings = Settings(
        openai_api_key="test-key",
        service_token="test-service-token",
        sentry_dsn="",
    )
    provider = OpenAIProvider(settings)
    prompt = provider._build_system_prompt(AIOperation.TASK_ACTIONS)

    assert "Expert Task Operations Advisor" in prompt
    assert "UPDATE_STATUS" in prompt
    assert "UPDATE_PRIORITY" in prompt
    assert "UPDATE_DUE_DATE" in prompt
    assert "ASSIGN_TASK" in prompt
    assert "BOUNDED OUTPUT" in prompt
    assert "ASSIGNEE INTEGRITY" in prompt
    assert "STALE STATE SAFETY" in prompt
    assert "untrusted data" in prompt
    assert "expected_current_state" in prompt
    assert "actions" in prompt


def test_build_user_content_eligible_assignees():
    """Verify that eligible assignees are included in user content prompt."""
    settings = Settings(
        openai_api_key="test-key",
        service_token="test-service-token",
        sentry_dsn="",
    )
    provider = OpenAIProvider(settings)

    context = AIAnalysisContext(
        target_task=TaskDetailContext(
            task_id="task-uuid-456",
            issue_key="ALPHA-12",
            title="Implement Redis caching layer",
            status="IN_PROGRESS",
            priority="MEDIUM",
            eligible_assignees=[
                EligibleAssigneeContext(id="user-1", display_name="Alice Lead"),
                EligibleAssigneeContext(id="user-2", display_name="Bob Dev"),
            ],
        )
    )

    user_content = provider._build_user_content(context, None)
    assert "Alice Lead (ID: user-1)" in user_content
    assert "Bob Dev (ID: user-2)" in user_content
    assert "Eligible Assignees for Task Assignment" in user_content


@pytest.mark.asyncio
async def test_analyze_task_actions_success():
    """Verify provider parses action proposals with typed parameters and expectedCurrentState."""
    settings = Settings(
        openai_api_key="test-key",
        service_token="test-service-token",
        sentry_dsn="",
    )
    provider = OpenAIProvider(settings)

    mock_llm_json = {
        "summary": "Synthesized 3 actionable proposals based on task blockers and schedule.",
        "actions": [
            {
                "action_id": "act-1",
                "type": "UPDATE_PRIORITY",
                "title": "Escalate priority to HIGH",
                "reason": "Task is blocking 2 downstream releases.",
                "confidence": "HIGH",
                "target": {"task_id": "task-uuid-001"},
                "expected_current_state": {"priority": "MEDIUM"},
                "parameters": {"priority": "HIGH"},
            },
            {
                "action_id": "act-2",
                "type": "ASSIGN_TASK",
                "title": "Assign task to Alice Lead",
                "reason": "Alice is the project technical lead with caching domain ownership.",
                "confidence": "HIGH",
                "target": {"task_id": "task-uuid-001"},
                "expected_current_state": {"assignee_id": None},
                "parameters": {"assignee_id": "user-uuid-alice", "assignee_name": "Alice Lead"},
            },
            {
                "action_id": "act-3",
                "type": "UPDATE_DUE_DATE",
                "title": "Extend due date to 2026-09-20",
                "reason": "Scope requires 3 additional days for stress testing.",
                "confidence": "MEDIUM",
                "target": {"task_id": "task-uuid-001"},
                "expected_current_state": {"due_date": "2026-09-17T00:00:00.000Z"},
                "parameters": {"due_date": "2026-09-20T00:00:00.000Z"},
            },
        ],
        "notes": ["All proposals are advisory and require human confirmation."],
    }

    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps(mock_llm_json)

    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.model = "gpt-4o-mini"
    mock_response.usage = MagicMock(prompt_tokens=310, completion_tokens=140, total_tokens=450)

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    provider._client = mock_client

    context = AIAnalysisContext(
        project=ProjectContext(project_id="proj-1", project_key="ALPHA", project_name="Alpha Core"),
        target_task=TaskDetailContext(
            task_id="task-uuid-001",
            issue_key="ALPHA-12",
            title="Implement Redis caching layer",
            status="IN_PROGRESS",
            priority="MEDIUM",
        ),
    )

    result = await provider.analyze(
        request_id="req-actions-001",
        operation=AIOperation.TASK_ACTIONS,
        context=context,
    )

    assert result.operation == AIOperation.TASK_ACTIONS
    assert len(result.actions) == 3

    a1 = result.actions[0]
    assert a1.type == ActionType.UPDATE_PRIORITY
    assert a1.confidence == ActionConfidence.HIGH
    assert a1.parameters["priority"] == "HIGH"
    assert a1.expected_current_state["priority"] == "MEDIUM"

    a2 = result.actions[1]
    assert a2.type == ActionType.ASSIGN_TASK
    assert a2.parameters["assignee_id"] == "user-uuid-alice"

    a3 = result.actions[2]
    assert a3.type == ActionType.UPDATE_DUE_DATE
    assert a3.confidence == ActionConfidence.MEDIUM
    assert a3.parameters["due_date"] == "2026-09-20T00:00:00.000Z"


@pytest.mark.asyncio
async def test_analyze_task_actions_bounded_max_5():
    """Verify provider bounds action count to maximum 5 items."""
    settings = Settings(
        openai_api_key="test-key",
        service_token="test-service-token",
        sentry_dsn="",
    )
    provider = OpenAIProvider(settings)

    # 7 proposals returned by LLM
    mock_llm_json = {
        "summary": "Many proposals",
        "actions": [
            {
                "action_id": f"act-{i}",
                "type": "UPDATE_PRIORITY",
                "title": f"Action {i}",
                "reason": f"Reason {i}",
                "parameters": {"priority": "HIGH"},
            }
            for i in range(1, 8)
        ],
    }

    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps(mock_llm_json)
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.model = "gpt-4o-mini"
    mock_response.usage = None

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    provider._client = mock_client

    result = await provider.analyze(
        request_id="req-bounded-actions",
        operation=AIOperation.TASK_ACTIONS,
        context=AIAnalysisContext(),
    )

    assert len(result.actions) == 5


@pytest.mark.asyncio
async def test_analyze_task_actions_invalid_type_filtered():
    """Verify unknown or unsupported action types are safely skipped."""
    settings = Settings(
        openai_api_key="test-key",
        service_token="test-service-token",
        sentry_dsn="",
    )
    provider = OpenAIProvider(settings)

    mock_llm_json = {
        "summary": "Actions with invalid types",
        "actions": [
            {
                "action_id": "bad-1",
                "type": "DELETE_TASK",  # UNSUPPORTED
                "title": "Delete this task",
                "reason": "Not needed",
            },
            {
                "action_id": "good-1",
                "type": "UPDATE_STATUS",  # VALID
                "title": "Move to IN_PROGRESS",
                "reason": "Work has begun",
                "parameters": {"status": "IN_PROGRESS"},
            },
        ],
    }

    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps(mock_llm_json)
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.model = "gpt-4o-mini"
    mock_response.usage = None

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    provider._client = mock_client

    result = await provider.analyze(
        request_id="req-filter-actions",
        operation=AIOperation.TASK_ACTIONS,
        context=AIAnalysisContext(),
    )

    assert len(result.actions) == 1
    assert result.actions[0].type == ActionType.UPDATE_STATUS


@pytest.mark.asyncio
async def test_analyze_task_actions_empty_when_no_justification():
    """Verify provider cleanly returns empty actions list when no action is justified."""
    settings = Settings(
        openai_api_key="test-key",
        service_token="test-service-token",
        sentry_dsn="",
    )
    provider = OpenAIProvider(settings)

    mock_llm_json = {
        "summary": "Task is healthy, assigned, on track, and has no blocking dependencies.",
        "actions": [],
        "notes": ["No safe, high-confidence task actions were identified."],
    }

    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps(mock_llm_json)
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.model = "gpt-4o-mini"
    mock_response.usage = None

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    provider._client = mock_client

    result = await provider.analyze(
        request_id="req-empty-actions",
        operation=AIOperation.TASK_ACTIONS,
        context=AIAnalysisContext(),
    )

    assert result.actions == []
    assert len(result.notes) == 1
    assert "No safe, high-confidence task actions" in result.notes[0]
