"""
app/services/chat_tools.py
===========================
Herramientas (Tools) para el Agente de Consultas de Asistencia.

Este módulo expone dos cosas que el router del chat necesita:

  1. ATTENDANCE_TOOLS  — Lista de definiciones JSON Schema compatibles con la
                         API de Groq (y OpenAI). El LLM usa estas definiciones
                         para decidir cuándo y cómo llamar a cada función.

  2. execute_tool()    — Dispatcher que recibe el nombre de la función y sus
                         argumentos, inyecta la sesión de BD y retorna el
                         resultado como JSON string listo para el rol "tool".

Funciones registradas:
  - get_attendance_summary_today  → Resumen de asistencia del día actual.
  - get_employee_attendance        → Historial de un empleado en un rango de fechas.
  - get_employees_present_now      → Lista de empleados actualmente en la oficina.
  - get_attendance_stats           → Estadísticas globales (total, presentes, ausentes…).
  - search_employee_by_name        → Buscar empleado por nombre (parcial).
"""

from __future__ import annotations

import json
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

# pyrefly: ignore [missing-import]
from loguru import logger
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import func as sqlfunc

from app.models.asistencia import Asistencia
from app.models.empleado import Empleado


# ─────────────────────────────────────────────────────────────────────────────
# Helpers internos
# ─────────────────────────────────────────────────────────────────────────────

def _fmt_dt(dt: datetime | None) -> str | None:
    """Formatea un datetime UTC a string legible. Retorna None si es None."""
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def _nombre_completo(e: Empleado) -> str:
    partes = [e.prim_nombre, e.seg_nombres, e.prim_apellido, e.seg_apellido]
    return " ".join(p for p in partes if p).strip()


# ─────────────────────────────────────────────────────────────────────────────
# Funciones de servicio (cada una retorna JSON string)
# ─────────────────────────────────────────────────────────────────────────────

def get_attendance_summary_today(db: Session) -> str:
    """
    Devuelve un resumen completo de la asistencia del día actual:
    empleados presentes, con jornada completa y ausentes.
    """
    hoy = datetime.now(timezone.utc).date()
    inicio = datetime(hoy.year, hoy.month, hoy.day, tzinfo=timezone.utc)

    asistencias = db.query(Asistencia).filter(
        Asistencia.hora_entrada >= inicio
    ).all()

    empleados_activos = db.query(Empleado).filter(Empleado.activo == True).all()
    ids_con_entrada = {str(a.empleado_id) for a in asistencias}
    ids_presentes = {str(a.empleado_id) for a in asistencias if a.hora_salida is None}
    ids_completados = {str(a.empleado_id) for a in asistencias if a.hora_salida is not None}
    ids_ausentes = {str(e.id) for e in empleados_activos} - ids_con_entrada

    presentes = []
    for a in asistencias:
        if a.hora_salida is None:
            emp = next((e for e in empleados_activos if str(e.id) == str(a.empleado_id)), None)
            if emp:
                presentes.append({
                    "nombre": _nombre_completo(emp),
                    "cargo": emp.cargo,
                    "area": emp.area,
                    "hora_entrada": _fmt_dt(a.hora_entrada),
                })

    completados = []
    for a in asistencias:
        if a.hora_salida is not None:
            emp = next((e for e in empleados_activos if str(e.id) == str(a.empleado_id)), None)
            if emp:
                completados.append({
                    "nombre": _nombre_completo(emp),
                    "cargo": emp.cargo,
                    "hora_entrada": _fmt_dt(a.hora_entrada),
                    "hora_salida": _fmt_dt(a.hora_salida),
                    "horas_trabajadas": round(a.horas_trabajadas, 2) if a.horas_trabajadas else None,
                })

    ausentes = [
        {"nombre": _nombre_completo(e), "cargo": e.cargo, "area": e.area}
        for e in empleados_activos if str(e.id) in ids_ausentes
    ]

    resultado = {
        "fecha": str(hoy),
        "total_empleados_activos": len(empleados_activos),
        "presentes_ahora": len(presentes),
        "jornada_completada": len(completados),
        "ausentes": len(ausentes),
        "detalle_presentes": presentes,
        "detalle_completados": completados,
        "detalle_ausentes": ausentes,
    }
    logger.info(f"[tool] get_attendance_summary_today → {len(asistencias)} registros")
    return json.dumps(resultado, ensure_ascii=False, default=str)


