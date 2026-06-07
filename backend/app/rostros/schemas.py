import uuid
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class RegistroRostroRequest(BaseModel):
    empleado_id: uuid.UUID
    imagen_base64: str  # imagen desde el frontend (webcam)


class RostroResponse(BaseModel):
    id: int
    empleado_id: uuid.UUID
    ruta_imagen: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
