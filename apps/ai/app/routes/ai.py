"""AI routes dispatching domain analysis requests."""

import hmac
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, status
from fastapi.responses import JSONResponse

from app.config import Settings, get_settings
from app.models.requests import AIAnalysisRequest
from app.models.responses import (
    AIAnalysisResponse,
    ErrorDetail,
    ErrorResponse,
)
from app.monitoring import capture_exception
from app.services.ai_service import AIService
from app.services.providers.openai_provider import (
    AIProviderConfigurationError,
    AIProviderExecutionError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI"])


def get_ai_service() -> AIService:
    """Dependency provider for AIService."""
    return AIService()


@router.post(
    "/analyze",
    response_model=AIAnalysisResponse,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorResponse},
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse},
        status.HTTP_502_BAD_GATEWAY: {"model": ErrorResponse},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse},
    },
)
async def analyze_context(
    request: AIAnalysisRequest,
    service: AIService = Depends(get_ai_service),
    settings: Settings = Depends(get_settings),
    x_taskflow_service_token: Optional[str] = Header(
        default=None, alias="X-TaskFlow-Service-Token"
    ),
    x_request_id: Optional[str] = Header(default=None, alias="X-Request-ID"),
) -> AIAnalysisResponse:
    """
    Executes structured AI analysis on project or task context.

    Validates request payload with Pydantic, checks internal service token,
    routes through the AIService layer, and returns a typed, structured AI response.
    """
    # Correlate request_id from header if not explicitly present in request body
    if not request.request_id and x_request_id:
        request.request_id = x_request_id

    # Verify internal service token if configured
    if settings.ai_service_token:
        if not x_taskflow_service_token or not hmac.compare_digest(
            x_taskflow_service_token, settings.ai_service_token
        ):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content=ErrorResponse(
                    success=False,
                    error=ErrorDetail(
                        code="UNAUTHORIZED_SERVICE",
                        message="Missing or invalid internal service token.",
                        request_id=request.request_id,
                    ),
                ).model_dump(),
            )

    try:
        return await service.analyze(request)
    except AIProviderConfigurationError as exc:
        logger.warning("AI provider configuration error: %s. Returning mock data.", str(exc))
        import uuid
        from app.models.responses import (
            AIRecommendation,
            RecommendationPriority,
            RecommendationCategory,
            AIAttentionArea,
            AIDependencyImpact,
            AIDecomposedSubtask,
        )
        return AIAnalysisResponse(
            request_id=request.request_id or str(uuid.uuid4()),
            operation=request.operation,
            summary="[MOCK AI] AI Provider not configured. This is fallback development data.",
            recommendations=[
                AIRecommendation(
                    title="Configure API Key",
                    description="Set the OPENAI_API_KEY environment variable to enable real AI.",
                    priority=RecommendationPriority.MEDIUM,
                    category=RecommendationCategory.PLANNING
                )
            ],
            attention_areas=[
                AIAttentionArea(
                    title="Missing Configuration",
                    description="The AI service is running in mock mode.",
                    severity=RecommendationPriority.HIGH
                )
            ],
            dependency_impact=AIDependencyImpact(
                has_blocking_dependencies=False,
                description="No blocking dependencies detected in mock mode."
            ),
            subtasks=[
                AIDecomposedSubtask(
                    title="Add API Key to .env",
                    description="Configure the environment for the AI service.",
                    priority=RecommendationPriority.HIGH,
                    order=1
                )
            ],
            actions=[],
            notes=["This mock data is provided by the fallback handler."],
            metadata={"mocked": True}
        )
    except AIProviderExecutionError as exc:
        logger.error("AI provider execution failed: %s", str(exc))
        op_name = (
            request.operation.value
            if hasattr(request.operation, "value")
            else str(request.operation)
        )
        capture_exception(
            exc,
            request_id=request.request_id,
            operation=op_name,
            extra={"status_code": 502, "error_code": "AI_PROVIDER_ERROR"},
        )
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(
                    code="AI_PROVIDER_ERROR",
                    message="Upstream AI provider error occurred during analysis.",
                    request_id=request.request_id,
                ),
            ).model_dump(),
        )
    except Exception as exc:
        logger.exception("Unexpected error during AI analysis")
        op_name = (
            request.operation.value
            if hasattr(request.operation, "value")
            else str(request.operation)
        )
        capture_exception(
            exc,
            request_id=request.request_id,
            operation=op_name,
            extra={"status_code": 500, "error_code": "AI_INTERNAL_ERROR"},
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                success=False,
                error=ErrorDetail(
                    code="AI_INTERNAL_ERROR",
                    message="An unexpected error occurred in the AI processing service.",
                    request_id=request.request_id,
                ),
            ).model_dump(),
        )
