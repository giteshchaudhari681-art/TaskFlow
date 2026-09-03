"""Tests for PR 20: AI-Powered Project Intelligence & Recommendations."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.models.requests import (
    AIAnalysisContext,
    AIAnalysisRequest,
    AIOperation,
    DeliveryRiskContext,
    ProjectContext,
    ProjectHealthContext,
    ProjectMetricsContext,
)
from app.models.responses import (
    AIAttentionArea,
    AIRecommendation,
    RecommendationCategory,
    RecommendationPriority,
)
from app.services.providers.openai_provider import (
    AIProviderExecutionError,
    OpenAIProvider,
)


def test_analyze_project_insight_with_health_and_risks(
    client: TestClient,
    sample_context: AIAnalysisContext,
) -> None:
    """POST /ai/analyze executes PROJECT_INSIGHT operation with PR14 health signals."""
    # Enrich context with PR14 deterministic health signals
    sample_context.health = ProjectHealthContext(
        state="AT_RISK",
        score=65,
        reasons=["2 high-priority tasks are overdue", "1 task has unresolved blockers"],
    )
    sample_context.delivery_risks = [
        DeliveryRiskContext(
            type="OVERDUE_URGENT_TASK",
            severity="CRITICAL",
            message="2 high-priority tasks are overdue",
        ),
        DeliveryRiskContext(
            type="UNRESOLVED_BLOCKER",
            severity="HIGH",
            message="1 task has unresolved dependency blockers",
        ),
    ]

    req = AIAnalysisRequest(
        request_id="req-pr20-intelligence-001",
        operation=AIOperation.PROJECT_INSIGHT,
        context=sample_context,
    )

    response = client.post("/ai/analyze", json=req.model_dump(mode="json"))
    assert response.status_code == 200

    data = response.json()
    assert data["request_id"] == "req-pr20-intelligence-001"
    assert data["operation"] == "PROJECT_INSIGHT"
    assert "summary" in data
    assert isinstance(data["recommendations"], list)
    assert len(data["recommendations"]) > 0

    # Validate recommendations structure
    rec = data["recommendations"][0]
    assert "title" in rec
    assert "description" in rec
    assert rec["priority"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert rec["category"] in [
        "BLOCKER",
        "DELIVERY_RISK",
        "MILESTONE",
        "PRIORITY",
        "OWNERSHIP",
        "WORKLOAD",
        "PROCESS",
        "RISK_MITIGATION",
        "PLANNING",
        "QUALITY",
        "RESOURCE",
    ]

    # Validate attention_areas structure
    assert isinstance(data["attention_areas"], list)
    assert len(data["attention_areas"]) > 0
    area = data["attention_areas"][0]
    assert "title" in area
    assert "description" in area
    assert area["severity"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


def test_recommendation_and_attention_area_models() -> None:
    """Direct model instantiation and enum constraint validation."""
    rec = AIRecommendation(
        title="Resolve DB Migration Blocker",
        description="Task ALPHA-42 is blocking milestone Sprint 3 release.",
        priority=RecommendationPriority.CRITICAL,
        category=RecommendationCategory.BLOCKER,
    )
    assert rec.priority == RecommendationPriority.CRITICAL
    assert rec.category == RecommendationCategory.BLOCKER

    area = AIAttentionArea(
        title="2 Overdue Milestones",
        description="Milestones Q3 Beta and Final Release passed target dates.",
        severity=RecommendationPriority.HIGH,
    )
    assert area.severity == RecommendationPriority.HIGH
    assert area.title == "2 Overdue Milestones"


def test_openai_provider_insight_prompt_grounding(test_settings: Settings) -> None:
    """OpenAIProvider formats PR14 health, delivery risks, and grounding rules."""
    provider = OpenAIProvider(settings=test_settings)

    # 1. Test system prompt for PROJECT_INSIGHT
    sys_prompt = provider._build_system_prompt(AIOperation.PROJECT_INSIGHT)
    assert "Enterprise Project Intelligence Assistant" in sys_prompt
    assert "STRICT GROUNDING & BEHAVIORAL RULES" in sys_prompt
    assert "Never invent tasks, milestones, metrics" in sys_prompt
    assert "attention_areas" in sys_prompt
    assert "BLOCKER" in sys_prompt

    # 2. Test user content with health and risks
    ctx = AIAnalysisContext(
        project=ProjectContext(
            project_id="proj-1",
            project_key="TEST",
            project_name="Test Project",
        ),
        health=ProjectHealthContext(
            state="CRITICAL",
            score=40,
            reasons=["Critical blocker on payment module"],
        ),
        delivery_risks=[
            DeliveryRiskContext(
                type="CRITICAL_BLOCKER",
                severity="CRITICAL",
                message="Critical blocker on payment module",
            )
        ],
        metrics=ProjectMetricsContext(
            total_tasks=10,
            completed_tasks=2,
            in_flight_tasks=5,
            overdue_tasks=3,
            blocked_tasks=2,
            completion_percentage=20,
        ),
    )

    user_content = provider._build_user_content(ctx, "Focus on urgent risks")
    assert "Authoritative Deterministic Project Health" in user_content
    assert "Health State: CRITICAL" in user_content
    assert "Health Score: 40/100" in user_content
    assert "Critical blocker on payment module" in user_content
    assert "Focus on urgent risks" in user_content


@pytest.mark.asyncio
async def test_openai_provider_parses_attention_areas_and_recommendations(
    test_settings: Settings,
) -> None:
    """OpenAIProvider properly parses raw LLM JSON with attention_areas."""
    mock_client = MagicMock()
    mock_chat = AsyncMock()

    mock_completion_payload = {
        "summary": "Project is making steady progress but is threatened by 1 critical blocker.",
        "recommendations": [
            {
                "title": "Unblock Payment Gateway",
                "description": "Engage DevOps to resolve API credentials.",
                "priority": "CRITICAL",
                "category": "BLOCKER",
            }
        ],
        "attention_areas": [
            {
                "title": "Blocked Core Infrastructure",
                "description": "Task ALPHA-5 is blocking 3 dependent tasks.",
                "severity": "CRITICAL",
            }
        ],
    }

    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps(mock_completion_payload)
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.usage.prompt_tokens = 150
    mock_response.usage.completion_tokens = 80
    mock_response.usage.total_tokens = 230
    mock_response.model = "gpt-4o-mini"

    mock_chat.completions.create.return_value = mock_response
    mock_client.chat = mock_chat

    provider = OpenAIProvider(settings=test_settings, client=mock_client)

    result = await provider.analyze(
        request_id="test-parse-req-1",
        operation=AIOperation.PROJECT_INSIGHT,
        context=AIAnalysisContext(),
    )

    assert result.request_id == "test-parse-req-1"
    assert result.operation == AIOperation.PROJECT_INSIGHT
    assert "steady progress" in result.summary
    assert len(result.recommendations) == 1
    assert result.recommendations[0].category == RecommendationCategory.BLOCKER
    assert result.recommendations[0].priority == RecommendationPriority.CRITICAL
    assert len(result.attention_areas) == 1
    assert result.attention_areas[0].severity == RecommendationPriority.CRITICAL
    assert result.attention_areas[0].title == "Blocked Core Infrastructure"


@pytest.mark.asyncio
async def test_openai_provider_handles_invalid_json(test_settings: Settings) -> None:
    """OpenAIProvider raises AIProviderExecutionError when LLM returns non-JSON."""
    mock_client = MagicMock()
    mock_chat = AsyncMock()

    mock_choice = MagicMock()
    mock_choice.message.content = "Not a JSON object"
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    mock_chat.completions.create.return_value = mock_response
    mock_client.chat = mock_chat

    provider = OpenAIProvider(settings=test_settings, client=mock_client)

    with pytest.raises(AIProviderExecutionError, match="Invalid JSON structure"):
        await provider.analyze(
            request_id="test-fail-req",
            operation=AIOperation.PROJECT_INSIGHT,
            context=AIAnalysisContext(),
        )
