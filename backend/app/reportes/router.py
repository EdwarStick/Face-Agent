# pyrefly: ignore [missing-import]
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.reportes import service
from app.reportes.schemas import (
    ResumenDiarioResponse,
    ReporteAsistenciasHoyResponse,
    EstadisticasEmpleadoResponse
)

router = APIRouter()


@router.get("/resumen-diario", response_model=ResumenDiarioResponse)
def resumen_diario(db: Session = Depends(get_db)):
    return service.resumen_diario(db)


@router.get("/asistencias-hoy", response_model=ReporteAsistenciasHoyResponse)
def asistencias_hoy(db: Session = Depends(get_db)):
    return service.reporte_asistencias_hoy(db)


@router.get("/empleado/{empleado_id}", response_model=EstadisticasEmpleadoResponse)
def estadisticas_empleado(empleado_id: uuid.UUID, db: Session = Depends(get_db)):
    resultado = service.estadisticas_empleado(db, empleado_id)
    if not resultado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return resultado
