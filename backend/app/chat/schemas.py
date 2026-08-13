# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
from typing import Optional


class ChatRequest(BaseModel):
    pregunta: str = Field(
        ...,
        min_length=2,
        max_length=1000,
        description="Pregunta en lenguaje natural sobre asistencia o empleados.",
        examples=["¿Quién está en la oficina ahora?", "¿Cuántas horas trabajó Juan Pérez esta semana?"],
    )


class ToolCallInfo(BaseModel):
    """Metadatos de la herramienta que el LLM invocó (para auditoría/debug)."""
    nombre_funcion: str
    argumentos: dict


class ChatResponse(BaseModel):
    pregunta: str
    respuesta: str
    tool_utilizada: Optional[ToolCallInfo] = Field(
        default=None,
        description="Información de la herramienta de BD que se ejecutó, si aplica.",
    )
    fuente: str = Field(
        default="groq_function_calling",
        description="Indica si la respuesta usó datos reales de BD (function_calling) o fue conversacional.",
    )
