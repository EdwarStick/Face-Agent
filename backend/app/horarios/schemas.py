import uuid
from datetime import time
from typing import Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel


class HorarioCreate(BaseModel):
    empleado_id: uuid.UUID
    dia_semana: int
    hora_entrada: str
    hora_salida: str


class HorarioUpdate(BaseModel):
    dia_semana: Optional[int] = None
    hora_entrada: Optional[str] = None
    hora_salida: Optional[str] = None
    activo: Optional[bool] = None


class HorarioResponse(BaseModel):
    id: uuid.UUID
    empleado_id: uuid.UUID
    dia_semana: int
    hora_entrada: str
    hora_salida: str
    activo: bool

    model_config = {"from_attributes": True}
