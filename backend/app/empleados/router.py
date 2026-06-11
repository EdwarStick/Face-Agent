import uuid
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.empleados import service
from app.empleados.schemas import EmpleadoCreate, EmpleadoResponse, EmpleadoUpdate

router = APIRouter()


@router.post("/", response_model=EmpleadoResponse, status_code=status.HTTP_201_CREATED)
def crear_empleado(data: EmpleadoCreate, db: Session = Depends(get_db)):
    return service.crear_empleado(db, data)


@router.get("/", response_model=list[EmpleadoResponse])
def listar_empleados(db: Session = Depends(get_db)):
    return service.listar_empleados(db)


@router.get("/{empleado_id}", response_model=EmpleadoResponse)
def obtener_empleado(empleado_id: uuid.UUID, db: Session = Depends(get_db)):
    emp = service.obtener_empleado(db, empleado_id, incluir_inactivos=True)
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return emp


@router.put("/{empleado_id}", response_model=EmpleadoResponse)
def actualizar_empleado(empleado_id: uuid.UUID, data: EmpleadoUpdate, db: Session = Depends(get_db)):
    emp = service.actualizar_empleado(db, empleado_id, data)
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return emp


@router.delete("/{empleado_id}", status_code=status.HTTP_200_OK)
def eliminar_empleado(empleado_id: uuid.UUID, db: Session = Depends(get_db)):
    emp = service.eliminar_empleado(db, empleado_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return {"mensaje": "Empleado desactivado correctamente"}
