# pyrefly: ignore [missing-import]
from fastapi import APIRouter
# pyrefly: ignore [missing-import]
from app.api.v1.endpoints import health
# pyrefly: ignore [missing-import]
from app.empleados.router import router as empleados_router  # ← AGREGA

api_router = APIRouter()    

api_router.include_router(health.router)
api_router.include_router(
    empleados_router,
    prefix="/empleados",
    tags=["Empleados"]
)
