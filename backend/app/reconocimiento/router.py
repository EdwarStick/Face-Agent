# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Request
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.reconocimiento.schemas import ReconocimientoRequest, ReconocimientoResponse, ReconocimientoAsistenciaResponse
from app.reconocimiento import service
from app.utils.quality_validator import FaceQualityValidator, FaceQualityError

router = APIRouter()

# ── Instancia compartida del validador ────────────────────────────────────────
# Se crea una sola vez al cargar el módulo (stateless → thread-safe).
# Los umbrales se leen desde Settings/env: IMAGE_MIN_BLUR_SCORE, etc.
_quality_validator = FaceQualityValidator()


@router.post("/identificar", response_model=ReconocimientoResponse)
def identificar(data: ReconocimientoRequest, request: Request, db: Session = Depends(get_db)):
    """
    Identifica un empleado a partir de una imagen facial en base64.

    Pipeline:
      1. Validación de calidad (ROI + blur + iluminación + histéresis) — Fail Fast HTTP 400.
      2. Reconocimiento facial via DeepFace/Facenet512.
    """
    session_id = request.client.host if request.client else "default"
    # ── Guardia de calidad — se aborta antes de llamar a DeepFace ─────────────
    try:
        _quality_validator.validate(data.imagen_base64, session_id=session_id)
    except FaceQualityError as qe:
        raise HTTPException(status_code=400, detail=qe.to_dict())

    # ── Pipeline de reconocimiento ─────────────────────────────────────────────
    try:
        resultado = service.identificar(db, data.imagen_base64)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/marcar", response_model=ReconocimientoAsistenciaResponse)
def marcar(data: ReconocimientoRequest, request: Request, db: Session = Depends(get_db)):
    """
    Identifica al empleado y registra automáticamente su marcación de
    entrada o salida.

    Pipeline:
      1. Validación de calidad (ROI + blur + iluminación + histéresis) — Fail Fast HTTP 400.
      2. Reconocimiento facial + marcación de asistencia.
    """
    session_id = request.client.host if request.client else "default"
    # ── Guardia de calidad — se aborta antes de llamar a DeepFace ─────────────
    try:
        _quality_validator.validate(data.imagen_base64, session_id=session_id)
    except FaceQualityError as qe:
        raise HTTPException(status_code=400, detail=qe.to_dict())

    # ── Pipeline de reconocimiento + marcación ─────────────────────────────────
    try:
        resultado = service.marcar_con_reconocimiento(db, data.imagen_base64)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

