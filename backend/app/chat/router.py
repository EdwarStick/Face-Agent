# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.db.base import get_db
from app.chat.schemas import ChatRequest, ChatResponse
from app.services.groq_service import chat_con_contexto
from app.models.empleado import Empleado
from app.models.asistencia import Asistencia

router = APIRouter()


def construir_contexto(db: Session) -> str:
    """Construye un resumen de datos reales para enviar a Groq."""
    empleados = db.query(Empleado).filter(Empleado.activo == True).all()
    hoy = datetime.now(timezone.utc).date()

    asistencias_hoy = db.query(Asistencia).filter(
        Asistencia.hora_entrada >= datetime(hoy.year, hoy.month, hoy.day, tzinfo=timezone.utc)
    ).all()

    # Resumen de empleados
    lista_empleados = "\n".join([
        f"- {e.prim_nombre} {e.prim_apellido} | Cargo: {e.cargo} | Área: {e.area}"
        for e in empleados
    ])

    # Resumen de asistencias hoy
    ids_presentes = {str(a.empleado_id) for a in asistencias_hoy if a.hora_salida is None}
    ids_completados = {str(a.empleado_id) for a in asistencias_hoy if a.hora_salida is not None}

    presentes = [
        f"- {e.prim_nombre} {e.prim_apellido} (entrada: {next(a.hora_entrada for a in asistencias_hoy if str(a.empleado_id) == str(e.id))})"
        for e in empleados if str(e.id) in ids_presentes
    ]

    completados = [
        f"- {e.prim_nombre} {e.prim_apellido}"
        for e in empleados if str(e.id) in ids_completados
    ]

    contexto = f"""
FECHA HOY: {hoy}

EMPLEADOS ACTIVOS ({len(empleados)}):
{lista_empleados or 'Ninguno'}

PRESENTES HOY ({len(presentes)}):
{chr(10).join(presentes) or 'Ninguno'}

EMPLEADOS QUE YA SALIERON HOY ({len(completados)}):
{chr(10).join(completados) or 'Ninguno'}

TOTAL ASISTENCIAS HOY: {len(asistencias_hoy)}
"""
    return contexto


@router.post("/", response_model=ChatResponse)
def chat(data: ChatRequest, db: Session = Depends(get_db)):
    try:
        contexto = construir_contexto(db)
        respuesta = chat_con_contexto(data.pregunta, contexto)
        return ChatResponse(pregunta=data.pregunta, respuesta=respuesta)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
