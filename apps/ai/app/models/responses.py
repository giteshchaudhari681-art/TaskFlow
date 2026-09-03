"""Pydantic models for outgoing AI analysis responses."""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.models.requests import AIOperation


class RecommendationPriority(str, Enum):
    """Severity / priority level of an AI recommendation."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RecommendationCategory(str, Enum):
    """Categorical classification of an AI recommendation."""

    RISK_MITIGATION = "RISK_MITIGATION"
    PROCESS = "PROCESS"
    RESOURCE = "RESOURCE"
    PLANNING = "PLANNING"
    QUALITY = "QUALITY"


class AIRecommendation(BaseModel):
    """Actionable recommendation synthesized by the AI engine."""

    title: str = Field(..., min_length=1, description="Brief recommendation summary header")
    description: str = Field(..., min_length=1, description="Detailed actionable guidance")
    priority: RecommendationPriority = Field(
        default=RecommendationPriority.MEDIUM, description="Priority level"
    )
    category: RecommendationCategory = Field(
        default=RecommendationCategory.PLANNING, description="Category classification"
    )


class AIAnalysisResponse(BaseModel):
    """Structured response payload returned by POST /ai/analyze."""

    request_id: str = Field(..., description="Traceable correlation ID")
    operation: AIOperation = Field(..., description="Executed operation")
    summary: str = Field(..., min_length=1, description="Synthesized executive summary or insight")
    recommendations: List[AIRecommendation] = Field(
        default_factory=list, description="Actionable recommendations"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Execution telemetry (model, tokens, latency)"
    )


class ErrorDetail(BaseModel):
    """Sanitized error payload detail."""

    code: str = Field(..., description="Standardized error code")
    message: str = Field(..., description="Client-safe error message")
    request_id: Optional[str] = Field(
        default=None, description="Correlation identifier for debugging"
    )


class ErrorResponse(BaseModel):
    """Top-level error response envelope."""

    success: bool = Field(default=False)
    error: ErrorDetail
