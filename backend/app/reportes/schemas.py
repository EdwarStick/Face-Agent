# pyrefly: ignore [missing-import]
import uuid
from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional


class ResumenDiarioResponse(BaseModel):
    fecha: date
    total_empleados: int
    presentes: int
    ausentes: int
    ya_salieron: int
    porcentaje_asistencia: float


class DetalleEmpleadoAsistencia(BaseModel):
    empleado_id: uuid.UUID
    nombre_completo: str
    cargo: Optional[str]
    area: Optional[str]
    hora_entrada: Optional[datetime]
    hora_salida: Optional[datetime]
    horas_trabajadas: Optional[float]
    estado: Optional[str]
    porcentaje_confianza: Optional[float]


class ReporteAsistenciasHoyResponse(BaseModel):
    fecha: date
    asistencias: list[DetalleEmpleadoAsistencia]


class EstadisticasEmpleadoResponse(BaseModel):
    empleado_id: uuid.UUID
    nombre_completo: str
    cargo: Optional[str]
    area: Optional[str]
    total_dias: int
    promedio_horas: Optional[float]
    ultima_asistencia: Optional[datetime]
