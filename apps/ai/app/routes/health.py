"""Health endpoint for TaskFlow AI Subsystem."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.config import Settings, get_settings

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    """Health check response payload."""

    status: str = Field(..., description="Service status", examples=["ok"])
    service: str = Field(..., description="Service identifier", examples=["taskflow-ai"])
    version: str = Field(..., description="Service semver version", examples=["0.1.0"])
    environment: str = Field(..., description="Runtime environment name", examples=["development"])


@router.get("/health", response_model=HealthResponse)
async def get_health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """
    Returns the health status of the TaskFlow AI service.

    Does NOT connect to external AI providers or expose credentials.
    """
    return HealthResponse(
        status="ok",
        service="taskflow-ai",
        version="0.1.0",
        environment=settings.app_env,
    )
