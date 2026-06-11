import uuid
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Query
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.asistencias import service
from app.asistencias.schemas import (
    RegistrarEntradaRequest,
    RegistrarSalidaRequest,
    AsistenciaResponse,
    AsistenciaListResponse,
    AsistenciaStats,
)

router = APIRouter()


@router.post("/entrada", response_model=AsistenciaResponse)
def registrar_entrada(data: RegistrarEntradaRequest, db: Session = Depends(get_db)):
    return service.registrar_entrada(db, data)


@router.post("/salida", response_model=AsistenciaResponse)
def registrar_salida(data: RegistrarSalidaRequest, db: Session = Depends(get_db)):
    asistencia = service.registrar_salida(db, data)
    if not asistencia:
        raise HTTPException(status_code=404, detail="No hay entrada activa para este empleado")
    return asistencia


@router.get("/hoy", response_model=list[AsistenciaResponse])
def asistencias_hoy(db: Session = Depends(get_db)):
    return service.listar_asistencias_hoy(db)


@router.get("/empleado/{empleado_id}", response_model=list[AsistenciaResponse])
def asistencias_empleado(empleado_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.listar_asistencias_empleado(db, empleado_id)


@router.get("/stats", response_model=AsistenciaStats)
def obtener_stats(db: Session = Depends(get_db)):
    return service.obtener_stats(db)


@router.get("/", response_model=list[AsistenciaListResponse])
def listar_ultimas(
    limite: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return service.listar_ultimas(db, limite)
