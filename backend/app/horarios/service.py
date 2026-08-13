"""
app/horarios/service.py — Business Logic Layer para Horarios.

Funciones principales:
  crear_horario()             → horario específico de empleado
  crear_horario_global()      → horario global de empresa (upsert)
  resolver_horario_efectivo() → resuelve herencia: específico > global > None
  calcular_estado_marcacion() → clasifica entrada/salida vs horario efectivo
  listar_horarios()           → lista con filtros opcionales
  obtener_horario()           → por ID
  actualizar_horario()        → actualización parcial
  eliminar_horario()          → soft-delete (activo=False)
"""

import uuid
from datetime import time, datetime, date

# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from loguru import logger

from app.models.horario import Horario
from app.models.empleado import Empleado
from app.horarios.schemas import HorarioCreate, HorarioGlobalCreate, HorarioUpdate


# ─────────────────────────────────────────────────────────────────────────────
# Constantes
# ─────────────────────────────────────────────────────────────────────────────

DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]


# ─────────────────────────────────────────────────────────────────────────────
# Helpers internos
# ─────────────────────────────────────────────────────────────────────────────

def _parse_hora(value: str | time) -> time:
    """Convierte 'HH:MM' o 'HH:MM:SS' a datetime.time."""
    if isinstance(value, time):
        return value
    partes = value.split(":")
    return time(int(partes[0]), int(partes[1]))


def _validar_dia_semana(dia_semana: int) -> None:
    if dia_semana < 0 or dia_semana > 6:
        raise ValueError("dia_semana debe estar entre 0 (lunes) y 6 (domingo)")


def _validar_empleado_activo(db: Session, empleado_id: uuid.UUID) -> Empleado:
    empleado = (
        db.query(Empleado)
        .filter(Empleado.id == empleado_id, Empleado.activo == True)
        .first()
    )
    if not empleado:
        raise ValueError(f"Empleado {empleado_id} no encontrado o inactivo")
    return empleado


# ─────────────────────────────────────────────────────────────────────────────
# Resolución de herencia — función central del módulo
# ─────────────────────────────────────────────────────────────────────────────

def resolver_horario_efectivo(
    db: Session,
    empleado_id: uuid.UUID,
    dia_semana: int,
) -> Horario | None:
    """
    Resuelve el horario vigente para un empleado en un día de semana dado.
    Implementa el patrón de herencia: específico > global > None.

    Algoritmo (O(1) — dos queries con índices únicos parciales):
      1. Busca horario ESPECÍFICO activo para (empleado_id, dia_semana).
         Si existe → retorna ese (override del global).
      2. Si no → busca horario GLOBAL activo para (dia_semana).
         Si existe → retorna ese (fallback de empresa).
      3. Si ninguno → retorna None (empleado sin horario ese día).

    Args:
        db:          Sesión SQLAlchemy.
        empleado_id: UUID del empleado a resolver.
        dia_semana:  Entero 0-6 (0=Lunes, 6=Domingo).

    Returns:
        Instancia Horario con el horario efectivo, o None.
    """
    # ── Prioridad 1: horario ESPECÍFICO del empleado ──────────────────────────
    especifico = (
        db.query(Horario)
        .filter(
            Horario.empleado_id == empleado_id,
            Horario.dia_semana == dia_semana,
            Horario.es_global == False,
            Horario.activo == True,
        )
        .first()
    )
    if especifico:
        logger.debug(
            f"Horario efectivo ESPECÍFICO | empleado={empleado_id} "
            f"dia={DIAS[dia_semana]} | entrada={especifico.hora_entrada}"
        )
        return especifico

    # ── Prioridad 2: horario GLOBAL de empresa ────────────────────────────────
    global_ = (
        db.query(Horario)
        .filter(
            Horario.empleado_id == None,
            Horario.dia_semana == dia_semana,
            Horario.es_global == True,
            Horario.activo == True,
        )
        .first()
    )
    if global_:
        logger.debug(
            f"Horario efectivo GLOBAL | empleado={empleado_id} "
            f"dia={DIAS[dia_semana]} | entrada={global_.hora_entrada}"
        )
        return global_

    # ── Sin horario definido ──────────────────────────────────────────────────
    logger.warning(
        f"Sin horario definido | empleado={empleado_id} | dia={DIAS[dia_semana]}"
    )
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Cálculo de estado de marcación
# ─────────────────────────────────────────────────────────────────────────────

def calcular_estado_marcacion(
    hora_real: time,
    horario: Horario,
    tipo: str = "entrada",
) -> str:
    """
    Compara la hora real de marcación contra el horario efectivo.

    Returns:
        Para tipo='entrada':
          'a_tiempo'         → llegó antes o dentro de la tolerancia
          'tardanza'         → superó la tolerancia de entrada
        Para tipo='salida':
          'a_tiempo'         → salió dentro de la tolerancia
          'salida_anticipada'→ salió antes de la tolerancia
          'horas_extra'      → salió después de la hora de salida

    Args:
        hora_real: La hora en que realmente marcó el empleado.
        horario:   Instancia Horario con los valores de referencia.
        tipo:      'entrada' | 'salida'
    """
    hoy = date.today()
    referencia = horario.hora_entrada if tipo == "entrada" else horario.hora_salida
    ref_dt  = datetime.combine(hoy, referencia)
    real_dt = datetime.combine(hoy, hora_real)
    delta_min = (real_dt - ref_dt).total_seconds() / 60

    if tipo == "entrada":
        if delta_min <= horario.tolerancia_minutos:
            return "a_tiempo"
        return "tardanza"
    else:
        if delta_min >= horario.tolerancia_minutos:
            return "horas_extra"
        if abs(delta_min) <= horario.tolerancia_minutos:
            return "a_tiempo"
        return "salida_anticipada"


