from datetime import datetime, timezone
import uuid
from sqlalchemy.orm import Session
from loguru import logger

from app.models.rostro import Rostro
from app.models.empleado import Empleado
from app.models.asistencia import Asistencia
from app.services.face_service import generar_embedding
from app.services.recognition_service import identificar_empleado as shared_identificar
from app.asistencias.schemas import RegistrarEntradaRequest, RegistrarSalidaRequest
from app.asistencias import service as asistencias_service


def identificar(db: Session, imagen_base64: str) -> dict:
    """
    Domain service for face recognition.
    Delegates to the shared recognition service for embedding comparison.
    """
    logger.info("Iniciando reconocimiento facial desde domain service")
    return shared_identificar(db, imagen_base64)


def marcar_con_reconocimiento(db: Session, imagen_base64: str) -> dict:
    """
    Integrated flow: recognize employee → register attendance (entry/exit).
    Returns unified response with recognition + attendance data.
    """
    logger.info("Iniciando flujo integrado: reconocimiento + asistencia")

    resultado = shared_identificar(db, imagen_base64)

    if not resultado["reconocido"]:
        return {
            "reconocido": False,
            "empleado_id": None,
            "nombre_completo": None,
            "cargo": None,
            "area": None,
            "confianza": resultado.get("confianza"),
            "tipo_marcacion": None,
            "fecha_hora": None,
            "mensaje": resultado["mensaje"],
        }

    empleado_id = resultado["empleado_id"]

    entrada_activa = db.query(Asistencia).filter(
        Asistencia.empleado_id == empleado_id,
        Asistencia.hora_salida == None
    ).first()

    confianza = resultado.get("confianza")

    if entrada_activa:
        salida_data = RegistrarSalidaRequest(empleado_id=empleado_id)
        asistencia = asistencias_service.registrar_salida(db, salida_data)
        tipo = "salida"
        message = "Salida registrada correctamente"
        fecha_hora = asistencia.hora_salida
        logger.info(f"Asistencia (salida) registrada para empleado {empleado_id}")
    else:
        entrada_data = RegistrarEntradaRequest(
            empleado_id=empleado_id,
            porcentaje_confianza=confianza
        )
        asistencia = asistencias_service.registrar_entrada(db, entrada_data)
        tipo = "entrada"
        message = "Entrada registrada correctamente"
        fecha_hora = asistencia.hora_entrada

    return {
        "reconocido": True,
        "empleado_id": empleado_id,
        "nombre_completo": resultado["nombre_completo"],
        "cargo": resultado["cargo"],
        "area": resultado["area"],
        "confianza": confianza,
        "tipo_marcacion": tipo,
        "fecha_hora": fecha_hora,
        "mensaje": message,
    }
