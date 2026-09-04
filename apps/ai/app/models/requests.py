"""Pydantic models for incoming AI analysis requests."""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class AIOperation(str, Enum):
    """Controlled enumeration of supported AI operations."""

    PROJECT_SUMMARY = "PROJECT_SUMMARY"
    TASK_SUMMARY = "TASK_SUMMARY"
    PROJECT_INSIGHT = "PROJECT_INSIGHT"
    TASK_DECOMPOSITION = "TASK_DECOMPOSITION"


class ProjectContext(BaseModel):
    """Structured project context passed from Node.js Express."""

    project_id: str = Field(..., description="Project UUID")
    project_key: str = Field(..., description="Short key identifier e.g. ALPHA")
    project_name: str = Field(..., description="Project display title")
    project_status: Optional[str] = Field(default=None, description="Status e.g. ACTIVE, ARCHIVED")
    description: Optional[str] = Field(default=None, description="Project description")


class TaskContext(BaseModel):
    """Structured task context passed from Node.js Express."""

    task_id: str = Field(..., description="Task UUID")
    issue_key: str = Field(..., description="Task key identifier e.g. ALPHA-12")
    title: str = Field(..., description="Task title")
    status: str = Field(..., description="Task status e.g. TODO, IN_PROGRESS, DONE")
    priority: str = Field(..., description="Task priority e.g. LOW, MEDIUM, HIGH, URGENT, CRITICAL")
    due_date: Optional[datetime] = Field(default=None, description="Due date timestamp")
    assignee: Optional[str] = Field(default=None, description="Assignee name or email")
    description: Optional[str] = Field(default=None, description="Task description content")


class ProjectMetricsContext(BaseModel):
    """Deterministic project metrics snapshot."""

    total_tasks: int = Field(default=0, ge=0, description="Total active task count")
    completed_tasks: int = Field(default=0, ge=0, description="Completed task count")
    in_flight_tasks: int = Field(default=0, ge=0, description="In-progress or review task count")
    overdue_tasks: int = Field(default=0, ge=0, description="Tasks past due date")
    blocked_tasks: int = Field(
        default=0, ge=0, description="Tasks with active blocking dependencies"
    )
    completion_percentage: int = Field(
        default=0, ge=0, le=100, description="Canonical completion percentage (0-100)"
    )


class MilestoneContext(BaseModel):
    """Structured milestone snapshot."""

    milestone_id: str = Field(..., description="Milestone UUID")
    title: str = Field(..., description="Milestone title")
    status: str = Field(..., description="Milestone status e.g. OPEN, COMPLETED")
    due_date: Optional[datetime] = Field(default=None, description="Milestone target date")
    progress_percentage: int = Field(
        default=0, ge=0, le=100, description="Milestone progress percentage (0-100)"
    )


class ProjectHealthContext(BaseModel):
    """Deterministic project health assessment context (from PR14 engine)."""

    state: str = Field(..., description="Deterministic project health state e.g. ON_TRACK, AT_RISK")
    score: int = Field(default=100, ge=0, le=100, description="Project health score (0-100)")
    reasons: List[str] = Field(
        default_factory=list, description="Specific triggers/reasons for health state"
    )


class DeliveryRiskContext(BaseModel):
    """Deterministic delivery risk item (from PR14 risk engine)."""

    type: str = Field(..., description="Risk classification type")
    severity: str = Field(..., description="Severity level e.g. CRITICAL, HIGH, MEDIUM, LOW")
    message: str = Field(..., description="Concise human-readable risk description")


class TaskDependencyContext(BaseModel):
    """Dependency relationship for a task."""

    task_id: str = Field(..., description="Related task UUID")
    issue_key: str = Field(..., description="Related task issue key e.g. ALPHA-5")
    title: str = Field(..., description="Related task title")
    status: str = Field(..., description="Related task status e.g. TODO, IN_PROGRESS, DONE")
    relationship: str = Field(
        ...,
        description="Relationship type e.g. BLOCKING_PREDECESSOR, BLOCKED_SUCCESSOR, RELATES_TO",
    )


class SubtaskContext(BaseModel):
    """Subtask item context."""

    id: str = Field(..., description="Subtask UUID")
    title: str = Field(..., description="Subtask title")
    status: str = Field(..., description="Subtask status")
    is_completed: bool = Field(default=False, description="Whether subtask is completed")


class TaskCommentContext(BaseModel):
    """Bounded, sanitized task comment context."""

    author: str = Field(..., description="Author display name")
    content: str = Field(..., description="Sanitized comment content")
    created_at: Optional[str] = Field(default=None, description="Comment timestamp")


class TaskDetailContext(BaseModel):
    """Comprehensive, bounded context for single-task AI intelligence."""

    task_id: str = Field(..., description="Task UUID")
    issue_key: str = Field(..., description="Task key identifier e.g. ALPHA-12")
    title: str = Field(..., description="Task title")
    status: str = Field(..., description="Task status")
    priority: str = Field(..., description="Task priority")
    due_date: Optional[str] = Field(default=None, description="Due date timestamp string")
    created_at: Optional[str] = Field(default=None, description="Created timestamp string")
    assignee: Optional[str] = Field(default=None, description="Assignee name")
    labels: List[str] = Field(default_factory=list, description="Attached label names")
    description: Optional[str] = Field(default=None, description="Sanitized task description")
    subtasks: List[SubtaskContext] = Field(default_factory=list, description="Subtasks list")
    dependencies: List[TaskDependencyContext] = Field(
        default_factory=list, description="Active dependencies"
    )
    recent_comments: List[TaskCommentContext] = Field(
        default_factory=list, description="Recent bounded comments"
    )
    parent_project: Optional[ProjectContext] = Field(
        default=None, description="Parent project overview"
    )


class AIAnalysisContext(BaseModel):
    """Aggregated project and task domain context for AI synthesis."""

    project: Optional[ProjectContext] = Field(default=None, description="Project metadata context")
    target_task: Optional[TaskDetailContext] = Field(
        default=None, description="Detailed target task context for individual task operations"
    )
    tasks: List[TaskContext] = Field(default_factory=list, description="Tasks in scope")
    metrics: Optional[ProjectMetricsContext] = Field(
        default=None, description="Deterministic project metrics"
    )
    milestones: List[MilestoneContext] = Field(
        default_factory=list, description="Milestones in scope"
    )
    health: Optional[ProjectHealthContext] = Field(
        default=None, description="Authoritative deterministic project health"
    )
    delivery_risks: List[DeliveryRiskContext] = Field(
        default_factory=list, description="Authoritative deterministic delivery risks"
    )


class AIAnalysisRequest(BaseModel):
    """Runtime request contract for POST /ai/analyze."""

    request_id: Optional[str] = Field(default=None, description="Traceable correlation ID")
    operation: AIOperation = Field(..., description="Target AI operation to execute")
    context: AIAnalysisContext = Field(
        default_factory=AIAnalysisContext, description="Structured TaskFlow domain context"
    )
    user_prompt: Optional[str] = Field(
        default=None, max_length=2000, description="Optional refinement prompt"
    )
