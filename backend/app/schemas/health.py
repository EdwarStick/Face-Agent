"""
FaceAttendance AI — Health Response Schema
==========================================
Pydantic schema for the /health endpoint response.
"""

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    environment: str
    database: str

    model_config = {"json_schema_extra": {
        "example": {
            "status": "ok",
            "app_name": "FaceAttendance AI",
            "version": "0.1.0",
            "environment": "development",
            "database": "connected",
        }
    }}
