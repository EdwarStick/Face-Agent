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
    Lanza ValueError si no detecta rostro o si ocurre un error de procesamiento.
    """
    img = imagen_base64_a_array(imagen_base64)

    try:
        resultado = DeepFace.represent(
            img_path=img,
            model_name="ArcFace",
            enforce_detection=False,
            detector_backend="opencv",
        )
    except ValueError as e:
        if "Face could not be detected" in str(e):
            raise ValueError("No se detectó ningún rostro en la imagen")
        raise ValueError(f"Error al procesar la imagen con el modelo facial: {e}")
    except Exception as e:
        raise ValueError(f"Error inesperado al generar el embedding facial: {e}")

    if not resultado:
        raise ValueError("No se detectó ningún rostro en la imagen")

    embedding = np.round(resultado[0]["embedding"], 5).tolist()
    logger.info(f"Embedding generado: {len(embedding)} dimensiones")
    return embedding