"""Pydantic models for outgoing AI analysis responses."""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.requests import AIOperation


class RecommendationPriority(str, Enum):
    """Severity / priority level of an AI recommendation."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RecommendationCategory(str, Enum):
    """Categorical classification of an AI recommendation."""

    BLOCKER = "BLOCKER"
    DELIVERY_RISK = "DELIVERY_RISK"
    MILESTONE = "MILESTONE"
    PRIORITY = "PRIORITY"
    OWNERSHIP = "OWNERSHIP"
    WORKLOAD = "WORKLOAD"
    PROCESS = "PROCESS"
    RISK_MITIGATION = "RISK_MITIGATION"
    PLANNING = "PLANNING"
    QUALITY = "QUALITY"
    RESOURCE = "RESOURCE"
    DEPENDENCY = "DEPENDENCY"
    DEADLINE = "DEADLINE"
    UNBLOCK = "UNBLOCK"
    EXECUTION = "EXECUTION"


class AIAttentionArea(BaseModel):
    """Specific project or task area requiring attention grounded in telemetry."""

    title: str = Field(..., min_length=1, description="Brief attention area header")
    description: str = Field(..., min_length=1, description="Fact-based explanation")
    severity: RecommendationPriority = Field(
        default=RecommendationPriority.HIGH, description="Severity of the attention item"
    )


class AIDependencyImpact(BaseModel):
    """Structured impact assessment of task dependencies."""

    has_blocking_dependencies: bool = Field(
        default=False,
        description="Whether task is blocked by unresolved predecessor dependencies",
    )
    description: str = Field(
        default="", description="Fact-grounded explanation of dependency impact"
    )


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


class AIDecomposedSubtask(BaseModel):
    """Structured proposal for subtask decomposition."""

    title: str = Field(..., min_length=1, max_length=200, description="Clear, actionable title")
    description: Optional[str] = Field(
        default=None, max_length=1000, description="Concise scope and acceptance criteria"
    )
    priority: Optional[RecommendationPriority] = Field(
        default=RecommendationPriority.MEDIUM, description="Recommended priority level"
    )
    order: int = Field(default=1, ge=1, le=50, description="Sequential execution order")


class ActionType(str, Enum):
    """Supported task mutation action types."""

    UPDATE_STATUS = "UPDATE_STATUS"
    UPDATE_PRIORITY = "UPDATE_PRIORITY"
    UPDATE_DUE_DATE = "UPDATE_DUE_DATE"
    ASSIGN_TASK = "ASSIGN_TASK"


class ActionConfidence(str, Enum):
    """Categorical confidence level for proposed actions."""

    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class ActionTarget(BaseModel):
    """Target entity reference for the proposed action."""

    model_config = ConfigDict(populate_by_name=True)
    task_id: str = Field(..., alias="taskId", description="Target task UUID")


class AITaskActionProposal(BaseModel):
    """Structured, human-reviewed task action proposal."""

    model_config = ConfigDict(populate_by_name=True)
    action_id: str = Field(
        ..., alias="actionId", description="Stable deterministic or UUID identifier for proposal"
    )
    type: ActionType = Field(..., description="Action classification type")
    title: str = Field(
        ..., min_length=1, max_length=200, description="Explicit human-readable action description"
    )
    reason: str = Field(
        ..., min_length=1, max_length=1000, description="Fact-grounded rationale for the proposal"
    )
    confidence: ActionConfidence = Field(
        default=ActionConfidence.HIGH, description="Confidence level (HIGH, MEDIUM, LOW)"
    )
    target: ActionTarget = Field(..., description="Target entity being proposed for mutation")
    expected_current_state: Dict[str, Any] = Field(
        default_factory=dict,
        alias="expectedCurrentState",
        description="Expected task state before applying action to guard against stale updates",
    )
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Typed parameters required to execute the mutation upon approval",
    )


class AIAnalysisResponse(BaseModel):
    """Structured response payload returned by POST /ai/analyze."""

    request_id: str = Field(..., description="Traceable correlation ID")
    operation: AIOperation = Field(..., description="Executed operation")
    summary: str = Field(..., min_length=1, description="Synthesized executive summary or insight")
    recommendations: List[AIRecommendation] = Field(
        default_factory=list, description="Actionable recommendations"
    )
    attention_areas: List[AIAttentionArea] = Field(
        default_factory=list, description="Specific project areas requiring attention"
    )
    dependency_impact: Optional[AIDependencyImpact] = Field(
        default=None, description="Structured assessment of dependency blockers"
    )
    subtasks: List[AIDecomposedSubtask] = Field(
        default_factory=list, description="Proposed decomposed subtask items"
    )
    actions: List[AITaskActionProposal] = Field(
        default_factory=list, description="Proposed human-approved task actions"
    )
    notes: List[str] = Field(default_factory=list, description="Advisory decomposition notes")
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
