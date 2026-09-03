"""Abstract base interface for AI providers."""

from abc import ABC, abstractmethod
from typing import Optional

from app.models.requests import AIAnalysisContext, AIOperation
from app.models.responses import AIAnalysisResponse


class BaseAIProvider(ABC):
    """Abstract interface for LLM / AI providers (OpenAI, Anthropic, Mock, etc.)."""

    @abstractmethod
    async def analyze(
        self,
        request_id: str,
        operation: AIOperation,
        context: AIAnalysisContext,
        user_prompt: Optional[str] = None,
    ) -> AIAnalysisResponse:
        """Executes an AI analysis operation on structured TaskFlow domain context."""
        pass
