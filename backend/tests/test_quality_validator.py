import base64
import cv2
import numpy as np
import pytest

from app.utils.quality_validator import FaceQualityValidator, FaceQualityError


def _create_synthetic_face_image(blur: bool = False) -> str:
    """Genera una imagen sintética 640x480 con un rostro dibujado mediante OpenCV."""
    img = np.ones((480, 640, 3), dtype=np.uint8) * 200

    # Dibujar contorno de cara
    cv2.ellipse(img, (320, 240), (100, 140), 0, 0, 360, (150, 180, 210), -1)
    cv2.ellipse(img, (320, 240), (100, 140), 0, 0, 360, (50, 50, 50), 3)

    # Dibujar ojos
    cv2.circle(img, (280, 200), 15, (255, 255, 255), -1)
    cv2.circle(img, (280, 200), 5, (0, 0, 0), -1)
    cv2.circle(img, (360, 200), 15, (255, 255, 255), -1)
    cv2.circle(img, (360, 200), 5, (0, 0, 0), -1)

    # Dibujar nariz y boca
    cv2.line(img, (320, 210), (320, 250), (50, 50, 50), 3)
    cv2.ellipse(img, (320, 280), (40, 20), 0, 0, 180, (50, 50, 50), 3)

    if blur:
        img = cv2.GaussianBlur(img, (51, 51), 0)

    _, buf = cv2.imencode(".jpg", img)
    return base64.b64encode(buf.tobytes()).decode()


def test_quality_validator_no_face():
    """Verifica que una imagen plana sin rostro devuelva FACE_NOT_DETECTED."""
    validator = FaceQualityValidator(min_blur_score=10.0)
    blank_img = np.zeros((480, 640, 3), dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", blank_img)
    b64 = base64.b64encode(buf.tobytes()).decode()

    with pytest.raises(FaceQualityError) as exc_info:
        validator.validate(b64)

    assert exc_info.value.code == "FACE_NOT_DETECTED"


def test_quality_validator_temporal_hysteresis():
    """Verifica el filtrado temporal por session_id (promedio de 3 frames)."""
    validator = FaceQualityValidator(min_blur_score=30.0)
    session_id = "test_device_123"

    b64_sharp = _create_synthetic_face_image(blur=False)
    b64_blurry = _create_synthetic_face_image(blur=True)

    # 1. Enviar frame nítido
    res = validator.validate(b64_sharp, session_id=session_id)
    assert res is not None
