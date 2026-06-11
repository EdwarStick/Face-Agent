import uuid
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Query, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.horarios.schemas import HorarioCreate, HorarioUpdate, HorarioResponse
from app.horarios import service

router = APIRouter()


@router.post("/", response_model=HorarioResponse, status_code=status.HTTP_201_CREATED)
def crear_horario(data: HorarioCreate, db: Session = Depends(get_db)):
    try:
        return service.crear_horario(db, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=list[HorarioResponse])
def listar_horarios(
    empleado_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    return service.listar_horarios(db, empleado_id)


@router.get("/{horario_id}", response_model=HorarioResponse)
def obtener_horario(horario_id: uuid.UUID, db: Session = Depends(get_db)):
    horario = service.obtener_horario(db, horario_id)
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    return horario


@router.put("/{horario_id}", response_model=HorarioResponse)
def actualizar_horario(horario_id: uuid.UUID, data: HorarioUpdate, db: Session = Depends(get_db)):
    horario = service.actualizar_horario(db, horario_id, data)
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    return horario


@router.delete("/{horario_id}", status_code=status.HTTP_200_OK)
def eliminar_horario(horario_id: uuid.UUID, db: Session = Depends(get_db)):
    horario = service.eliminar_horario(db, horario_id)
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    return {"mensaje": "Horario desactivado correctamente"}
