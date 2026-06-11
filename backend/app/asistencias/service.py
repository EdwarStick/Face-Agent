import uuid
from datetime import date, datetime, timezone
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import func as sqlfunc
from app.models.asistencia import Asistencia
from app.models.empleado import Empleado
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
    hoy = datetime.now(timezone.utc).date()
    return db.query(Asistencia).filter(
        Asistencia.hora_entrada >= datetime(hoy.year, hoy.month, hoy.day, tzinfo=timezone.utc)
    ).all()


def listar_ultimas(db: Session, limite: int = 10) -> list[dict]:
    rows = (
        db.query(Asistencia, Empleado)
        .join(Empleado, Asistencia.empleado_id == Empleado.id)
        .order_by(Asistencia.fecha_registro.desc())
        .limit(limite)
        .all()
    )
    result = []
    for a, e in rows:
        result.append({
            "id": a.id,
            "empleado_id": a.empleado_id,
            "empleado_nombre": f"{e.prim_nombre} {e.prim_apellido}",
            "cargo": e.cargo,
            "fecha_marcacion": a.hora_entrada or a.fecha_registro,
            "tipo": "salida" if a.hora_salida else "entrada",
        })
    return result


def obtener_stats(db: Session) -> dict:
    total = db.query(sqlfunc.count(Asistencia.id)).scalar() or 0
    hoy = (
        db.query(sqlfunc.count(Asistencia.id))
        .filter(sqlfunc.date(Asistencia.fecha_registro) == date.today())
        .scalar()
        or 0
    )
    return {"total": total, "hoy": hoy}
