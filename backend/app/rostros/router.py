import uuid
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.rostros import service
from app.rostros.schemas import RegistroRostroRequest, RostroResponse

router = APIRouter()


@router.post("/", response_model=RostroResponse, status_code=status.HTTP_201_CREATED)
def registrar_rostro(data: RegistroRostroRequest, db: Session = Depends(get_db)):
    try:
        return service.registrar_rostro(db, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/empleado/{empleado_id}", response_model=list[RostroResponse])
def listar_rostros(empleado_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.listar_rostros_empleado(db, empleado_id)
