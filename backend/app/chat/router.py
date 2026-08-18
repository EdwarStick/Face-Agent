"""
app/chat/router.py
==================
Agente de Consultas de Asistencia con Groq Function Calling.

Flujo de una petición (arquitectura ReAct simplificada):

  Usuario ──► POST /chat/
              │
              ▼
        [1] Primera llamada a Groq
            Envía: system prompt + pregunta del usuario + ATTENDANCE_TOOLS
            Recibe: mensaje con tool_calls[] o respuesta directa
              │
              ├── Sin tool_calls → Respuesta conversacional directa
              │
              └── Con tool_calls
                    │
                    ▼
              [2] execute_tool(name, args, db)
                  Ejecuta la función Python con SQLAlchemy
                  Retorna: JSON string con datos reales de la BD
                    │
                    ▼
              [3] Segunda llamada a Groq
                  Envía: historial completo + mensaje rol "tool" con resultado
                  Recibe: respuesta en lenguaje natural basada en datos reales
                    │
                    ▼
              ChatResponse(pregunta, respuesta, tool_utilizada, fuente)
"""

import json
from typing import Any

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from groq import Groq, APIConnectionError, APIStatusError, RateLimitError
# pyrefly: ignore [missing-import]
from loguru import logger
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import get_db
from app.chat.schemas import ChatRequest, ChatResponse, ToolCallInfo
from app.services.chat_tools import ATTENDANCE_TOOLS, execute_tool

router = APIRouter()

# ── Cliente Groq (singleton a nivel de módulo) ────────────────────────────────
_groq_client = Groq(api_key=settings.groq_api_key)

# ── System prompt del agente ─────────────────────────────────────────────────
def _safe_parse_args(raw: str | None) -> dict[str, Any]:
    """
    Parsea los argumentos JSON enviados por Groq de forma segura.
    Groq a veces devuelve arguments=None o una cadena vacía — ambos
    casos se normalizan a un diccionario vacío.
    """
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        logger.warning(f"[chat] JSON de argumentos inválido de Groq: {raw!r}")
        return {}


def _get_system_prompt() -> str:
    from datetime import datetime
    ahora_local = datetime.now()
    dias_es = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    meses_es = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

    dia_nombre = dias_es[ahora_local.weekday()]
    mes_nombre = meses_es[ahora_local.month - 1]
    fecha_formateada = f"{dia_nombre} {ahora_local.day} de {mes_nombre} de {ahora_local.year}, {ahora_local.strftime('%H:%M')} (hora local)"

    return (
        "Eres ARIA (HR-Agent), la asistente virtual inteligente de control de asistencia de FaceAttendance AI.\n"
        f"CONTEXTO TEMPORAL ACTUAL: Hoy es {fecha_formateada}.\n"
        "Tu objetivo es ayudar a gerentes y empleados a consultar asistencias, ausencias, tardanzas y estadísticas.\n\n"
        "REGLAS DE INTERPRETACIÓN Y FORMATO:\n"
        "1. Tienes total conciencia de la fecha y hora actual especificada arriba. Al presentar resúmenes, menciona explícitamente el día de la semana y la fecha de hoy.\n"
        "2. Si el usuario saluda o pregunta qué haces (ej. 'hola', 'buenos días', 'quién eres'), responde de forma amable y breve en español explicando cómo puedes ayudar, SIN usar herramientas.\n"
        "3. Para preguntas informales o sugeridas como '¿Quién faltó hoy?', 'quien falto', 'Resumen del día', 'ausentes', usa INMEDIATAMENTE la herramienta `get_attendance_summary_today`.\n"
        "4. Para preguntas como '¿Quién está presente?', 'quien vino', 'quienes estan en la oficina', usa `get_employees_present_now` o `get_attendance_summary_today`.\n"
        "5. Para preguntas como '¿Cuántos empleados hay?', 'total empleados', usa `get_attendance_stats` o `get_attendance_summary_today`.\n"
        "6. Si preguntan por un empleado en específico (ej. 'asistencia de Juan', 'horas de Maria'), usa `get_employee_attendance` pasando el nombre.\n"
        "7. Expresa las horas de entrada/salida siempre en formato de hora local limpia (ej. '16:57 hs' o '04:57 PM'). NUNCA muestres ni escribas la palabra 'UTC'.\n"
        "8. NUNCA inventes información. Toda respuesta sobre datos de personas debe basarse en los resultados devueltos por tus herramientas.\n"
        "9. Responde siempre de forma clara, concisa, profesional y en español."
    )


