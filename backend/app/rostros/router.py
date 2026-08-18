import uuid
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status, Request
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.rostros import service
from app.rostros.schemas import RegistroRostroRequest, RostroResponse
from app.utils.quality_validator import FaceQualityValidator, FaceQualityError


class RostrosCountResponse(BaseModel):
    total: int


class RegistroResponse(BaseModel):
    status: str
    message: str
    total: int


router = APIRouter()

# ── Instancia compartida del validador ────────────────────────────────────────
# Singleton. Umbrales leídos de Settings/env al iniciar la app.
_quality_validator = FaceQualityValidator()


@router.post("/", response_model=RegistroResponse, status_code=status.HTTP_201_CREATED)
def registrar_rostro(data: RegistroRostroRequest, request: Request, db: Session = Depends(get_db)):
    """
    Registra una toma biométrica (enrolamiento) para un empleado.

    Pipeline:
      1. Validación de calidad (ROI + blur + iluminación) — Fail Fast HTTP 400.
         Se bloquea la toma si la imagen es borrosa o tiene mala iluminación,
         antes de calcular el embedding con Facenet512.
      2. Generación de embedding y persistencia en BD.
    """
    session_id = request.client.host if request.client else "default"
    # ── Guardia de calidad — se aborta antes de llamar a DeepFace ─────────────
    try:
        _quality_validator.validate(data.imagen_base64, session_id=session_id)
    except FaceQualityError as qe:
        raise HTTPException(status_code=400, detail=qe.to_dict())

    # ── Pipeline de enrolamiento ───────────────────────────────────────────────
    try:
        return service.registrar_rostro(db, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/count", response_model=RostrosCountResponse)
def contar_rostros(db: Session = Depends(get_db)):
    total = service.contar_rostros(db)
    return {"total": total}


@router.get("/empleado/{empleado_id}", response_model=list[RostroResponse])
def listar_rostros(empleado_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.listar_rostros_empleado(db, empleado_id)

