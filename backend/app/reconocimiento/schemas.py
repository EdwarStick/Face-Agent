from datetime import datetime
import uuid
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import Optional


class ReconocimientoRequest(BaseModel):
    imagen_base64: str


class ReconocimientoResponse(BaseModel):
    reconocido: bool
    empleado_id: Optional[uuid.UUID] = None
    nombre_completo: Optional[str] = None
    cargo: Optional[str] = None
    area: Optional[str] = None
    confianza: Optional[float] = None
    mensaje: str


class ReconocimientoAsistenciaResponse(BaseModel):
    reconocido: bool
    empleado_id: Optional[uuid.UUID] = None
    nombre_completo: Optional[str] = None
    cargo: Optional[str] = None
    area: Optional[str] = None
    confianza: Optional[float] = None
    tipo_marcacion: Optional[str] = None
    fecha_hora: Optional[datetime] = None
    mensaje: str
