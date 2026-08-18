"""
app/utils/quality_validator.py
==============================
FaceQualityValidator — Pipeline de validacion de calidad facial optimizado (ROI + Blur + Histeresis).

Responsabilidades:
  1. Decodificar imagenes base64 provenientes del frontend.
  2. Detectar la Region de Interes (ROI) del rostro de forma ultrarrapida usando Haar Cascade con downscaling (640px).
  3. Evaluar nitidez mediante la Varianza del Laplaciano sobre la ROI normalizada (200x200 px).
  4. Evaluar iluminacion mediante el canal L del espacio LAB sobre la ROI del rostro.
  5. Aplicar filtrado temporal (histeresis en bufer de 3 fotogramas) por sesion/dispositivo para evitar parpadeos en streaming.
  6. Lanzar FaceQualityError (Fail Fast) si alguna metrica falla antes de invocar a DeepFace/ArcFace.
"""

from __future__ import annotations

import base64
import logging
from collections import defaultdict, deque
from dataclasses import dataclass, field
import threading
from typing import Any

# pyrefly: ignore [missing-import]
import cv2
# pyrefly: ignore [missing-import]
import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Excepcion personalizada — estructura de error consistente
# ─────────────────────────────────────────────────────────────────────────────

class FaceQualityError(Exception):
    """
    Se lanza cuando una imagen no supera las validaciones de calidad.

    Atributos:
        code        : Identificador de maquina para el frontend (e.g. "BLUR", "FACE_NOT_DETECTED").
        message     : Mensaje legible para el usuario final.
        metric_value: Valor medido (util para depuracion y logging).
        threshold   : Umbral configurado que no se supero.
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
        Convierte la excepcion en una estructura JSON lista para ser
        enviada como `detail` en una HTTPException de FastAPI.
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
# Resultado de metricas (para logging y posible auditoria futura)
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class QualityMetrics:
    """Contenedor con las metricas de calidad calculadas para una imagen."""
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
    Valida la calidad de imagenes faciales antes de invocar al motor
    de reconocimiento (DeepFace / Facenet512 / ArcFace).

    Optimizado para calcular borrosidad y brillo exclusivamente sobre la ROI
    del rostro detectado y con filtrado temporal por sesion (histeresis) para evitar
    alertas parpadeantes sin degradar los FPS.
    """

    def __init__(
        self,
        min_blur_score: float | None = None,
        min_brightness: float | None = None,
        max_brightness: float | None = None,
    ) -> None:
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

        # Cargar detector Haar Cascade integrado de OpenCV para ROI rapida
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self._face_cascade = cv2.CascadeClassifier(cascade_path)
        if self._face_cascade.empty():
            logger.error(f"No se pudo cargar el clasificador Haar Cascade desde {cascade_path}")

        # Bufer de histeresis temporal por dispositivo/IP (session_id)
        self._history: dict[str, deque[float]] = defaultdict(lambda: deque(maxlen=3))
        self._lock = threading.Lock()

        logger.info(
            "FaceQualityValidator inicializado (ROI + Histeresis 3 frames) | "
            f"min_blur={self.min_blur_score} | "
            f"brightness=[{self.min_brightness}, {self.max_brightness}]"
        )

    # ── Utilidad publica: decodificacion base64 -> numpy array ─────────────────

    @staticmethod
    def base64_to_cv2(imagen_base64: str) -> np.ndarray:
        """
        Decodifica una cadena base64 y la convierte en un array BGR de OpenCV.
        """
        try:
            if "," in imagen_base64:
                imagen_base64 = imagen_base64.split(",", 1)[1]

            img_bytes = base64.b64decode(imagen_base64)
            nparr = np.frombuffer(img_bytes, dtype=np.uint8)
            img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img_bgr is None:
                raise FaceQualityError(
                    code="DECODE_ERROR",
                    message=(
                        "No se pudo decodificar la imagen recibida. "
                        "Asegurate de enviar una imagen JPEG o PNG valida en base64."
                    ),
                )
            return img_bgr

        except FaceQualityError:
            raise
        except Exception as exc:
            logger.warning(f"Error decodificando base64: {exc}")
            raise FaceQualityError(
                code="DECODE_ERROR",
                message=(
                    "El formato de la imagen no es valido. "
                    "Verifica que la imagen este correctamente codificada en base64."
                ),
            ) from exc

    # ── Deteccion de Rostro ROI Optimizada (Downscaling Pre-Analisis) ────────

    def _detect_face_roi(self, img_bgr: np.ndarray) -> np.ndarray | None:
        """
        Detecta el rostro principal de forma ultra-rapida.
        Downscaling a 640px para acelerar el escaneo de Haar Cascade (<10ms),
        y mapea de vuelta para recortar el rostro directamente de la imagen nativa.
        """
        height, width = img_bgr.shape[:2]
        target_width = 640
        if width > target_width:
            scale = target_width / width
            img_small = cv2.resize(img_bgr, (target_width, int(height * scale)), interpolation=cv2.INTER_AREA)
        else:
            scale = 1.0
            img_small = img_bgr

        gray = cv2.cvtColor(img_small, cv2.COLOR_BGR2GRAY)

        faces = self._face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
        )

        if len(faces) == 0:
            return None

        # Tomar el rostro con mayor area (el principal frente a la camara)
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])

        if scale != 1.0:
            x = int(x / scale)
            y = int(y / scale)
            w = int(w / scale)
            h = int(h / scale)

        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(width, x + w), min(height, y + h)

        return img_bgr[y1:y2, x1:x2]

    # ── Metricas individuales sobre ROI ──────────────────────────────────────

    def _compute_blur_score(self, face_roi: np.ndarray) -> float:
        """
        Calcula la nitidez sobre la ROI del rostro usando Varianza del Laplaciano.
        Normaliza el recorte a 200x200px para independizar el score de la distancia del rostro a la camara.
        """
        face_norm = cv2.resize(face_roi, (200, 200), interpolation=cv2.INTER_AREA)
        gray = cv2.cvtColor(face_norm, cv2.COLOR_BGR2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = float(laplacian.var())
        logger.debug(f"Blur score (Laplacian Var 200x200): {variance:.4f}")
        return variance

    def _compute_brightness(self, face_roi: np.ndarray) -> float:
        """
        Evalua la iluminacion media (Canal L en espacio LAB) sobre la ROI del rostro.
        Previene falsos rechazados cuando el fondo es muy oscuro o brillante pero el rostro esta bien iluminado.
        """
        lab = cv2.cvtColor(face_roi, cv2.COLOR_BGR2LAB)
        l_channel = lab[:, :, 0]
        mean_l = float(np.mean(l_channel))
        logger.debug(f"Media canal L en rostro (LAB): {mean_l:.4f}")
        return mean_l

    def _check_face_mask_or_occlusion(self, face_roi: np.ndarray) -> bool:
        """
        Detecta si la parte inferior del rostro (nariz a menton) esta cubierta
        por una mascarilla/tapabocas, mano u objeto.
        """
        h, w = face_roi.shape[:2]
        if h < 40 or w < 40:
            return False

        upper_half = face_roi[0 : int(h * 0.45), :]
        lower_half = face_roi[int(h * 0.55) : h, :]

        upper_ycrcb = cv2.cvtColor(upper_half, cv2.COLOR_BGR2YCrCb)
        lower_ycrcb = cv2.cvtColor(lower_half, cv2.COLOR_BGR2YCrCb)

        # Segmentacion de piel en espacio YCrCb
        upper_skin_mask = cv2.inRange(
            upper_ycrcb,
            np.array([0, 133, 77], dtype=np.uint8),
            np.array([255, 173, 127], dtype=np.uint8),
        )
        lower_skin_mask = cv2.inRange(
            lower_ycrcb,
            np.array([0, 133, 77], dtype=np.uint8),
            np.array([255, 173, 127], dtype=np.uint8),
        )

        upper_skin_ratio = float(np.mean(upper_skin_mask > 0))
        lower_skin_ratio = float(np.mean(lower_skin_mask > 0))

        # Deteccion de azul quirurgico de mascarilla en HSV
        lower_hsv = cv2.cvtColor(lower_half, cv2.COLOR_BGR2HSV)
        surgical_blue_mask = cv2.inRange(
            lower_hsv,
            np.array([85, 50, 50], dtype=np.uint8),
            np.array([135, 255, 255], dtype=np.uint8),
        )
        surgical_blue_ratio = float(np.mean(surgical_blue_mask > 0))

        logger.debug(
            f"Analisis de mascarilla | piel_sup={upper_skin_ratio:.2f} | "
            f"piel_inf={lower_skin_ratio:.2f} | azul_mascarilla={surgical_blue_ratio:.2f}"
        )

        if surgical_blue_ratio > 0.15:
            return True

        if upper_skin_ratio > 0.25 and lower_skin_ratio < 0.10:
            return True

        if upper_skin_ratio > 0.30 and lower_skin_ratio < (upper_skin_ratio * 0.30):
            return True

        return False

    def _check_headwear_or_cap(self, face_roi: np.ndarray) -> bool:
        """
        Detecta si la persona lleva gorra, sombrero o visera que cubre la frente
        o genera sombra intensa en los ojos/frente.
        """
        h, w = face_roi.shape[:2]
        if h < 40 or w < 40:
            return False

        # La frente (primeros 25% de la altura de la ROI)
        forehead_region = face_roi[0 : int(h * 0.25), :]
        forehead_ycrcb = cv2.cvtColor(forehead_region, cv2.COLOR_BGR2YCrCb)

        skin_mask = cv2.inRange(
            forehead_ycrcb,
            np.array([0, 133, 77], dtype=np.uint8),
            np.array([255, 173, 127], dtype=np.uint8),
        )
        forehead_skin_ratio = float(np.mean(skin_mask > 0))

        forehead_lab = cv2.cvtColor(forehead_region, cv2.COLOR_BGR2LAB)
        forehead_l = float(np.mean(forehead_lab[:, :, 0]))

        center_region = face_roi[int(h * 0.25) : int(h * 0.60), :]
        center_lab = cv2.cvtColor(center_region, cv2.COLOR_BGR2LAB)
        center_l = float(np.mean(center_lab[:, :, 0]))

        logger.debug(
            f"Analisis de gorra/sombrero | frente_piel={forehead_skin_ratio:.2f} | "
            f"frente_L={forehead_l:.2f} | centro_L={center_l:.2f}"
        )

        if forehead_skin_ratio < 0.10:
            return True

        if center_l > 60 and forehead_l < (center_l - 35):
            return True

        return False

    # ── Metodo principal de validacion ────────────────────────────────────────

    def validate(self, imagen_base64: str, session_id: str | None = None) -> np.ndarray:
        """
        Ejecuta el pipeline completo de validacion de calidad facial pre-ArcFace.

        Pasos:
          1. Decodificar base64.
          2. Deteccion rapida de rostro ROI (Fail Fast HTTP 400 si no hay cara).
          3. Validacion de mascarilla/tapabocas o rostro cubierto.
          4. Validacion de gorra, sombrero o visera.
          5. Validar iluminacion sobre la ROI de la cara.
          6. Validar nitidez (Laplacian 200x200) sobre ROI con filtrado de histeresis temporal.

        Args:
            imagen_base64: Imagen codificada en base64.
            session_id: ID opcional de la sesion/IP para filtrado de histeresis (promedio movil de 3 frames).

        Returns:
            La imagen decodificada numpy.ndarray BGR.

        Raises:
            FaceQualityError: Si la imagen no supera cualquiera de las validaciones.
        """
        # 1. Decodificacion
        img_bgr = self.base64_to_cv2(imagen_base64)

        # 2. Deteccion de Rostro ROI
        face_roi = self._detect_face_roi(img_bgr)
        if face_roi is None:
            logger.warning("Imagen rechazada: No se detecto rostro en la imagen")
            raise FaceQualityError(
                code="FACE_NOT_DETECTED",
                message=(
                    "No logramos ver tu rostro frente a la cámara. "
                    "Por favor, acércate un poco y asegúrate de encuadrar tu cara en el centro del recuadro."
                ),
            )

        # 3. Deteccion de mascarilla/tapabocas o rostro cubierto
        if self._check_face_mask_or_occlusion(face_roi):
            logger.warning("Imagen rechazada: Rostro cubierto o presencia de mascarilla/tapabocas")
            raise FaceQualityError(
                code="FACE_MASK_DETECTED",
                message=(
                    "Parece que llevas mascarilla, tapabocas o tienes la cara cubierta. "
                    "Por favor, retírate el tapabocas e intenta de nuevo para registrar tu asistencia."
                ),
            )

        # 4. Deteccion de gorra, sombrero o visera
        if self._check_headwear_or_cap(face_roi):
            logger.warning("Imagen rechazada: Presencia de gorra, sombrero o visera sobre la frente")
            raise FaceQualityError(
                code="HEADWEAR_DETECTED",
                message=(
                    "Parece que llevas gorra, sombrero o visera. "
                    "Por favor, retírate la gorra para poder verificar tu rostro e intentar de nuevo."
                ),
            )

        # 3. Iluminacion en el rostro
        mean_brightness = self._compute_brightness(face_roi)

        if mean_brightness < self.min_brightness:
            logger.warning(
                f"Imagen rechazada por rostro oscuro | "
                f"L_mean={mean_brightness:.2f} | min={self.min_brightness}"
            )
            raise FaceQualityError(
                code="DARK",
                message=(
                    "El rostro esta muy oscuro. "
                    "Asegurese de contar con suficiente iluminacion frontal."
                ),
                metric_value=mean_brightness,
                threshold=self.min_brightness,
            )

        if mean_brightness > self.max_brightness:
            logger.warning(
                f"Imagen rechazada por rostro sobreexpuesto | "
                f"L_mean={mean_brightness:.2f} | max={self.max_brightness}"
            )
            raise FaceQualityError(
                code="OVEREXPOSED",
                message=(
                    "El rostro tiene demasiada luz o brillo directo. "
                    "Evite reflejos o luz directa a la camara."
                ),
                metric_value=mean_brightness,
                threshold=self.max_brightness,
            )

        # 4. Nitidez (Blur) en el rostro con histeresis
        blur_score = self._compute_blur_score(face_roi)

        if session_id:
            with self._lock:
                history = self._history[session_id]
                history.append(blur_score)
                effective_blur_score = sum(history) / len(history)
                logger.debug(
                    f"Histeresis session={session_id} | "
                    f"historial={[round(x, 1) for x in history]} | "
                    f"efectivo={effective_blur_score:.2f}"
                )
        else:
            effective_blur_score = blur_score

        if effective_blur_score < self.min_blur_score:
            logger.warning(
                f"Imagen rechazada por rostro borroso | "
                f"score_efectivo={effective_blur_score:.2f} (actual={blur_score:.2f}) | "
                f"umbral={self.min_blur_score}"
            )
            raise FaceQualityError(
                code="BLUR",
                message=(
                    "La imagen esta borrosa. "
                    "Por favor, mantengase firme y enfocado frente a la camara."
                ),
                metric_value=effective_blur_score,
                threshold=self.min_blur_score,
            )

        logger.info(
            f"Calidad de rostro aprobada pre-ArcFace | "
            f"blur_efectivo={effective_blur_score:.2f} | "
            f"brillo={mean_brightness:.2f}"
        )
        return img_bgr

    # ── Metodo diagnostico ───────────────────────────────────────────────────

    def compute_metrics(self, imagen_base64: str) -> QualityMetrics:
        """
        Calcula metricas de calidad sin lanzar excepciones.
        """
        try:
            img_bgr = self.base64_to_cv2(imagen_base64)
            face_roi = self._detect_face_roi(img_bgr)
            if face_roi is None:
                return QualityMetrics(passed=False, checks={"face_detected": False})

            blur = self._compute_blur_score(face_roi)
            brightness = self._compute_brightness(face_roi)

            passed = (
                blur >= self.min_blur_score
                and self.min_brightness <= brightness <= self.max_brightness
            )
            return QualityMetrics(
                blur_score=blur,
                mean_brightness=brightness,
                passed=passed,
                checks={
                    "face_detected": True,
                    "blur": blur >= self.min_blur_score,
                    "brightness_min": brightness >= self.min_brightness,
                    "brightness_max": brightness <= self.max_brightness,
                },
            )
        except Exception:
            return QualityMetrics(passed=False, checks={"decode": False})
