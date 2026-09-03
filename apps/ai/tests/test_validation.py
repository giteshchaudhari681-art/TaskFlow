"""Tests for Pydantic runtime domain validation."""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.models.requests import (
    AIAnalysisContext,
    AIAnalysisRequest,
    AIOperation,
    ProjectContext,
    ProjectMetricsContext,
    TaskContext,
)
from app.models.responses import (
    AIRecommendation,
    RecommendationCategory,
    RecommendationPriority,
)


def test_valid_request_deserialization(sample_request: AIAnalysisRequest) -> None:
    """Valid request schema parses cleanly without errors."""
    dumped = sample_request.model_dump(mode="json")
    reloaded = AIAnalysisRequest.model_validate(dumped)

    assert reloaded.operation == AIOperation.PROJECT_SUMMARY
    assert reloaded.context.project is not None
    assert reloaded.context.project.project_key == "ALPHA"
    assert reloaded.context.metrics is not None
    assert reloaded.context.metrics.total_tasks == 25


def test_missing_operation_rejected(client: TestClient) -> None:
    """Missing required 'operation' field triggers 422 validation error."""
    payload = {
        "context": {
            "project": {
                "project_id": "11111111-1111-1111-1111-111111111111",
                "project_key": "ALPHA",
                "project_name": "Alpha Platform",
            }
        }
    }
    response = client.post("/ai/analyze", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "operation" in data["error"]["message"]


def test_invalid_operation_enum_rejected(client: TestClient) -> None:
    """Invalid operation string value triggers 422."""
    payload = {
        "operation": "NON_EXISTENT_MAGIC_AI",
        "context": {},
    }
    response = client.post("/ai/analyze", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "operation" in data["error"]["message"]


def test_invalid_metrics_negative_task_count_rejected() -> None:
    """Negative task counts must fail Pydantic validation."""
    with pytest.raises(ValidationError) as exc:
        ProjectMetricsContext(total_tasks=-5)
    assert "greater than or equal to 0" in str(exc.value)


def test_invalid_metrics_completion_percentage_out_of_bounds() -> None:
    """Completion percentage > 100 or < 0 must fail validation."""
    with pytest.raises(ValidationError):
        ProjectMetricsContext(completion_percentage=105)

    with pytest.raises(ValidationError):
        ProjectMetricsContext(completion_percentage=-1)


def test_missing_required_project_fields() -> None:
    """Project context missing required fields fails validation."""
    with pytest.raises(ValidationError):
        ProjectContext(project_id="abc")  # Missing project_key and project_name


def test_missing_required_task_fields() -> None:
    """Task context missing required fields fails validation."""
    with pytest.raises(ValidationError):
        TaskContext(
            task_id="abc",
            issue_key="ALPHA-1",
            title="Task Title",
            # Missing status and priority
        )


def test_excessive_user_prompt_rejected(
    client: TestClient, sample_context: AIAnalysisContext
) -> None:
    """User prompt exceeding 2000 characters triggers 422."""
    huge_prompt = "A" * 2005
    payload = {
        "operation": "PROJECT_SUMMARY",
        "context": sample_context.model_dump(mode="json"),
        "user_prompt": huge_prompt,
    }
    response = client.post("/ai/analyze", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "user_prompt" in data["error"]["message"]


def test_recommendation_model_defaults() -> None:
    """AIRecommendation applies expected default priority and category."""
    rec = AIRecommendation(
        title="Check Velocity",
        description="Verify team delivery trajectory against planned milestone.",
    )
    assert rec.priority == RecommendationPriority.MEDIUM
    assert rec.category == RecommendationCategory.PLANNING


def test_settings_configuration_defaults() -> None:
    """Settings provides safe defaults without requiring real API keys."""
    cfg = Settings()
    assert cfg.ai_service_host == "127.0.0.1"
    assert cfg.ai_service_port == 8000
    assert cfg.app_env == "development"
    assert cfg.openai_model == "gpt-4o-mini"
    assert cfg.ai_request_timeout_seconds == 30.0
