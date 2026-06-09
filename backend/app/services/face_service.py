import base64
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
    if "," in imagen_base64:
        imagen_base64 = imagen_base64.split(",")[1]
    data = base64.b64decode(imagen_base64)
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen")
    return img


def generar_embedding(imagen_base64: str) -> list[float]:
    """
    Recibe imagen en base64, detecta el rostro y retorna el embedding.
    Lanza excepción si no detecta rostro.
    """
    img = imagen_base64_a_array(imagen_base64)

    resultado = DeepFace.represent(
        img_path=img,
        model_name="Facenet512",
        enforce_detection=True,
        detector_backend="opencv",
    )

    if not resultado:
        raise ValueError("No se detectó ningún rostro en la imagen")

    embedding = resultado[0]["embedding"]
    logger.info(f"Embedding generado: {len(embedding)} dimensiones")
    return embedding