def get_employee_attendance(
    db: Session,
    empleado_id: str | None = None,
    nombre_empleado: str | None = None,
    fecha_inicio: str | None = None,
    fecha_fin: str | None = None,
) -> str:
    """
    Devuelve el historial de asistencia de un empleado en un rango de fechas.
    Acepta búsqueda por ID o por nombre parcial.
    """
    # Resolver empleado
    empleado: Empleado | None = None
    if empleado_id:
        try:
            uid = uuid.UUID(empleado_id)
            empleado = db.query(Empleado).filter(Empleado.id == uid).first()
        except ValueError:
            return json.dumps({"error": f"ID de empleado inválido: {empleado_id}"})
    elif nombre_empleado:
        pattern = f"%{nombre_empleado.strip()}%"
        empleado = (
            db.query(Empleado)
            .filter(
                (Empleado.prim_nombre.ilike(pattern))
                | (Empleado.prim_apellido.ilike(pattern))
                | (Empleado.seg_nombres.ilike(pattern))
                | (Empleado.seg_apellido.ilike(pattern))
            )
            .first()
        )

    if not empleado:
        return json.dumps({"error": "Empleado no encontrado. Verifica el nombre o ID proporcionado."})

    # Rango de fechas (default: últimos 7 días)
    hoy = datetime.now(timezone.utc).date()
    try:
        fi = datetime.fromisoformat(fecha_inicio).date() if fecha_inicio else hoy - timedelta(days=7)
        ff = datetime.fromisoformat(fecha_fin).date() if fecha_fin else hoy
    except ValueError:
        return json.dumps({"error": "Formato de fecha inválido. Usa ISO 8601: YYYY-MM-DD."})

    inicio_dt = datetime(fi.year, fi.month, fi.day, tzinfo=timezone.utc)
    fin_dt = datetime(ff.year, ff.month, ff.day, 23, 59, 59, tzinfo=timezone.utc)

    asistencias = (
        db.query(Asistencia)
        .filter(
            Asistencia.empleado_id == empleado.id,
            Asistencia.hora_entrada >= inicio_dt,
            Asistencia.hora_entrada <= fin_dt,
        )
        .order_by(Asistencia.hora_entrada.desc())
        .all()
    )

    registros = [
        {
            "fecha": a.hora_entrada.date().isoformat() if a.hora_entrada else None,
            "hora_entrada": _fmt_dt(a.hora_entrada),
            "hora_salida": _fmt_dt(a.hora_salida),
            "horas_trabajadas": round(a.horas_trabajadas, 2) if a.horas_trabajadas else None,
            "estado": a.estado,
            "confianza_pct": a.porcentaje_confianza,
        }
        for a in asistencias
    ]

    total_horas = sum(
        a.horas_trabajadas for a in asistencias if a.horas_trabajadas is not None
    )

    resultado = {
        "empleado": {
            "id": str(empleado.id),
            "nombre": _nombre_completo(empleado),
            "cargo": empleado.cargo,
            "area": empleado.area,
            "codigo": empleado.codigo_empleado,
        },
        "periodo": {"desde": str(fi), "hasta": str(ff)},
        "total_dias_asistidos": len(asistencias),
        "total_horas_trabajadas": round(total_horas, 2),
        "registros": registros,
    }
    logger.info(
        f"[tool] get_employee_attendance → empleado={_nombre_completo(empleado)} | "
        f"periodo={fi}–{ff} | registros={len(asistencias)}"
    )
    return json.dumps(resultado, ensure_ascii=False, default=str)


def get_employees_present_now(db: Session) -> str:
    """
    Lista los empleados que están actualmente en la oficina
    (tienen entrada hoy pero aún no han registrado salida).
    """
    hoy = datetime.now(timezone.utc).date()
    inicio = datetime(hoy.year, hoy.month, hoy.day, tzinfo=timezone.utc)

    asistencias_abiertas = (
        db.query(Asistencia)
        .join(Empleado)
        .filter(
            Asistencia.hora_entrada >= inicio,
            Asistencia.hora_salida == None,  # noqa: E711
            Empleado.activo == True,
        )
        .all()
    )

    detalle = []
    for a in asistencias_abiertas:
        emp = a.empleado
        ahora = datetime.now(timezone.utc)
        entrada = a.hora_entrada.replace(tzinfo=timezone.utc) if a.hora_entrada.tzinfo is None else a.hora_entrada
        horas_en_oficina = round((ahora - entrada).total_seconds() / 3600, 2)
        detalle.append({
            "nombre": _nombre_completo(emp),
            "cargo": emp.cargo,
            "area": emp.area,
            "hora_entrada": _fmt_dt(a.hora_entrada),
            "horas_en_oficina": horas_en_oficina,
        })

    resultado = {
        "timestamp_consulta": _fmt_dt(datetime.now(timezone.utc)),
        "total_presentes": len(detalle),
        "empleados": detalle,
    }
    logger.info(f"[tool] get_employees_present_now → {len(detalle)} presentes")
    return json.dumps(resultado, ensure_ascii=False, default=str)


