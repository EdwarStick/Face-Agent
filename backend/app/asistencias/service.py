import uuid
from datetime import datetime, timezone
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from app.models.asistencia import Asistencia
from app.asistencias.schemas import RegistrarEntradaRequest, RegistrarSalidaRequest


def registrar_entrada(db: Session, data: RegistrarEntradaRequest) -> Asistencia:
    # Verificar si ya tiene entrada hoy sin salida
    hoy = datetime.now(timezone.utc).date()
    entrada_existente = db.query(Asistencia).filter(
        Asistencia.empleado_id == data.empleado_id,
        Asistencia.hora_salida == None
    ).first()

    if entrada_existente:
        return entrada_existente  # Ya tiene entrada activa

    asistencia = Asistencia(
        empleado_id=data.empleado_id,
        hora_entrada=datetime.now(timezone.utc),
        estado="presente",
        porcentaje_confianza=data.porcentaje_confianza
    )
    db.add(asistencia)
    db.commit()
    db.refresh(asistencia)
    return asistencia


def registrar_salida(db: Session, data: RegistrarSalidaRequest) -> Asistencia | None:
    # Buscar la entrada activa (sin salida)
    asistencia = db.query(Asistencia).filter(
        Asistencia.empleado_id == data.empleado_id,
        Asistencia.hora_salida == None
    ).first()

    if not asistencia:
        return None

    ahora = datetime.now(timezone.utc)
    asistencia.hora_salida = ahora

    # Calcular horas trabajadas
    delta = ahora - asistencia.hora_entrada
    asistencia.horas_trabajadas = round(delta.total_seconds() / 3600, 2)
    asistencia.estado = "completado"

    db.commit()
    db.refresh(asistencia)
    return asistencia


def listar_asistencias_empleado(db: Session, empleado_id: uuid.UUID) -> list[Asistencia]:
    return db.query(Asistencia).filter(
        Asistencia.empleado_id == empleado_id
    ).order_by(Asistencia.fecha_registro.desc()).all()


def listar_asistencias_hoy(db: Session) -> list[Asistencia]:
    from datetime import date
    hoy = datetime.now(timezone.utc).date()
    return db.query(Asistencia).filter(
        Asistencia.hora_entrada >= datetime(hoy.year, hoy.month, hoy.day, tzinfo=timezone.utc)
    ).all()
