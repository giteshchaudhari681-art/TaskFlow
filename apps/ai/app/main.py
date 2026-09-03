"""TaskFlow AI Service FastAPI Application Entrypoint."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.models.responses import ErrorDetail, ErrorResponse
from app.routes.ai import router as ai_router
from app.routes.health import router as health_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("taskflow.ai")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown lifespan management."""
    settings = get_settings()
    logger.info("Starting TaskFlow AI Service in %s mode", settings.app_env)
    yield
    logger.info("Shutting down TaskFlow AI Service")


app = FastAPI(
    title="TaskFlow Internal AI Service",
    description=(
        "Dedicated Python + Pydantic AI subsystem for TaskFlow project intelligence. "
        "This API is an internal service. Public clients must use the Node.js TaskFlow API."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS restricted to localhost/internal networks
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Standardized validation error handler returning sanitized error envelope."""
    error_messages = []
    for err in exc.errors():
        loc = " -> ".join(str(loc_item) for loc_item in err.get("loc", []))
        msg = err.get("msg", "Invalid value")
        error_messages.append(f"{loc}: {msg}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=ErrorResponse(
            success=False,
            error=ErrorDetail(
                code="VALIDATION_ERROR",
                message="; ".join(error_messages)
                if error_messages
                else "Request validation failed",
            ),
        ).model_dump(),
    )


# Attach routers
app.include_router(health_router)
app.include_router(ai_router)


if __name__ == "__main__":
    import uvicorn

    cfg = get_settings()
    uvicorn.run(
        "app.main:app",
        host=cfg.ai_service_host,
        port=cfg.ai_service_port,
        reload=cfg.app_env == "development",
    )
