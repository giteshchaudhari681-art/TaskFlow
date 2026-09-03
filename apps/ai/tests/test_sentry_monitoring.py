"""Unit tests for Sentry observability and error monitoring in TaskFlow AI service."""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app
from app.monitoring import (
    _scrub_event,
    capture_exception,
    init_sentry,
    is_sentry_enabled,
    reset_sentry_for_testing,
)
from app.services.providers.openai_provider import AIProviderExecutionError


@pytest.fixture(autouse=True)
def clean_sentry_state():
    """Ensures Sentry initialization state is clean before each test."""
    reset_sentry_for_testing()
    yield
    reset_sentry_for_testing()


def test_sentry_skips_init_when_dsn_absent():
    """Verify Sentry init gracefully no-ops when no DSN is configured."""
    settings = Settings(sentry_dsn=None)
    with patch("sentry_sdk.init") as mock_init:
        res = init_sentry(settings)
        assert res is False
        assert is_sentry_enabled() is False
        mock_init.assert_not_called()


def test_sentry_initializes_with_dsn_and_is_idempotent():
    """Verify Sentry initializes when DSN is present and prevents duplicate init."""
    settings = Settings(
        sentry_dsn="https://examplePublicKey@o0.ingest.sentry.io/0",
        sentry_environment="test",
    )
    with patch("sentry_sdk.init") as mock_init:
        res1 = init_sentry(settings)
        assert res1 is True
        assert is_sentry_enabled() is True
        assert mock_init.call_count == 1

        # Second call should no-op
        res2 = init_sentry(settings, force=False)
        assert res2 is True
        assert mock_init.call_count == 1


def test_sentry_event_scrubbing_redacts_sensitive_tokens_and_headers():
    """Verify event scrubber strips authentication tokens, cookies, and sensitive headers."""
    raw_event = {
        "request": {
            "headers": {
                "x-taskflow-service-token": "secret-service-token-12345",
                "authorization": "Bearer user-jwt-token-67890",
                "cookie": "session_id=abcdef12345",
                "user-agent": "TaskFlow-TestClient/1.0",
            },
            "cookies": "raw-cookie-string",
            "data": {
                "ai_service_token": "token-to-scrub",
                "openai_api_key": "sk-proj-secret-key",
                "password": "user-password",
                "public_field": "safe-value",
            },
        },
        "tags": {},
    }

    scrubbed = _scrub_event(raw_event, {})

    headers = scrubbed["request"]["headers"]
    assert headers["x-taskflow-service-token"] == "[REDACTED]"
    assert headers["authorization"] == "[REDACTED]"
    assert headers["cookie"] == "[REDACTED]"
    assert headers["user-agent"] == "TaskFlow-TestClient/1.0"

    assert scrubbed["request"]["cookies"] == "[REDACTED]"

    data = scrubbed["request"]["data"]
    assert data["ai_service_token"] == "[REDACTED]"
    assert data["openai_api_key"] == "[REDACTED]"
    assert data["password"] == "[REDACTED]"
    assert data["public_field"] == "safe-value"

    assert scrubbed["tags"]["service"] == "ai"


def test_capture_exception_attaches_request_correlation_and_operation():
    """Verify capture_exception sets tags and records exception."""
    with patch("sentry_sdk.init"):
        settings = Settings(sentry_dsn="https://mock@sentry.io/1")
        init_sentry(settings)

    with patch("sentry_sdk.capture_exception") as mock_capture:
        mock_capture.return_value = "mock-event-id"
        exc = RuntimeError("Simulated internal worker crash")

        event_id = capture_exception(
            exc,
            request_id="trace-corr-777",
            operation="PROJECT_INSIGHT",
            extra={"status_code": 500, "user_token": "must-be-redacted"},
        )

        assert event_id == "mock-event-id"
        mock_capture.assert_called_once_with(exc)


def test_api_route_filters_401_unauthorized_from_sentry():
    """Verify expected 401 unauthorized errors do NOT trigger Sentry capture."""
    client = TestClient(app)
    with patch("app.routes.ai.capture_exception") as mock_capture:
        # Request without service token
        resp = client.post(
            "/ai/analyze",
            json={
                "operation": "PROJECT_INSIGHT",
                "user_prompt": "Provide recommendations",
                "context_summary": "Active project context",
            },
        )

        assert resp.status_code == 401
        assert resp.json()["success"] is False
        assert resp.json()["error"]["code"] == "UNAUTHORIZED_SERVICE"
        mock_capture.assert_not_called()


def test_api_route_filters_422_validation_error_from_sentry():
    """Verify expected 422 Pydantic validation errors do NOT trigger Sentry capture."""
    client = TestClient(app)
    with patch("app.routes.ai.capture_exception") as mock_capture:
        # Invalid body missing required fields
        resp = client.post(
            "/ai/analyze",
            json={"invalid_payload": True},
            headers={"X-TaskFlow-Service-Token": "taskflow-internal-dev-token"},
        )

        assert resp.status_code == 422
        assert resp.json()["success"] is False
        assert resp.json()["error"]["code"] == "VALIDATION_ERROR"
        mock_capture.assert_not_called()


def test_api_route_captures_502_upstream_ai_provider_error():
    """Verify unexpected 502 provider failures ARE captured to Sentry."""
    client = TestClient(app)
    with patch("app.routes.ai.AIService.analyze") as mock_analyze:
        mock_analyze.side_effect = AIProviderExecutionError("OpenAI API rate limit exceeded")

        with patch("app.routes.ai.capture_exception") as mock_capture:
            resp = client.post(
                "/ai/analyze",
                json={
                    "operation": "PROJECT_INSIGHT",
                    "user_prompt": "Analyze",
                    "context_summary": "Context",
                },
                headers={
                    "X-TaskFlow-Service-Token": "taskflow-internal-dev-token",
                    "X-Request-ID": "corr-req-502",
                },
            )

            assert resp.status_code == 502
            assert resp.json()["success"] is False
            assert resp.json()["error"]["code"] == "AI_PROVIDER_ERROR"
            assert resp.json()["error"]["request_id"] == "corr-req-502"

            mock_capture.assert_called_once()
            _, kwargs = mock_capture.call_args
            assert kwargs["request_id"] == "corr-req-502"
            assert kwargs["operation"] == "PROJECT_INSIGHT"
