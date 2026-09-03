"""Pytest fixtures and test setup for TaskFlow AI service."""

from typing import Optional

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app
from app.models.requests import (
    AIAnalysisContext,
    AIAnalysisRequest,
    AIOperation,
    MilestoneContext,
    ProjectContext,
    ProjectMetricsContext,
    TaskContext,
)
from app.models.responses import (
    AIAnalysisResponse,
    AIRecommendation,
    RecommendationCategory,
    RecommendationPriority,
)
from app.routes.ai import get_ai_service
from app.services.ai_service import AIService
from app.services.providers.base import BaseAIProvider


class MockAIProvider(BaseAIProvider):
    """Deterministic in-memory mock AI provider for testing."""

    def __init__(self, fail_with: Optional[Exception] = None):
        self.fail_with = fail_with
        self.last_request = None

    async def analyze(
        self,
        request_id: str,
        operation: AIOperation,
        context: AIAnalysisContext,
        user_prompt: Optional[str] = None,
    ) -> AIAnalysisResponse:
        self.last_request = {
            "request_id": request_id,
            "operation": operation,
            "context": context,
            "user_prompt": user_prompt,
        }

        if self.fail_with is not None:
            raise self.fail_with

        recs = [
            AIRecommendation(
                title="Resolve Critical Blockers",
                description=(
                    "Address tasks on the critical dependency chain to restore project velocity."
                ),
                priority=RecommendationPriority.CRITICAL,
                category=RecommendationCategory.RISK_MITIGATION,
            ),
            AIRecommendation(
                title="Realign Milestone Target",
                description=(
                    "Adjust milestone due date or shift remaining scope to maintain quality."
                ),
                priority=RecommendationPriority.HIGH,
                category=RecommendationCategory.PLANNING,
            ),
        ]

        return AIAnalysisResponse(
            request_id=request_id,
            operation=operation,
            summary=f"Synthesized mock summary for operation {operation.value}.",
            recommendations=recs,
            metadata={"model": "mock-provider", "provider": "test-mock"},
        )


@pytest.fixture
def mock_provider() -> MockAIProvider:
    return MockAIProvider()


@pytest.fixture
def test_settings() -> Settings:
    return Settings(
        app_env="testing",
        ai_service_host="127.0.0.1",
        ai_service_port=8000,
        openai_api_key="sk-test-mock-key-12345",
        openai_model="gpt-4o-mini",
        ai_request_timeout_seconds=5.0,
    )


@pytest.fixture
def client(mock_provider: MockAIProvider, test_settings: Settings) -> TestClient:
    app.dependency_overrides[get_settings] = lambda: test_settings
    app.dependency_overrides[get_ai_service] = lambda: AIService(
        provider=mock_provider,
        settings=test_settings,
    )

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def sample_context() -> AIAnalysisContext:
    return AIAnalysisContext(
        project=ProjectContext(
            project_id="11111111-1111-1111-1111-111111111111",
            project_key="ALPHA",
            project_name="Alpha Core Platform",
            project_status="ACTIVE",
            description="Enterprise platform project",
        ),
        metrics=ProjectMetricsContext(
            total_tasks=25,
            completed_tasks=10,
            in_flight_tasks=12,
            overdue_tasks=3,
            blocked_tasks=2,
            completion_percentage=40,
        ),
        milestones=[
            MilestoneContext(
                milestone_id="22222222-2222-2222-2222-222222222222",
                title="Beta Release",
                status="OPEN",
                due_date=None,
                progress_percentage=45,
            )
        ],
        tasks=[
            TaskContext(
                task_id="33333333-3333-3333-3333-333333333333",
                issue_key="ALPHA-101",
                title="Implement Auth Middleware",
                status="IN_PROGRESS",
                priority="HIGH",
                due_date=None,
                assignee="Alice Developer",
                description="Secure API endpoints with JWT verification",
            )
        ],
    )


@pytest.fixture
def sample_request(sample_context: AIAnalysisContext) -> AIAnalysisRequest:
    return AIAnalysisRequest(
        request_id="req-test-uuid-9999",
        operation=AIOperation.PROJECT_SUMMARY,
        context=sample_context,
        user_prompt="Provide an overview of potential bottlenecks.",
    )
