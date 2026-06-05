"""
FaceAttendance AI — API v1 Router
===================================
Central router that aggregates all v1 endpoint sub-routers.
Add new endpoint routers here as each feature branch is merged.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import health

api_router = APIRouter()

# ── Registered Routers ────────────────────────────────────────────────────────
api_router.include_router(health.router)

# Future feature routers — uncomment as features are implemented:
# from app.api.v1.endpoints import employees
# from app.api.v1.endpoints import attendance
# from app.api.v1.endpoints import face_recognition
# from app.api.v1.endpoints import reports

# api_router.include_router(employees.router,        prefix="/employees",       tags=["Employees"])
# api_router.include_router(attendance.router,       prefix="/attendance",      tags=["Attendance"])
# api_router.include_router(face_recognition.router, prefix="/face",            tags=["Face Recognition"])
# api_router.include_router(reports.router,          prefix="/reports",         tags=["Reports"])
