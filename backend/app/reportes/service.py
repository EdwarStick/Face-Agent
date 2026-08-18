import uuid
from datetime import datetime, timezone, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.empleado import Empleado
from app.models.asistencia import Asistencia


def _get_local_today_bounds():
    now_local = datetime.now().astimezone()
    inicio_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    fin_local = inicio_local + timedelta(days=1)
    return inicio_local.astimezone(timezone.utc), fin_local.astimezone(timezone.utc)


def resumen_diario(db: Session) -> dict:
    inicio_utc, fin_utc = _get_local_today_bounds()
    hoy_local = datetime.now().astimezone().date()

    total_empleados = db.query(Empleado).filter(Empleado.activo == True).count()

    asistencias_hoy = db.query(Asistencia).filter(
        Asistencia.hora_entrada >= inicio_utc,
        Asistencia.hora_entrada < fin_utc,
    ).all()

    presentes = sum(1 for a in asistencias_hoy if a.hora_salida is None)
    ya_salieron = sum(1 for a in asistencias_hoy if a.hora_salida is not None)
    ausentes = total_empleados - len(asistencias_hoy)
    porcentaje = round((len(asistencias_hoy) / total_empleados * 100), 2) if total_empleados > 0 else 0

    return {
        "fecha": hoy_local,
        "total_empleados": total_empleados,
        "presentes": presentes,
        "ya_salieron": ya_salieron,
        "ausentes": ausentes,
        "porcentaje_asistencia": porcentaje
    }


def reporte_asistencias_hoy(db: Session) -> dict:
    inicio_utc, fin_utc = _get_local_today_bounds()
    hoy_local = datetime.now().astimezone().date()

    asistencias = db.query(Asistencia).filter(
        Asistencia.hora_entrada >= inicio_utc,
        Asistencia.hora_entrada < fin_utc,
    ).all()

    detalle = []
    for a in asistencias:
        emp = a.empleado
        detalle.append({
            "empleado_id": emp.id,
            "nombre_completo": f"{emp.prim_nombre} {emp.prim_apellido}",
            "cargo": emp.cargo,
            "area": emp.area,
            "hora_entrada": a.hora_entrada,
            "hora_salida": a.hora_salida,
            "horas_trabajadas": a.horas_trabajadas,
            "estado": a.estado,
            "porcentaje_confianza": a.porcentaje_confianza
        })

    return {"fecha": hoy_local, "asistencias": detalle}


def estadisticas_empleado(db: Session, empleado_id: uuid.UUID) -> dict | None:
    empleado = db.query(Empleado).filter(
        Empleado.id == empleado_id,
        Empleado.activo == True
    ).first()

    if not empleado:
        return None

    asistencias = db.query(Asistencia).filter(
        Asistencia.empleado_id == empleado_id
    ).all()

    total_dias = len(asistencias)
    promedio_horas = None

    horas = [a.horas_trabajadas for a in asistencias if a.horas_trabajadas is not None]
    if horas:
        promedio_horas = round(sum(horas) / len(horas), 2)

    ultima = max((a.hora_entrada for a in asistencias if a.hora_entrada), default=None)

    return {
        "empleado_id": empleado.id,
        "nombre_completo": f"{empleado.prim_nombre} {empleado.prim_apellido}",
        "cargo": empleado.cargo,
        "area": empleado.area,
        "total_dias": total_dias,
        "promedio_horas": promedio_horas,
        "ultima_asistencia": ultima
    }