def get_attendance_stats(db: Session, fecha: str | None = None) -> str:
    """
    Retorna estadísticas globales de asistencia para una fecha dada
    (por defecto: hoy). Incluye totales, presentes, ausentes y promedio de horas.
    """
    try:
        dia = date.fromisoformat(fecha) if fecha else datetime.now(timezone.utc).date()
    except ValueError:
        return json.dumps({"error": "Formato de fecha inválido. Usa YYYY-MM-DD."})

    inicio = datetime(dia.year, dia.month, dia.day, tzinfo=timezone.utc)
    fin = datetime(dia.year, dia.month, dia.day, 23, 59, 59, tzinfo=timezone.utc)

    total_activos = db.query(sqlfunc.count(Empleado.id)).filter(Empleado.activo == True).scalar() or 0
    total_asistencias = (
        db.query(sqlfunc.count(Asistencia.id))
        .filter(Asistencia.hora_entrada >= inicio, Asistencia.hora_entrada <= fin)
        .scalar() or 0
    )
    presentes = (
        db.query(sqlfunc.count(Asistencia.id))
        .filter(
            Asistencia.hora_entrada >= inicio,
            Asistencia.hora_entrada <= fin,
            Asistencia.hora_salida == None,  # noqa: E711
        )
        .scalar() or 0
    )
    completados = (
        db.query(sqlfunc.count(Asistencia.id))
        .filter(
            Asistencia.hora_entrada >= inicio,
            Asistencia.hora_entrada <= fin,
            Asistencia.hora_salida != None,  # noqa: E711
        )
        .scalar() or 0
    )
    promedio_horas = (
        db.query(sqlfunc.avg(Asistencia.horas_trabajadas))
        .filter(
            Asistencia.hora_entrada >= inicio,
            Asistencia.hora_entrada <= fin,
            Asistencia.horas_trabajadas != None,  # noqa: E711
        )
        .scalar()
    )

    resultado = {
        "fecha": str(dia),
        "total_empleados_activos": total_activos,
        "total_marcaciones": total_asistencias,
        "presentes_actualmente": presentes,
        "jornada_completada": completados,
        "ausentes": total_activos - total_asistencias,
        "tasa_asistencia_pct": round((total_asistencias / total_activos * 100), 1) if total_activos else 0,
        "promedio_horas_trabajadas": round(float(promedio_horas), 2) if promedio_horas else None,
    }
    logger.info(f"[tool] get_attendance_stats → fecha={dia}")
    return json.dumps(resultado, ensure_ascii=False, default=str)


def search_employee_by_name(db: Session, nombre: str) -> str:
    """
    Busca empleados activos cuyo nombre o apellido contenga el término dado.
    Útil para resolver nombres parciales o ambiguos antes de otras consultas.
    """
    pattern = f"%{nombre.strip()}%"
    empleados = (
        db.query(Empleado)
        .filter(
            Empleado.activo == True,
            (
                Empleado.prim_nombre.ilike(pattern)
                | Empleado.prim_apellido.ilike(pattern)
                | Empleado.seg_nombres.ilike(pattern)
                | Empleado.seg_apellido.ilike(pattern)
            ),
        )
        .limit(10)
        .all()
    )

    resultado = {
        "total_encontrados": len(empleados),
        "empleados": [
            {
                "id": str(e.id),
                "nombre": _nombre_completo(e),
                "cargo": e.cargo,
                "area": e.area,
                "codigo": e.codigo_empleado,
                "correo": e.correo,
            }
            for e in empleados
        ],
    }
    logger.info(f"[tool] search_employee_by_name → query='{nombre}' | {len(empleados)} resultados")
    return json.dumps(resultado, ensure_ascii=False, default=str)


# ─────────────────────────────────────────────────────────────────────────────
# JSON Schema definitions (formato Groq / OpenAI Function Calling)
# ─────────────────────────────────────────────────────────────────────────────

