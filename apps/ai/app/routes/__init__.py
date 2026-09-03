"""Routes package exporting endpoint routers."""

from app.routes.ai import router as ai_router
from app.routes.health import router as health_router

__all__ = ["health_router", "ai_router"]
