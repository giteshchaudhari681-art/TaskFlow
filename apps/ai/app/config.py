"""Application configuration management using Pydantic Settings."""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for TaskFlow AI Subsystem."""

    ai_service_host: str = "127.0.0.1"
    ai_service_port: int = 8000
    app_env: str = "development"
    ai_service_token: Optional[str] = "taskflow-internal-dev-token"
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o-mini"
    ai_request_timeout_seconds: float = 30.0
    sentry_dsn: Optional[str] = None
    sentry_environment: Optional[str] = None
    sentry_traces_sample_rate: float = 0.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """Returns cached singleton Settings instance."""
    return Settings()
