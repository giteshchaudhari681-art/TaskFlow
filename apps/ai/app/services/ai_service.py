"""Domain AI service orchestrating business rules and provider dispatch."""

import uuid
from typing import Optional

from app.config import Settings, get_settings
from app.models.requests import AIAnalysisRequest
from app.models.responses import AIAnalysisResponse
from app.services.providers.base import BaseAIProvider
from app.services.providers.openai_provider import OpenAIProvider


class AIService:
    """Service layer coordinating domain request validation, correlation tracking,
    and AI provider execution.
    """

    def __init__(
        self,
        provider: Optional[BaseAIProvider] = None,
        settings: Optional[Settings] = None,
    ):
        self.settings = settings or get_settings()
        self.provider = provider or OpenAIProvider(self.settings)

    async def analyze(self, request: AIAnalysisRequest) -> AIAnalysisResponse:
        """Executes an AI analysis operation with request correlation ID tracking."""
        request_id = request.request_id or str(uuid.uuid4())

        return await self.provider.analyze(
            request_id=request_id,
            operation=request.operation,
            context=request.context,
            user_prompt=request.user_prompt,
        )
