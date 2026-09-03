"""Sentry error monitoring and observability module for TaskFlow AI service."""

import logging
from typing import Any, Dict, Optional

import sentry_sdk
from sentry_sdk.types import Event, Hint

from app.config import Settings, get_settings

logger = logging.getLogger("taskflow.ai.monitoring")

_initialized = False

SENSITIVE_HEADERS = {
    "authorization",
    "cookie",
    "set-cookie",
    "x-taskflow-service-token",
    "x-api-key",
    "proxy-authorization",
}


def _scrub_event(event: Event, hint: Hint) -> Optional[Event]:
    """Scrubs sensitive authentication tokens and request data from Sentry events."""
    request_data = event.get("request")
    if request_data and isinstance(request_data, dict):
        # Scrub HTTP headers
        headers = request_data.get("headers")
        if headers and isinstance(headers, dict):
            for key in list(headers.keys()):
                if key.lower() in SENSITIVE_HEADERS:
                    headers[key] = "[REDACTED]"

        # Scrub cookies
        if "cookies" in request_data:
            request_data["cookies"] = "[REDACTED]"

        # Scrub request body if it contains sensitive keys
        body = request_data.get("data")
        if body and isinstance(body, dict):
            sensitive_keys = [
                "ai_service_token",
                "openai_api_key",
                "password",
                "token",
                "secret",
            ]
            for sensitive_key in sensitive_keys:
                if sensitive_key in body:
                    body[sensitive_key] = "[REDACTED]"

    # Ensure service tag is always present
    tags = event.setdefault("tags", {})
    if isinstance(tags, dict):
        tags["service"] = "ai"

    return event


def init_sentry(settings: Optional[Settings] = None, force: bool = False) -> bool:
    """Initializes Sentry for FastAPI runtime if DSN is configured."""
    global _initialized

    if _initialized and not force:
        return True

    cfg = settings or get_settings()
    if not cfg.sentry_dsn:
        logger.debug("Sentry DSN not configured. Observability telemetry disabled for AI service.")
        return False

    sentry_sdk.init(
        dsn=cfg.sentry_dsn,
        environment=cfg.sentry_environment or cfg.app_env,
        release="taskflow-ai@0.1.0",
        traces_sample_rate=cfg.sentry_traces_sample_rate,
        before_send=_scrub_event,
    )

    _initialized = True
    env_name = cfg.sentry_environment or cfg.app_env
    logger.info("Sentry monitoring initialized for AI service in environment: %s", env_name)
    return True


def capture_exception(
    exc: Exception,
    request_id: Optional[str] = None,
    operation: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    """Captures unexpected exceptions with correlated request context."""
    if not _initialized and not get_settings().sentry_dsn:
        return None

    with sentry_sdk.isolation_scope() as scope:
        scope.set_tag("service", "ai")
        if request_id:
            scope.set_tag("request_id", request_id)
            scope.set_context("correlation", {"request_id": request_id})
        if operation:
            scope.set_tag("operation", operation)
        if extra:
            # Redact any obvious tokens from extra context
            sensitive_words = ["token", "secret", "key", "password"]
            sanitized_extra = {
                k: ("[REDACTED]" if any(s in k.lower() for s in sensitive_words) else v)
                for k, v in extra.items()
            }
            scope.set_context("diagnostic_data", sanitized_extra)

        return sentry_sdk.capture_exception(exc)


def is_sentry_enabled() -> bool:
    """Returns whether Sentry is currently initialized and enabled."""
    return _initialized


def reset_sentry_for_testing() -> None:
    """Resets initialization state (for test isolation only)."""
    global _initialized
    _initialized = False
