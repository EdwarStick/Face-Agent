# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from loguru import logger

from app.core.config import settings
from app.models.rostro import Rostro
from app.models.empleado import Empleado
from app.services.face_service import generar_embedding


def cosine_similarity(a: list, b: list) -> float:
    """Similitud coseno entre dos vectores."""
    a = np.array(a)
    b = np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def identificar_empleado(db: Session, imagen_base64: str) -> dict:
    """
    Genera embedding de la imagen recibida y lo compara
    contra todos los rostros registrados en BD.
    Retorna el empleado con mayor similitud si supera el umbral.

    El umbral se lee de FACE_MATCH_THRESHOLD en .env (default 0.30 para Facenet512).
    """
    # ── Umbral dinámico (no hardcodeado) ─────────────────────────────────────
    umbral = settings.face_match_threshold
    logger.info(
        f"Pipeline de reconocimiento iniciado | "
        f"modelo={settings.face_recognition_model} | umbral={umbral}"
    )

    # Generar embedding de la imagen entrante
    embedding_nuevo = generar_embedding(imagen_base64)

    # Obtener todos los rostros registrados (solo empleados activos)
    rostros = db.query(Rostro).join(Empleado).filter(Empleado.activo == True).all()

    if not rostros:
        return {
            "reconocido": False,
            "mensaje": "No hay rostros registrados en el sistema"
        }

    # Comparar contra cada rostro
    mejor_similitud = -1.0
    mejor_rostro = None

    for rostro in rostros:
        similitud = cosine_similarity(embedding_nuevo, rostro.vector_facial)
        if similitud > mejor_similitud:
            mejor_similitud = similitud
            mejor_rostro = rostro

    logger.info(
        f"Comparación finalizada | mejor_similitud={mejor_similitud:.4f} | "
        f"umbral={umbral} | superado={mejor_similitud >= umbral}"
    )

    confianza_pct = round(mejor_similitud * 100, 1)

    if mejor_similitud >= umbral:
        empleado = mejor_rostro.empleado
        return {
            "reconocido": True,
            "empleado_id": empleado.id,
            "nombre_completo": f"{empleado.prim_nombre} {empleado.prim_apellido}",
            "cargo": empleado.cargo,
            "area": empleado.area,
            "confianza": confianza_pct,
            "mensaje": f"¡Hola {empleado.prim_nombre}! Identificación exitosa ({confianza_pct}% coincidencia)."
        }

    if mejor_similitud >= 0.45:
        mensaje_fallo = (
            f"Coincidencia del {confianza_pct}%, pero se requiere al menos {round(umbral * 100)}%. "
            "Por favor acércate un poco más a la cámara, mira de frente y asegura buena iluminación."
        )
    else:
        mensaje_fallo = (
            "Rostro no registrado o registrado con muy baja coincidencia. "
            "Verifica si el empleado fue enrolado previamente."
        )

    return {
        "reconocido": False,
        "confianza": confianza_pct,
        "mensaje": mensaje_fallo
    }
