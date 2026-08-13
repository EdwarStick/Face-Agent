import base64
import binascii
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import cv2
# pyrefly: ignore [missing-import]
from deepface import DeepFace
# pyrefly: ignore [missing-import]
from loguru import logger

from app.core.config import settings


def imagen_base64_a_array(imagen_base64: str) -> np.ndarray:
    """Convierte imagen base64 a array numpy para OpenCV."""
    try:
        if "," in imagen_base64:
            imagen_base64 = imagen_base64.split(",")[1]
        data = base64.b64decode(imagen_base64)
        arr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("No se pudo decodificar la imagen")
        return img
    except (binascii.Error, cv2.error) as e:
        raise ValueError(f"Formato de imagen inválido: {e}")


def generar_embedding(imagen_base64: str) -> list[float]:
    """
    Recibe imagen en base64, detecta el rostro y retorna el embedding.

    Reglas de validación (producción):
    - enforce_detection=True  → rechaza imágenes sin rostro detectable.
    - Múltiples rostros        → rechaza si se detecta más de una persona.
    - Modelo                  → Facenet512 (leído de settings, no hardcodeado).

    Lanza ValueError en todos los casos de imagen inválida.
    """
    modelo = settings.face_recognition_model   # "Facenet512"
    detector = settings.face_detection_model   # "opencv"

    img = imagen_base64_a_array(imagen_base64)

    logger.info(
        f"Generando embedding | modelo={modelo} | detector={detector} | "
        f"imagen shape={img.shape}"
    )

    try:
        resultado = DeepFace.represent(
            img_path=img,
            model_name=modelo,
            enforce_detection=True,   # ← PRODUCCIÓN: rechaza imágenes sin rostro
            detector_backend=detector,
        )
    except ValueError as e:
        # DeepFace lanza ValueError cuando enforce_detection=True y no encuentra rostro
        msg = str(e)
        if "Face could not be detected" in msg or "face" in msg.lower():
            raise ValueError(
                "No se detectó ningún rostro válido en la imagen. "
                "Asegúrese de que el rostro esté bien iluminado y visible."
            )
        raise ValueError(f"Error al procesar la imagen con el modelo facial: {e}")
    except Exception as e:
        raise ValueError(f"Error inesperado al generar el embedding facial: {e}")

    # ── Guardia: múltiples rostros ────────────────────────────────────────────
    # DeepFace.represent devuelve una lista con un dict por cada rostro detectado.
    if len(resultado) > 1:
        raise ValueError(
            f"Se detectaron {len(resultado)} rostros en la imagen. "
            "Por favor, envíe una imagen con una sola persona visible."
        )

    if not resultado:
        raise ValueError("No se detectó ningún rostro en la imagen")

    embedding = np.round(resultado[0]["embedding"], 5).tolist()
    logger.info(
        f"Embedding generado | modelo={modelo} | dimensiones={len(embedding)}"
    )
    return embedding