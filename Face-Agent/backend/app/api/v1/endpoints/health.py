"""
FaceAttendance AI — Health Check API
=====================================
Provides a /health endpoint that verifies application and database status.
This is the first live endpoint; all feature endpoints will follow the same
router pattern under app/api/v1/endpoints/.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.base import check_db_connection, get_db
from app.core.config import Settings, get_settings
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Application Health Check",
    description=(
        "Returns the health status of the API and its database connection. "
        "Use this endpoint for load-balancer or monitoring probes."
    ),
    tags=["Health"],
)
def health_check(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> HealthResponse:
    """
    Verifies:
    - The API is running.
    - The database connection is reachable.
    """
    db_ok = check_db_connection()
    return HealthResponse(
        status="ok" if db_ok else "degraded",
        app_name=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        database="connected" if db_ok else "unreachable",
    )
