import uuid
from datetime import time
from typing import Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel , ConfigDict , field_validator


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
    hora_entrada: time
    hora_salida: time
    activo: bool

    model_config = ConfigDict(from_attributes=True)

    @field_validator('hora_entrada', 'hora_salida', mode='before')
    @classmethod
    def formatear_hora(cls, v):
        # Si la base de datos devuelve un objeto datetime.time, lo pasamos a str limpio
        if isinstance(v, time):
            return v.strftime("%H:%M:%S")
        
        # Si ya es un string (del cliente o de la BD), nos aseguramos de que no tenga microsegundos
        if isinstance(v, str):
            # Por si acaso viene algo como "08:00:00.000000", lo recortamos a HH:MM:SS
            if "." in v:
                return v.split(".")[0]
            return v
            
        return str(v)