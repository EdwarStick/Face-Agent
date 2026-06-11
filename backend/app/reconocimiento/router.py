# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.reconocimiento.schemas import ReconocimientoRequest, ReconocimientoResponse
from app.reconocimiento import service

router = APIRouter()


@router.post("/identificar", response_model=ReconocimientoResponse)
def identificar(data: ReconocimientoRequest, db: Session = Depends(get_db)):
    try:
        resultado = service.identificar(db, data.imagen_base64)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