# ─────────────────────────────────────────────────────────────────────────────
# CRUD — Horarios específicos de empleado
# ─────────────────────────────────────────────────────────────────────────────

def crear_horario(db: Session, data: HorarioCreate) -> Horario:
    """Crea un horario específico para un empleado. Falla si ya existe uno activo."""
    _validar_empleado_activo(db, data.empleado_id)
    _validar_dia_semana(data.dia_semana)

    existente = db.query(Horario).filter(
        Horario.empleado_id == data.empleado_id,
        Horario.dia_semana == data.dia_semana,
        Horario.es_global == False,
        Horario.activo == True,
    ).first()
    if existente:
        raise ValueError(
            f"El empleado ya tiene un horario específico activo para el "
            f"día {DIAS[data.dia_semana]}. Use PUT /{existente.id} para modificarlo "
            f"o DELETE /{existente.id} para eliminarlo primero."
        )

    horario = Horario(
        empleado_id=data.empleado_id,
        dia_semana=data.dia_semana,
        hora_entrada=_parse_hora(data.hora_entrada),
        hora_salida=_parse_hora(data.hora_salida),
        tolerancia_minutos=data.tolerancia_minutos,
        es_global=False,
    )
    db.add(horario)
    db.commit()
    db.refresh(horario)
    logger.info(
        f"Horario específico creado | empleado={data.empleado_id} "
        f"dia={DIAS[data.dia_semana]} | id={horario.id}"
    )
    return horario


def crear_horario_global(db: Session, data: HorarioGlobalCreate) -> Horario:
    """
    Crea o reemplaza el horario global de empresa para un día.
    Implementa upsert: desactiva el anterior si existe.
    """
    _validar_dia_semana(data.dia_semana)

    # Soft-delete del global anterior para ese día (upsert)
    anterior = db.query(Horario).filter(
        Horario.es_global == True,
        Horario.dia_semana == data.dia_semana,
        Horario.activo == True,
    ).first()
    if anterior:
        anterior.activo = False
        logger.info(
            f"Horario global anterior desactivado | id={anterior.id} "
            f"dia={DIAS[data.dia_semana]}"
        )

    horario = Horario(
        empleado_id=None,
        dia_semana=data.dia_semana,
        hora_entrada=_parse_hora(data.hora_entrada),
        hora_salida=_parse_hora(data.hora_salida),
        tolerancia_minutos=data.tolerancia_minutos,
        es_global=True,
    )
    db.add(horario)
    db.commit()
    db.refresh(horario)
    logger.info(
        f"Horario global creado | dia={DIAS[data.dia_semana]} "
        f"| entrada={horario.hora_entrada} | id={horario.id}"
    )
    return horario


def listar_horarios(
    db: Session,
    empleado_id: uuid.UUID | None = None,
    solo_globales: bool = False,
    solo_activos: bool = True,
) -> list[Horario]:
    """Lista horarios con filtros opcionales."""
    query = db.query(Horario)

    if solo_globales:
        query = query.filter(Horario.es_global == True)
    elif empleado_id:
        query = query.filter(
            Horario.empleado_id == empleado_id,
            Horario.es_global == False,
        ).join(Empleado).filter(Empleado.activo == True)

    if solo_activos:
        query = query.filter(Horario.activo == True)

    return query.order_by(Horario.dia_semana).all()


def obtener_horario(db: Session, horario_id: uuid.UUID) -> Horario | None:
    return db.query(Horario).filter(Horario.id == horario_id).first()


def actualizar_horario(
    db: Session,
    horario_id: uuid.UUID,
    data: HorarioUpdate,
) -> Horario | None:
    horario = obtener_horario(db, horario_id)
    if not horario:
        return None

    update_data = data.model_dump(exclude_none=True)
    if "hora_entrada" in update_data:
        update_data["hora_entrada"] = _parse_hora(update_data["hora_entrada"])
    if "hora_salida" in update_data:
        update_data["hora_salida"] = _parse_hora(update_data["hora_salida"])

    for field, value in update_data.items():
        setattr(horario, field, value)

    db.commit()
    db.refresh(horario)
    logger.info(f"Horario actualizado | id={horario_id}")
    return horario


def eliminar_horario(db: Session, horario_id: uuid.UUID) -> Horario | None:
    """Soft-delete: marca el horario como inactivo."""
    horario = obtener_horario(db, horario_id)
    if not horario:
        return None
    horario.activo = False
    db.commit()
    tipo = "global" if horario.es_global else "específico"
    logger.info(f"Horario {tipo} desactivado | id={horario_id}")
    return horario