@router.post("", response_model=ChatResponse)
@router.post("/", response_model=ChatResponse)
def chat(data: ChatRequest, db: Session = Depends(get_db)):
    """
    Endpoint principal del agente NL2SQL.

    Implementa el flujo completo de Groq Function Calling:
      1ª llamada → detectar intención y seleccionar herramienta.
      Ejecución  → consultar la BD con SQLAlchemy.
      2ª llamada → sintetizar respuesta en lenguaje natural.

    Retorna HTTP 400 para preguntas inválidas, HTTP 503 para fallos de Groq.
    """
    logger.info(f"[chat] Pregunta recibida: '{data.pregunta[:80]}...' " if len(data.pregunta) > 80 else f"[chat] Pregunta: '{data.pregunta}'")

    system_prompt = _get_system_prompt()

    # ── Historial de mensajes — se construye progresivamente ─────────────────
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": data.pregunta},
    ]

    tool_call_info: ToolCallInfo | None = None
    fuente = "conversacional"

    try:
        # ── [1] Primera llamada a Groq ────────────────────────────────────────
        logger.debug("[chat] Enviando primera petición a Groq con tools disponibles")
        primera_respuesta = _groq_client.chat.completions.create(
            model=settings.groq_chat_model,
            messages=messages,
            tools=ATTENDANCE_TOOLS,
            tool_choice="auto",      # Groq decide si usar herramienta o no
            temperature=0.2,         # Temperatura baja → respuestas más deterministas
            max_tokens=1024,
        )

        primer_mensaje = primera_respuesta.choices[0].message

        # ── [2] Verificar si el LLM quiere usar una herramienta ───────────────
        if not primer_mensaje.tool_calls:
            # El agente respondió directamente sin necesitar datos de BD
            logger.info("[chat] Groq respondió sin usar herramienta (respuesta conversacional)")
            return ChatResponse(
                pregunta=data.pregunta,
                respuesta=primer_mensaje.content or "No tengo una respuesta para esa consulta.",
                fuente="conversacional",
            )

        # ── [3] Ejecutar las herramientas solicitadas por el LLM ─────────────
        # Añadir el mensaje del asistente con tool_calls al historial
        messages.append(primer_mensaje)

        # Iterar sobre cada tool_call (el LLM puede solicitar múltiples en paralelo)
        for tc in primer_mensaje.tool_calls:
            nombre_fn = tc.function.name
            args_raw = tc.function.arguments

            # Parsear argumentos JSON — _safe_parse_args maneja None, vacío y JSON malformado
            args_dict = _safe_parse_args(args_raw)

            # Guardar info de auditoría — garantizamos que argumentos es siempre dict
            tool_call_info = ToolCallInfo(nombre_funcion=nombre_fn, argumentos=args_dict or {})

            # Ejecutar la función Python con la sesión de BD
            resultado_json = execute_tool(
                tool_name=nombre_fn,
                tool_args=args_dict,
                db=db,
            )

            logger.info(f"[chat] Herramienta '{nombre_fn}' ejecutada | resultado_len={len(resultado_json)}")

            # Añadir resultado como mensaje de rol "tool" al historial
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": resultado_json,
            })

        # ── [4] Segunda llamada a Groq: sintetizar respuesta en lenguaje natural
        logger.debug("[chat] Enviando segunda petición a Groq con resultados de herramientas")
        segunda_respuesta = _groq_client.chat.completions.create(
            model=settings.groq_chat_model,
            messages=messages,
            temperature=0.3,
            max_tokens=1024,
        )

        respuesta_final = segunda_respuesta.choices[0].message.content or (
            "Obtuve los datos pero no pude generar una respuesta. Por favor, intenta de nuevo."
        )
        fuente = "groq_function_calling"
        logger.info(f"[chat] Respuesta final generada | chars={len(respuesta_final)}")

        return ChatResponse(
            pregunta=data.pregunta,
            respuesta=respuesta_final,
            tool_utilizada=tool_call_info,
            fuente=fuente,
        )

    # ── Manejo de errores específicos de la API de Groq ───────────────────────
    except RateLimitError:
        logger.warning("[chat] Rate limit alcanzado en la API de Groq")
        raise HTTPException(
            status_code=503,
            detail={
                "error_code": "GROQ_RATE_LIMIT",
                "message": "El servicio de IA está temporalmente sobrecargado. Por favor, espera unos segundos e intenta de nuevo.",
            },
        )

    except APIConnectionError as ce:
        logger.error(f"[chat] Error de conexión con Groq: {ce}")
        raise HTTPException(
            status_code=503,
            detail={
                "error_code": "GROQ_CONNECTION_ERROR",
                "message": "No se pudo conectar al servicio de IA. Verifica la conectividad de red.",
            },
        )

    except APIStatusError as se:
        if se.status_code == 400:
            logger.warning(f"[chat] Groq tool_use_failed fallback activado para: '{data.pregunta}'")
            try:
                resumen_json = execute_tool("get_attendance_summary_today", {}, db)
                fallback_resp = _groq_client.chat.completions.create(
                    model=settings.groq_chat_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": data.pregunta},
                        {"role": "system", "content": f"Datos de asistencia de la base de datos: {resumen_json}"}
                    ],
                    temperature=0.3,
                    max_tokens=1024,
                )
                txt = fallback_resp.choices[0].message.content or "Aquí está el resumen de asistencia del día de hoy."
                return ChatResponse(
                    pregunta=data.pregunta,
                    respuesta=txt,
                    fuente="fallback_summary"
                )
            except Exception as fe:
                logger.error(f"[chat] Fallback error: {fe}")
        logger.error(f"[chat] Error de estado HTTP de Groq: {se.status_code} – {se.message}")
        raise HTTPException(
            status_code=502,
            detail={
                "error_code": "GROQ_API_ERROR",
                "message": f"Error en el servicio de IA (código {se.status_code}). Intenta nuevamente.",
            },
        )

    except HTTPException:
        raise  # Re-lanzar HTTPException sin envolver

    except Exception as exc:
        logger.error(f"[chat] Error inesperado en el pipeline del agente: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error_code": "AGENT_ERROR",
                "message": "Ocurrió un error interno al procesar tu consulta. El equipo técnico ha sido notificado.",
            },
        )
