"""
app/utils/quality_validator.py
==============================
FaceQualityValidator — Pipeline de validación de calidad facial.

Responsabilidades:
  1. Decodificar imágenes base64 provenientes del frontend (webcam / upload).
  2. Evaluar nitidez mediante la Varianza de Laplacian (blur detection).
  3. Evaluar iluminación mediante el canal L del espacio LAB (over/under exposure).
  4. Lanzar FaceQualityError con un mensaje i18n-friendly si alguna métrica falla.

Política de fallos (Fail Fast):
  - Si la imagen no supera CUALQUIERA de las validaciones, se lanza
    FaceQualityError de inmediato. El router captura la excepción y
    responde HTTP 400 sin llegar a llamar a DeepFace/Facenet512.

Umbrales parametrizables (se leen de Settings / .env):
  MIN_BLUR_SCORE      → mínima varianza del Laplacian (nitidez).
  MIN_BRIGHTNESS      → valor mínimo del canal L en LAB (0-100 escala OpenCV 0-255).
  MAX_BRIGHTNESS      → valor máximo del canal L en LAB.

Uso típico en un router FastAPI:
  >>> from app.utils.quality_validator import FaceQualityValidator, FaceQualityError
  >>> validator = FaceQualityValidator()
  >>> try:
  ...     img_cv2 = validator.validate(data.imagen_base64)
  ... except FaceQualityError as e:
  ...     raise HTTPException(status_code=400, detail=e.to_dict())
"""

from __future__ import annotations

import base64
import logging
from dataclasses import dataclass, field
from typing import Any

# pyrefly: ignore [missing-import]
import cv2
# pyrefly: ignore [missing-import]
import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Excepción personalizada — estructura de error consistente
# ─────────────────────────────────────────────────────────────────────────────

