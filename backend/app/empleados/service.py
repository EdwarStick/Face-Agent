import uuid
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from app.models.empleado import Empleado
from app.empleados.schemas import EmpleadoCreate, EmpleadoUpdate


def crear_empleado(db: Session, data: EmpleadoCreate) -> Empleado:
    """
    Creates a new employee, normalizing second name and second surname fields
    to empty strings if they are None or not provided.
    """
    payload = data.model_dump()
    if payload.get("seg_nombres") is None:
        payload["seg_nombres"] = ""
    if payload.get("seg_apellido") is None:
        payload["seg_apellido"] = ""
        
    empleado = Empleado(**payload)
    db.add(empleado)
    db.commit()
    db.refresh(empleado)
    return empleado


def listar_empleados(db: Session) -> list[Empleado]:
    return db.query(Empleado).filter(Empleado.activo == True).all()


def obtener_empleado(db: Session, empleado_id: int) -> Empleado | None:
    return db.query(Empleado).filter(
        Empleado.id == empleado_id,
        Empleado.activo == True
    ).first()

def actualizar_empleado(db: Session, empleado_id: uuid.UUID, data: EmpleadoUpdate) -> Empleado | None:

    empleado = obtener_empleado(db, empleado_id)
    if not empleado:
        return None
    
    update_data = data.model_dump(exclude_none=True)
    if "seg_nombres" in update_data and update_data["seg_nombres"] is None:
        update_data["seg_nombres"] = ""
    if "seg_apellido" in update_data and update_data["seg_apellido"] is None:
        update_data["seg_apellido"] = ""

    for field, value in update_data.items():
        setattr(empleado, field, value)
        
    db.commit()
    db.refresh(empleado)
    return empleado


def eliminar_empleado(db: Session, empleado_id: uuid.UUID) -> Empleado | None:
    empleado = obtener_empleado(db, empleado_id)
    if not empleado:
        return None
    empleado.activo = False
    db.commit()
    return empleado
