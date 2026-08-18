import uuid
from datetime import date, datetime, timezone, timedelta
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import func as sqlfunc
from app.models.asistencia import Asistencia
from app.models.empleado import Empleado
from app.asistencias.schemas import RegistrarEntradaRequest, RegistrarSalidaRequest
from app.horarios import service as horarios_service


def registrar_entrada(db: Session, data: RegistrarEntradaRequest) -> Asistencia:
    hoy = datetime.now(timezone.utc).date()
    inicio_hoy = datetime(hoy.year, hoy.month, hoy.day, tzinfo=timezone.utc)
    fin_hoy = inicio_hoy + timedelta(days=1)

    entrada_hoy = db.query(Asistencia).filter(
        Asistencia.empleado_id == data.empleado_id,
        Asistencia.hora_entrada >= inicio_hoy,
        Asistencia.hora_entrada < fin_hoy,
    ).first()

    if entrada_hoy:
        raise ValueError("El empleado ya registró una entrada hoy")

    ahora = datetime.now(timezone.utc)

    # ── Resolución de horario efectivo (herencia global/específico) ───────────
    # dia_semana: 0=Lunes … 6=Domingo (mismo estándar que el módulo de horarios)
    dia_semana = ahora.weekday()
    horario = horarios_service.resolver_horario_efectivo(
        db, data.empleado_id, dia_semana
    )

    # Calcular estado basado en el horario efectivo
    if horario:
        hora_local = ahora.astimezone().time()
        estado = horarios_service.calcular_estado_marcacion(
            hora_local, horario, tipo="entrada"
        )
    else:
        # Sin horario definido → se registra como 'presente' sin validar tardanza
        estado = "presente"

    asistencia = Asistencia(
        empleado_id=data.empleado_id,
        hora_entrada=ahora,
        estado=estado,
        porcentaje_confianza=data.porcentaje_confianza
    )
    db.add(asistencia)
    db.commit()
    db.refresh(asistencia)
    return asistencia


def registrar_salida(db: Session, data: RegistrarSalidaRequest) -> Asistencia:
    hoy = datetime.now(timezone.utc).date()
    inicio_hoy = datetime(hoy.year, hoy.month, hoy.day, tzinfo=timezone.utc)
    fin_hoy = inicio_hoy + timedelta(days=1)

    entrada_hoy = db.query(Asistencia).filter(
        Asistencia.empleado_id == data.empleado_id,
        Asistencia.hora_entrada >= inicio_hoy,
        Asistencia.hora_entrada < fin_hoy,
    ).first()

    if not entrada_hoy:
        raise ValueError("El empleado no tiene una entrada registrada hoy")

    if entrada_hoy.hora_salida is not None:
        raise ValueError("El empleado ya registró una salida hoy")

    ahora = datetime.now(timezone.utc)
    entrada_hoy.hora_salida = ahora

    delta = ahora - entrada_hoy.hora_entrada
    entrada_hoy.horas_trabajadas = round(delta.total_seconds() / 3600, 2)
    entrada_hoy.estado = "completado"

    db.commit()
    db.refresh(entrada_hoy)
    return entrada_hoy


def _get_local_today_bounds():
    now_local = datetime.now().astimezone()
    inicio_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    fin_local = inicio_local + timedelta(days=1)
    return inicio_local.astimezone(timezone.utc), fin_local.astimezone(timezone.utc)


def listar_asistencias_empleado(db: Session, empleado_id: uuid.UUID) -> list[Asistencia]:
    return db.query(Asistencia).filter(
        Asistencia.empleado_id == empleado_id
    ).order_by(Asistencia.fecha_registro.desc()).all()


def listar_asistencias_hoy(db: Session) -> list[Asistencia]:
    inicio_utc, fin_utc = _get_local_today_bounds()
    return db.query(Asistencia).filter(
        Asistencia.hora_entrada >= inicio_utc,
        Asistencia.hora_entrada < fin_utc,
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
    inicio_utc, fin_utc = _get_local_today_bounds()

    hoy = (
        db.query(sqlfunc.count(Asistencia.id))
        .filter(Asistencia.hora_entrada >= inicio_utc, Asistencia.hora_entrada < fin_utc)
        .scalar()
        or 0
    )

    total_empleados = db.query(sqlfunc.count(Empleado.id)).filter(Empleado.activo == True).scalar() or 0
    presentes = (
        db.query(sqlfunc.count(Asistencia.id))
        .filter(
            Asistencia.hora_entrada >= inicio_utc,
            Asistencia.hora_entrada < fin_utc,
            Asistencia.hora_salida == None,
        )
        .scalar()
        or 0
    )
    completados = (
        db.query(sqlfunc.count(Asistencia.id))
        .filter(
            Asistencia.hora_entrada >= inicio_utc,
            Asistencia.hora_entrada < fin_utc,
            Asistencia.hora_salida != None,
        )
        .scalar()
        or 0
    )
    ausentes = total_empleados - (presentes + completados)

    return {
        "total": total,
        "hoy": hoy,
        "total_empleados": total_empleados,
        "presentes": presentes,
        "completados": completados,
        "ausentes": ausentes,
        "pendientes": presentes,
    }
