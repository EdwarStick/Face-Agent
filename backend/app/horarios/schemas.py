"""
Pydantic schemas para el módulo de Horarios.

Jerarquía:
  HorarioCreate        → horario específico de un empleado
  HorarioGlobalCreate  → horario global de empresa (sin empleado_id)
  HorarioUpdate        → actualización parcial (PATCH-style)
  HorarioResponse      → respuesta completa de la BD
  HorarioEfectivoResponse → resultado de resolver_horario_efectivo()
"""

import uuid
from datetime import time
from typing import Optional, Literal

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict, field_validator, model_validator


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _parse_hora(value: str | time) -> time:
    """Convierte 'HH:MM' o 'HH:MM:SS' a datetime.time."""
    if isinstance(value, time):
        return value
    partes = value.split(":")
    return time(int(partes[0]), int(partes[1]))


def _formatear_hora_field(v) -> str:
    """Normaliza time → 'HH:MM:SS' para la serialización."""
    if isinstance(v, time):
        return v.strftime("%H:%M:%S")
    if isinstance(v, str):
        return v.split(".")[0] if "." in v else v
    return str(v)


# ─────────────────────────────────────────────────────────────────────────────
# Input schemas
# ─────────────────────────────────────────────────────────────────────────────

class HorarioCreate(BaseModel):
    """Crea un horario ESPECÍFICO para un empleado en un día de la semana."""
    empleado_id: uuid.UUID
    dia_semana: int                   # 0=Lunes … 6=Domingo
    hora_entrada: str                 # "HH:MM" o "HH:MM:SS"
    hora_salida: str
    tolerancia_minutos: int = 15      # Minutos de gracia antes de marcar tardanza

    @model_validator(mode="after")
    def validar_horas(self):
        h_in  = _parse_hora(self.hora_entrada)
        h_out = _parse_hora(self.hora_salida)
        if h_in >= h_out:
            raise ValueError(
                "hora_entrada debe ser estrictamente anterior a hora_salida. "
                f"Recibido: entrada={self.hora_entrada}, salida={self.hora_salida}"
            )
        return self


class HorarioGlobalCreate(BaseModel):
    """
    Crea o reemplaza el horario GLOBAL de empresa para un día de la semana.
    No requiere empleado_id — aplica a todos los empleados que no tienen
    un horario específico para ese día.
    """
    dia_semana: int                   # 0=Lunes … 6=Domingo
    hora_entrada: str
    hora_salida: str
    tolerancia_minutos: int = 15

    @model_validator(mode="after")
    def validar_horas(self):
        h_in  = _parse_hora(self.hora_entrada)
        h_out = _parse_hora(self.hora_salida)
        if h_in >= h_out:
            raise ValueError(
                "hora_entrada debe ser estrictamente anterior a hora_salida. "
                f"Recibido: entrada={self.hora_entrada}, salida={self.hora_salida}"
            )
        return self


class HorarioUpdate(BaseModel):
    """Actualización parcial de un horario existente (específico o global)."""
    dia_semana: Optional[int] = None
    hora_entrada: Optional[str] = None
    hora_salida: Optional[str] = None
    tolerancia_minutos: Optional[int] = None
    activo: Optional[bool] = None

    @model_validator(mode="after")
    def validar_horas_si_ambas(self):
        """Solo valida cruce de horas si se envían ambos campos."""
        if self.hora_entrada and self.hora_salida:
            h_in  = _parse_hora(self.hora_entrada)
            h_out = _parse_hora(self.hora_salida)
            if h_in >= h_out:
                raise ValueError("hora_entrada debe ser anterior a hora_salida")
        return self


# ─────────────────────────────────────────────────────────────────────────────
# Output schemas
# ─────────────────────────────────────────────────────────────────────────────

class HorarioResponse(BaseModel):
    """Respuesta completa de un registro de la tabla horarios."""
    id: uuid.UUID
    empleado_id: Optional[uuid.UUID]  # None si es_global=True
    dia_semana: int
    hora_entrada: time
    hora_salida: time
    tolerancia_minutos: int
    es_global: bool
    activo: bool

    model_config = ConfigDict(from_attributes=True)

    @field_validator("hora_entrada", "hora_salida", mode="before")
    @classmethod
    def formatear_hora(cls, v):
        return _formatear_hora_field(v)


class HorarioEfectivoResponse(BaseModel):
    """
    Resultado de resolver_horario_efectivo() para un empleado + día.
    Indica qué horario aplica realmente y de qué origen proviene.
    """
    empleado_id: uuid.UUID
    dia_semana: int
    # None solo cuando origen == "sin_horario"
    hora_entrada: Optional[time]
    hora_salida: Optional[time]
    tolerancia_minutos: int
    # "especifico" | "global" | "sin_horario"
    origen: Literal["especifico", "global", "sin_horario"]
    horario_id: Optional[uuid.UUID]   # ID del registro fuente en horarios

    model_config = ConfigDict(from_attributes=True)

    @field_validator("hora_entrada", "hora_salida", mode="before")
    @classmethod
    def formatear_hora(cls, v):
        if v is None:
            return v
        return _formatear_hora_field(v)