class FaceQualityError(Exception):
    """
    Se lanza cuando una imagen no supera las validaciones de calidad.

    Atributos:
        code        : Identificador de máquina para el frontend (e.g. "BLUR").
        message     : Mensaje legible para el usuario final.
        metric_value: Valor medido (útil para depuración y logging).
        threshold   : Umbral configurado que no se superó.
    """

    def __init__(
        self,
        code: str,
        message: str,
        metric_value: float | None = None,
        threshold: float | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.metric_value = metric_value
        self.threshold = threshold

    def to_dict(self) -> dict[str, Any]:
        """
        Convierte la excepción en una estructura JSON lista para ser
        enviada como `detail` en una HTTPException de FastAPI.

        Estructura de respuesta:
        {
            "error_code": "BLUR",
            "message": "La imagen está demasiado borrosa. ...",
            "quality": {
                "metric_value": 45.3,
                "threshold": 80.0
            }
        }
        """
        payload: dict[str, Any] = {
            "error_code": self.code,
            "message": self.message,
        }
        if self.metric_value is not None or self.threshold is not None:
            payload["quality"] = {
                "metric_value": round(self.metric_value, 2) if self.metric_value is not None else None,
                "threshold": self.threshold,
            }
        return payload


# ─────────────────────────────────────────────────────────────────────────────
# Resultado de métricas (para logging y posible auditoría futura)
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class QualityMetrics:
    """Contenedor con las métricas de calidad calculadas para una imagen."""
    blur_score: float = 0.0
    mean_brightness: float = 0.0
    passed: bool = False
    checks: dict[str, bool] = field(default_factory=dict)

    def __str__(self) -> str:
        return (
            f"QualityMetrics("
            f"blur={self.blur_score:.2f}, "
            f"brightness={self.mean_brightness:.2f}, "
            f"passed={self.passed})"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Validador principal
# ─────────────────────────────────────────────────────────────────────────────

class FaceQualityValidator:
    """
    Valida la calidad de imágenes faciales antes de invocar al motor
    de reconocimiento (DeepFace / Facenet512).

    Los umbrales se configuran mediante variables de entorno:

        IMAGE_MIN_BLUR_SCORE   (float, default=80.0)
        IMAGE_MIN_BRIGHTNESS   (float, default=40.0)
        IMAGE_MAX_BRIGHTNESS   (float, default=220.0)

    La instancia es stateless — puede reutilizarse de forma segura
    en contextos concurrentes (e.g., múltiples requests FastAPI).
    """

    def __init__(
        self,
        min_blur_score: float | None = None,
        min_brightness: float | None = None,
        max_brightness: float | None = None,
    ) -> None:
        # Los parámetros explícitos tienen prioridad sobre Settings;
        # esto facilita la inyección en tests unitarios.
        self.min_blur_score: float = (
            min_blur_score
            if min_blur_score is not None
            else settings.image_min_blur_score
        )
        self.min_brightness: float = (
            min_brightness
            if min_brightness is not None
            else settings.image_min_brightness
        )
        self.max_brightness: float = (
            max_brightness
            if max_brightness is not None
            else settings.image_max_brightness
        )

        logger.info(
            "FaceQualityValidator inicializado | "
            f"min_blur={self.min_blur_score} | "
            f"brightness=[{self.min_brightness}, {self.max_brightness}]"
        )

    # ── Utilidad pública: decodificación base64 → numpy array ─────────────────

    @staticmethod
    def base64_to_cv2(imagen_base64: str) -> np.ndarray:
        """
        Decodifica una cadena base64 (con o sin prefijo data URI)
        proveniente del frontend y la convierte en un array BGR de OpenCV.

        Args:
            imagen_base64: Cadena base64. Acepta formatos:
                - Raw base64: "iVBORw0KGgo..."
                - Data URI:   "data:image/jpeg;base64,iVBORw0KGgo..."

        Returns:
            numpy.ndarray en formato BGR (canal uint8).

        Raises:
            FaceQualityError: Si la cadena no es base64 válido o
                              OpenCV no puede decodificar los bytes.
        """
        try:
            # Eliminar prefijo data URI si está presente
            if "," in imagen_base64:
                imagen_base64 = imagen_base64.split(",", 1)[1]

            # Decodificar base64 → bytes
            img_bytes = base64.b64decode(imagen_base64)

            # Convertir bytes → array NumPy → imagen OpenCV (BGR)
            nparr = np.frombuffer(img_bytes, dtype=np.uint8)
            img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img_bgr is None:
                raise FaceQualityError(
                    code="DECODE_ERROR",
                    message=(
                        "No se pudo decodificar la imagen recibida. "
                        "Asegúrate de enviar una imagen JPEG o PNG válida en base64."
                    ),
                )
            return img_bgr

        except FaceQualityError:
            raise  # Re-lanzar para no perder la información de la excepción
        except Exception as exc:
            logger.warning(f"Error decodificando base64: {exc}")
            raise FaceQualityError(
                code="DECODE_ERROR",
                message=(
                    "El formato de la imagen no es válido. "
                    "Verifica que la imagen esté correctamente codificada en base64."
                ),
            ) from exc

    # ── Métricas individuales ──────────────────────────────────────────────────

    def _compute_blur_score(self, img_bgr: np.ndarray) -> float:
        """
        Calcula la nitidez de la imagen mediante la Varianza de Laplacian.

        La Varianza de Laplacian mide la cantidad de bordes presentes.
        Una imagen borrosa tiene bordes difusos → varianza baja.
        Una imagen nítida tiene bordes definidos → varianza alta.

        Referencia recomendada: blur_score > 80 para uso en reconocimiento facial.

        Args:
            img_bgr: Imagen en formato BGR (numpy array).

        Returns:
            Varianza del Laplacian (float >= 0). Valores más altos = más nítido.
        """
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = float(laplacian.var())
        logger.debug(f"Blur score (varianza Laplacian): {variance:.4f}")
        return variance

    def _compute_brightness(self, img_bgr: np.ndarray) -> float:
        """
        Evalúa la iluminación media de la imagen usando el canal L del
        espacio de color LAB (CIELAB).

        El canal L* representa la luminancia perceptual y es independiente
        del color, lo que lo hace robusto ante variaciones de color de piel.

        Escala OpenCV: L in [0, 255]  (equivalente a L* in [0, 100] en CIE).

        Args:
            img_bgr: Imagen en formato BGR (numpy array).

        Returns:
            Media del canal L en la escala de OpenCV (0-255).
        """
        lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
        l_channel = lab[:, :, 0]  # Canal L: índice 0 en OpenCV LAB
        mean_l = float(np.mean(l_channel))
        logger.debug(f"Media canal L (LAB): {mean_l:.4f}")
        return mean_l

    # ── Método principal de validación ────────────────────────────────────────

    def validate(self, imagen_base64: str) -> np.ndarray:
        """
        Ejecuta el pipeline completo de validación de calidad facial.

        Pasos:
          1. Decodificar base64 → imagen OpenCV.
          2. Validar nitidez (Varianza de Laplacian).
          3. Validar iluminación (Canal L en LAB).

        Args:
            imagen_base64: Imagen en formato base64 (con o sin data URI).

        Returns:
            La imagen decodificada como numpy.ndarray BGR. Esto evita
            decodificar la imagen una segunda vez en el servicio downstream.

        Raises:
            FaceQualityError: Si la imagen no pasa cualquiera de las
                              validaciones. Incluye código de error y mensaje
                              específico del fallo.
        """
        # ── Paso 1: Decodificación ────────────────────────────────────────────
        img_bgr = self.base64_to_cv2(imagen_base64)

        metrics = QualityMetrics()

        # ── Paso 2: Validación de nitidez ─────────────────────────────────────
        blur_score = self._compute_blur_score(img_bgr)
        metrics.blur_score = blur_score
        metrics.checks["blur"] = blur_score >= self.min_blur_score

        if blur_score < self.min_blur_score:
            logger.warning(
                f"Imagen rechazada por nitidez insuficiente | "
                f"score={blur_score:.2f} | umbral={self.min_blur_score}"
            )
            raise FaceQualityError(
                code="BLUR",
                message=(
                    "La imagen está demasiado borrosa. "
                    "Por favor, asegúrate de estar bien enfocado "
                    "y de que la cámara esté limpia."
                ),
                metric_value=blur_score,
                threshold=self.min_blur_score,
            )

        # ── Paso 3: Validación de iluminación ─────────────────────────────────
        mean_brightness = self._compute_brightness(img_bgr)
        metrics.mean_brightness = mean_brightness
        metrics.checks["brightness_min"] = mean_brightness >= self.min_brightness
        metrics.checks["brightness_max"] = mean_brightness <= self.max_brightness

        if mean_brightness < self.min_brightness:
            logger.warning(
                f"Imagen rechazada por subexposición | "
                f"L_mean={mean_brightness:.2f} | min={self.min_brightness}"
            )
            raise FaceQualityError(
                code="DARK",
                message=(
                    "La imagen está muy oscura. "
                    "Busca una zona con mejor iluminación o enciende más luces."
                ),
                metric_value=mean_brightness,
                threshold=self.min_brightness,
            )

        if mean_brightness > self.max_brightness:
            logger.warning(
                f"Imagen rechazada por sobreexposición | "
                f"L_mean={mean_brightness:.2f} | max={self.max_brightness}"
            )
            raise FaceQualityError(
                code="OVEREXPOSED",
                message=(
                    "La imagen está sobreexpuesta (demasiada luz). "
                    "Evita la luz directa hacia la cámara o muévete a un lugar con "
                    "iluminación más suave."
                ),
                metric_value=mean_brightness,
                threshold=self.max_brightness,
            )

        # ── Todas las validaciones superadas ──────────────────────────────────
        metrics.passed = True
        logger.info(f"Imagen aprobada por el validador de calidad | {metrics}")
        return img_bgr

    # ── Método conveniente para auditoría (no lanza excepción) ────────────────

    def compute_metrics(self, imagen_base64: str) -> QualityMetrics:
        """
        Calcula y retorna las métricas de calidad SIN lanzar excepción.
        Útil para endpoints de diagnóstico o dashboards de monitoreo.

        Args:
            imagen_base64: Imagen en base64.

        Returns:
            QualityMetrics con los valores calculados y el resultado (passed).
        """
        try:
            img_bgr = self.base64_to_cv2(imagen_base64)
            blur = self._compute_blur_score(img_bgr)
            brightness = self._compute_brightness(img_bgr)

            passed = (
                blur >= self.min_blur_score
                and self.min_brightness <= brightness <= self.max_brightness
            )
            return QualityMetrics(
                blur_score=blur,
                mean_brightness=brightness,
                passed=passed,
                checks={
                    "blur": blur >= self.min_blur_score,
                    "brightness_min": brightness >= self.min_brightness,
                    "brightness_max": brightness <= self.max_brightness,
                },
            )
        except FaceQualityError:
            return QualityMetrics(passed=False, checks={"decode": False})
