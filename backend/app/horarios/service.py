import uuid
from datetime import time
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from app.models.horario import Horario
from app.models.empleado import Empleado
from app.horarios.schemas import HorarioCreate, HorarioUpdate


DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]


def _parse_hora(value: str) -> time:
    partes = value.split(":")
    return time(int(partes[0]), int(partes[1]))


def crear_horario(db: Session, data: HorarioCreate) -> Horario:
    empleado = db.query(Empleado).filter(Empleado.id == data.empleado_id, Empleado.activo == True).first()
    if not empleado:
        raise ValueError("Empleado no encontrado")

    if data.dia_semana < 0 or data.dia_semana > 6:
        raise ValueError("dia_semana debe estar entre 0 (lunes) y 6 (domingo)")

    existente = db.query(Horario).filter(
        Horario.empleado_id == data.empleado_id,
        Horario.dia_semana == data.dia_semana,
        Horario.activo == True,
    ).first()
    if existente:
        raise ValueError(f"El empleado ya tiene un horario para el dia {DIAS[data.dia_semana]}")

    horario = Horario(
        empleado_id=data.empleado_id,
        dia_semana=data.dia_semana,
        hora_entrada=_parse_hora(data.hora_entrada),
        hora_salida=_parse_hora(data.hora_salida),
    )
    db.add(horario)
    db.commit()
    db.refresh(horario)
    return horario


def listar_horarios(db: Session, empleado_id: uuid.UUID | None = None) -> list[Horario]:
    query = db.query(Horario).join(Empleado).filter(Empleado.activo == True)
    if empleado_id:
        query = query.filter(Horario.empleado_id == empleado_id)
    return query.order_by(Horario.empleado_id, Horario.dia_semana).all()


def obtener_horario(db: Session, horario_id: uuid.UUID) -> Horario | None:
    return db.query(Horario).filter(Horario.id == horario_id).first()


def actualizar_horario(db: Session, horario_id: uuid.UUID, data: HorarioUpdate) -> Horario | None:
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
    return horario


def eliminar_horario(db: Session, horario_id: uuid.UUID) -> Horario | None:
    horario = obtener_horario(db, horario_id)
    if not horario:
        return None
    horario.activo = False
    db.commit()
    return horario
