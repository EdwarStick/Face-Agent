import uuid
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class RegistrarEntradaRequest(BaseModel):
    empleado_id: uuid.UUID
    porcentaje_confianza: Optional[float] = None


class RegistrarSalidaRequest(BaseModel):
    empleado_id: uuid.UUID


class AsistenciaResponse(BaseModel):
    id: uuid.UUID
    empleado_id: uuid.UUID
    hora_entrada: Optional[datetime]
    hora_salida: Optional[datetime]
    horas_trabajadas: Optional[float]
    estado: Optional[str]
    porcentaje_confianza: Optional[float]
    fecha_registro: datetime

    model_config = {"from_attributes": True}


class AsistenciaListResponse(BaseModel):
    id: uuid.UUID
    empleado_id: uuid.UUID
    empleado_nombre: Optional[str] = None
    cargo: Optional[str] = None
    fecha_marcacion: datetime
    tipo: str


class AsistenciaStats(BaseModel):
    total: int
    hoy: int
