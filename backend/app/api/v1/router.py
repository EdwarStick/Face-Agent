"""
FaceAttendance AI — API v1 Router
===================================
Central router that aggregates all v1 endpoint sub-routers.
Add new endpoint routers here as each feature branch is merged.
"""

# pyrefly: ignore [missing-import]
from fastapi import APIRouter  

# pyrefly: ignore [missing-import]
from app.api.v1.endpoints import health
from app.empleados.router import router as empleados_router

api_router = APIRouter()

# ── Registered Routers ────────────────────────────────────────────────────────
api_router.include_router(health.router)
api_router.include_router(
    empleados_router,
    prefix="/empleados",
    tags=["Empleados"]
)

# Future feature routers — uncomment as features are implemented:
# from app.api.v1.endpoints import attendance
# from app.api.v1.endpoints import face_recognition
# from app.api.v1.endpoints import reports

# api_router.include_router(attendance.router,       prefix="/attendance",      tags=["Attendance"])
# api_router.include_router(face_recognition.router, prefix="/face",            tags=["Face Recognition"])
# api_router.include_router(reports.router,          prefix="/reports",         tags=["Reports"])

