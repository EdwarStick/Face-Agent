"""
FaceAttendance AI — FastAPI Application Entry Point
====================================================
Bootstraps the FastAPI application with:
  - CORS middleware
  - API v1 router
  - Startup / shutdown lifecycle hooks
  - OpenAPI metadata
"""

from contextlib import asynccontextmanager

# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from loguru import logger
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.db.base import Base, check_db_connection, engine


# ── Lifespan (replaces deprecated on_event) ───────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs startup logic before the first request and cleanup on shutdown."""
    # ── Startup ───────────────────────────────────────────────────────────────
    setup_logging()
    logger.info(f"Starting {settings.app_name} v{settings.app_version} [{settings.app_env}]")

    db_ok = check_db_connection()
    if not db_ok:
        logger.warning(
            "Database is unreachable at startup. "
            "The API will start, but DB-dependent endpoints will fail."
        )
    else:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables synchronized.")

    yield  # Application runs here

    # ── Shutdown ──────────────────────────────────────────────────────────────
    logger.info(f"Shutting down {settings.app_name}...")


# ── Application Factory ────────────────────────────────────────────────────────
def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Intelligent attendance control system powered by facial recognition. "
            "Built with FastAPI, SQLAlchemy, and DeepFace."
        ),
        openapi_url=f"{settings.api_v1_prefix}/openapi.json",
        docs_url=f"{settings.api_v1_prefix}/docs",
        redoc_url=f"{settings.api_v1_prefix}/redoc",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────────────────
    application.include_router(api_router, prefix=settings.api_v1_prefix)

    return application


app: FastAPI = create_application()
