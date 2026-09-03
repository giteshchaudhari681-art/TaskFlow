"""Tests for GET /health endpoint."""

from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app


def test_health_returns_ok_and_correct_structure(client: TestClient) -> None:
    """GET /health must return 200 with standard health envelope."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "taskflow-ai"
    assert data["version"] == "0.1.0"
    assert data["environment"] == "testing"


def test_health_does_not_expose_secrets(client: TestClient) -> None:
    """GET /health must never leak API keys, tokens, or internal secrets."""
    response = client.get("/health")
    raw_text = response.text.lower()

    assert "sk-" not in raw_text
    assert "secret" not in raw_text
    assert "token" not in raw_text
    assert "password" not in raw_text
    assert "key" not in raw_text


def test_health_succeeds_without_openai_key() -> None:
    """GET /health must succeed even if OpenAI is unconfigured or unavailable."""
    unconfigured_settings = Settings(
        app_env="production",
        openai_api_key=None,
    )
    app.dependency_overrides[get_settings] = lambda: unconfigured_settings

    with TestClient(app) as test_client:
        response = test_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["environment"] == "production"

    app.dependency_overrides.clear()
