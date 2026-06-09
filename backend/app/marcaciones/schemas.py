import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class MarcacionCreate(BaseModel):
    empleado_id: uuid.UUID
    tipo: str


class MarcacionResponse(BaseModel):
    id: uuid.UUID
    empleado_id: uuid.UUID
    empleado_nombre: Optional[str] = None
    cargo: Optional[str] = None
    fecha_marcacion: datetime
    tipo: str

    model_config = {"from_attributes": True}


class MarcacionStats(BaseModel):
    total: int
    hoy: int
