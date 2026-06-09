from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.marcaciones import service
from app.marcaciones.schemas import MarcacionStats, MarcacionResponse

router = APIRouter()


@router.get("/stats", response_model=MarcacionStats)
def obtener_stats(db: Session = Depends(get_db)):
    return service.obtener_stats(db)


@router.get("/", response_model=list[MarcacionResponse])
def listar_ultimas(
    limite: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return service.listar_ultimas(db, limite)
