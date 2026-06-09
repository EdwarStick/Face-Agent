# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from loguru import logger

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
    """
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

    logger.info(f"Mejor similitud encontrada: {mejor_similitud:.4f}")

    # Umbral de confianza (0.70 = 70% similitud mínima)
    UMBRAL = 0.70

    if mejor_similitud >= UMBRAL:
        empleado = mejor_rostro.empleado
        return {
            "reconocido": True,
            "empleado_id": empleado.id,
            "nombre_completo": f"{empleado.prim_nombre} {empleado.prim_apellido}",
            "cargo": empleado.cargo,
            "area": empleado.area,
            "confianza": round(mejor_similitud * 100, 2),
            "mensaje": "Empleado reconocido exitosamente"
        }

    return {
        "reconocido": False,
        "confianza": round(mejor_similitud * 100, 2),
        "mensaje": "Rostro no reconocido — confianza insuficiente"
    }
