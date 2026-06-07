import uuid
from datetime import datetime
from typing import Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict, EmailStr


class EmpleadoCreate(BaseModel):
    codigo_empleado: str
    prim_nombre: str
    seg_nombres: Optional[str] = ""
    prim_apellido: str
    seg_apellido: Optional[str] = ""
    correo: Optional[EmailStr] = None
    telefono: Optional[str] = None
    cargo: Optional[str] = None
    area: Optional[str] = None


class EmpleadoUpdate(BaseModel):
    codigo_empleado: Optional[str] = None
    prim_nombre: Optional[str] = None
    seg_nombres: Optional[str] = None
    prim_apellido: Optional[str] = None
    seg_apellido: Optional[str] = None
    correo: Optional[EmailStr] = None
    telefono: Optional[str] = None
    cargo: Optional[str] = None
    area: Optional[str] = None
    activo: Optional[bool] = None


class EmpleadoResponse(BaseModel):
    id: uuid.UUID
    codigo_empleado: str
    prim_nombre: str
    seg_nombres: str
    prim_apellido: str
    seg_apellido: str
    correo: Optional[str] = None
    telefono: Optional[str] = None
    cargo: Optional[str] = None
    area: Optional[str] = None
    activo: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
