"""
FaceAttendance AI — FastAPI Application Entry Point
====================================================
Bootstraps the FastAPI application with:
  - CORS middleware
  - API v1 router
  - Startup / shutdown lifecycle hooks
  - Global exception handlers
  - OpenAPI metadata
"""

import re
from contextlib import asynccontextmanager

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Request, status
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse
# pyrefly: ignore [missing-import]
from loguru import logger
# pyrefly: ignore [missing-import]
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.db.base import check_db_connection


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
        logger.info(
            "Database reachable. Ensure migrations are up to date: "
            "`alembic upgrade head`"
        )

    # Precargar modelo DeepFace en memoria al arrancar para evitar 504 Gateway Timeout
    try:
        from app.services.face_service import precargar_modelo
        precargar_modelo()
    except Exception as e:
        logger.warning(f"No se pudo precargar modelo facial en startup: {e}")

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

    # ── Global Exception Handlers ─────────────────────────────────────────────
    _register_exception_handlers(application)

    return application


def _register_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers that return friendly JSON messages."""

    COLUMN_MAP = {
        "codigo_empleado": "Ya existe un empleado con este código de documento. Intente con uno diferente.",
        "correo": "Ya existe un empleado con este correo electrónico. Intente con uno diferente.",
    }

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(_request: Request, exc: IntegrityError) -> JSONResponse:
        """Transform unique-constraint violations into 409 Conflict."""
        msg = str(exc.orig) if exc.orig else str(exc)
        m = re.search(r'Key \((.+?)\)=', msg)
        detail = COLUMN_MAP.get(m.group(1), "Ya existe un registro con esos datos. Verifique e intente nuevamente.") if m else msg
        logger.warning(f"Integrity error: {msg}")
        return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": detail})

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error_handler(_request: Request, exc: SQLAlchemyError) -> JSONResponse:
        """Catch any remaining SQLAlchemy errors → 500."""
        logger.error(f"Database error: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Error interno de base de datos. Intente nuevamente."},
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(_request: Request, exc: ValueError) -> JSONResponse:
        """Business-logic validation errors → 400."""
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": str(exc)})

    @app.exception_handler(Exception)
    async def generic_error_handler(_request: Request, exc: Exception) -> JSONResponse:
        """Safety net for any unhandled exception → 500."""
        logger.error(f"Unhandled exception: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Error interno del servidor. Intente nuevamente."},
        )


app: FastAPI = create_application()