ATTENDANCE_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_attendance_summary_today",
            "description": (
                "Obtiene un resumen completo de la asistencia del día de hoy: "
                "quiénes están presentes, quiénes completaron su jornada y quiénes están ausentes. "
                "Úsala cuando el usuario pregunte por el estado general de asistencia hoy."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_employee_attendance",
            "description": (
                "Consulta el historial de asistencia de un empleado específico en un rango de fechas. "
                "Úsala cuando el usuario pregunte por las asistencias, horas trabajadas o puntualidad "
                "de un empleado concreto. Si tienes el nombre del empleado pero no su ID, proporciona "
                "el nombre y el sistema lo resolverá automáticamente."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "empleado_id": {
                        "type": "string",
                        "description": "UUID del empleado (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx). Opcional si se proporciona nombre_empleado.",
                    },
                    "nombre_empleado": {
                        "type": "string",
                        "description": "Nombre parcial o completo del empleado para búsqueda. Opcional si se proporciona empleado_id.",
                    },
                    "fecha_inicio": {
                        "type": "string",
                        "description": "Fecha de inicio del período en formato ISO 8601 (YYYY-MM-DD). Por defecto: hace 7 días.",
                    },
                    "fecha_fin": {
                        "type": "string",
                        "description": "Fecha de fin del período en formato ISO 8601 (YYYY-MM-DD). Por defecto: hoy.",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_employees_present_now",
            "description": (
                "Lista en tiempo real los empleados que están actualmente en la oficina "
                "(registraron entrada hoy y aún no han marcado salida). "
                "Úsala para preguntas como '¿quién está en la oficina ahora?' o '¿cuántas personas hay?'."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_attendance_stats",
            "description": (
                "Proporciona estadísticas globales de asistencia (totales, tasa de asistencia, "
                "promedio de horas trabajadas) para una fecha específica. "
                "Úsala para preguntas sobre métricas o KPIs de asistencia."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "fecha": {
                        "type": "string",
                        "description": "Fecha para las estadísticas en formato YYYY-MM-DD. Por defecto: hoy.",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_employee_by_name",
            "description": (
                "Busca empleados activos por nombre o apellido (búsqueda parcial). "
                "Úsala para resolver nombres ambiguos o para encontrar el ID de un empleado "
                "antes de hacer consultas más específicas."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "nombre": {
                        "type": "string",
                        "description": "Nombre o apellido (parcial o completo) del empleado a buscar.",
                    },
                },
                "required": ["nombre"],
            },
        },
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# Dispatcher: ejecuta la función indicada por el LLM
# ─────────────────────────────────────────────────────────────────────────────

# Mapa nombre → función Python (sin la sesión de BD)
_TOOL_REGISTRY: dict[str, Any] = {
    "get_attendance_summary_today": get_attendance_summary_today,
    "get_employee_attendance": get_employee_attendance,
    "get_employees_present_now": get_employees_present_now,
    "get_attendance_stats": get_attendance_stats,
    "search_employee_by_name": search_employee_by_name,
}


def execute_tool(tool_name: str, tool_args: dict[str, Any], db: Session) -> str:
    """
    Dispatcher central: recibe el nombre de la herramienta y sus argumentos
    tal como los genera el LLM, inyecta la sesión de BD y retorna el
    resultado como JSON string listo para el mensaje de rol "tool".

    Args:
        tool_name : Nombre de la función, debe estar en ATTENDANCE_TOOLS.
        tool_args : Diccionario de argumentos generado por el LLM.
        db        : Sesión SQLAlchemy activa inyectada por FastAPI.

    Returns:
        JSON string con el resultado de la consulta.

    Raises:
        ValueError: Si tool_name no corresponde a ninguna herramienta registrada.
    """
    fn = _TOOL_REGISTRY.get(tool_name)
    if fn is None:
        logger.warning(f"[tool] Herramienta desconocida solicitada por el LLM: '{tool_name}'")
        return json.dumps({
            "error": f"La herramienta '{tool_name}' no existe en este sistema.",
            "herramientas_disponibles": list(_TOOL_REGISTRY.keys()),
        })

    try:
        logger.info(f"[tool] Ejecutando '{tool_name}' con args={tool_args}")
        return fn(db=db, **tool_args)
    except TypeError as te:
        # El LLM envió parámetros inválidos (alucinación de argumentos)
        logger.warning(f"[tool] Parámetros inválidos para '{tool_name}': {te}")
        return json.dumps({
            "error": f"Parámetros inválidos para la función '{tool_name}': {str(te)}",
        })
    except Exception as exc:
        # Error inesperado en la consulta (problema de BD, etc.)
        logger.error(f"[tool] Error ejecutando '{tool_name}': {exc}")
        return json.dumps({
            "error": f"Error al consultar los datos: {str(exc)}",
        })
