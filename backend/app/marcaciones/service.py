from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from app.models.marcacion import Marcacion
from app.models.empleado import Empleado


def listar_ultimas(db: Session, limite: int = 10) -> list[dict]:
    rows = (
        db.query(Marcacion, Empleado)
        .join(Empleado, Marcacion.empleado_id == Empleado.id)
        .order_by(Marcacion.fecha_marcacion.desc())
        .limit(limite)
        .all()
    )
    result = []
    for m, e in rows:
        result.append({
            "id": m.id,
            "empleado_id": m.empleado_id,
            "empleado_nombre": f"{e.prim_nombre} {e.prim_apellido}",
            "cargo": e.cargo,
            "fecha_marcacion": m.fecha_marcacion,
            "tipo": m.tipo,
        })
    return result


def obtener_stats(db: Session) -> dict:
    total = db.query(sqlfunc.count(Marcacion.id)).scalar() or 0
    hoy = (
        db.query(sqlfunc.count(Marcacion.id))
        .filter(sqlfunc.date(Marcacion.fecha_marcacion) == date.today())
        .scalar()
        or 0
    )
    return {"total": total, "hoy": hoy}
