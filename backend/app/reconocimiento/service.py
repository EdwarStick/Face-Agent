import uuid
from sqlalchemy.orm import Session
from loguru import logger

from app.models.rostro import Rostro
from app.models.empleado import Empleado
from app.services.face_service import generar_embedding
from app.services.recognition_service import identificar_empleado as shared_identificar


def identificar(db: Session, imagen_base64: str) -> dict:
    """
    Domain service for face recognition.
    Delegates to the shared recognition service for embedding comparison.
    """
    logger.info("Iniciando reconocimiento facial desde domain service")
    return shared_identificar(db, imagen_base64)
