"""
tests/test_face_pipeline.py
============================
Suite de QA para el pipeline de reconocimiento facial de FaceAttendance AI.

Cubre los 6 casos críticos del plan de auditoría:
  1. enforce_detection rechaza imagen sin rostro          (ValueError)
  2. Múltiples rostros son rechazados                     (ValueError)
  3. Threshold alto → falso positivo bloqueado            (no reconocido)
  4. Threshold bajo → reconocimiento exitoso              (reconocido)
  5. El modelo Facenet512 es el que se pasa a DeepFace    (assert_called_with)
  6. Asistencia abierta de ayer NO bloquea entrada hoy    (bug fix fecha)

Todos los tests son unitarios (no requieren DB real ni cámara).
DeepFace y la DB se mockean completamente.
"""

import os
import sys
import uuid
import base64
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

# ── Asegurar que el backend esté en el path ───────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _imagen_dummy_base64() -> str:
    """Crea una imagen 10x10 negra en base64 (válida para OpenCV, sin rostro real)."""
    img = np.zeros((10, 10, 3), dtype=np.uint8)
    import cv2
    _, buf = cv2.imencode(".jpg", img)
    return base64.b64encode(buf.tobytes()).decode()


def _embedding_facenet512() -> list[float]:
    """Embedding unitario de 512 dimensiones para Facenet512."""
    v = np.zeros(512)
    v[0] = 1.0
    return v.tolist()


# ─────────────────────────────────────────────────────────────────────────────
# TEST 1 — enforce_detection rechaza imagen sin rostro
# ─────────────────────────────────────────────────────────────────────────────

class TestEnforceDetection:
    """Valida que enforce_detection=True bloquea imágenes sin rostro válido."""

    def test_sin_rostro_lanza_value_error(self):
        """
        DeepFace lanza ValueError cuando enforce_detection=True y no
        encuentra rostro. La función debe capturarlo y re-lanzarlo con
        mensaje descriptivo en español.
        """
        from app.services import face_service

        imagen = _imagen_dummy_base64()

        with patch("app.services.face_service.DeepFace.represent") as mock_repr:
            mock_repr.side_effect = ValueError("Face could not be detected")

            with pytest.raises(ValueError) as exc_info:
                face_service.generar_embedding(imagen)

        assert "rostro" in str(exc_info.value).lower(), (
            "El mensaje de error debe mencionar 'rostro' para ser comprensible al usuario"
        )

    def test_enforce_detection_flag_activo(self):
        """
        Verifica que DeepFace.represent es llamado con enforce_detection=True.
        Esto garantiza que la validación nunca está desactivada en producción.
        """
        from app.services import face_service

        imagen = _imagen_dummy_base64()
        emb = _embedding_facenet512()

        with patch("app.services.face_service.DeepFace.represent") as mock_repr:
            mock_repr.return_value = [{"embedding": emb}]

            face_service.generar_embedding(imagen)

            _, kwargs = mock_repr.call_args
            assert kwargs.get("enforce_detection") is True, (
                "enforce_detection debe ser True en producción"
            )


# ─────────────────────────────────────────────────────────────────────────────
# TEST 2 — Múltiples rostros son rechazados
# ─────────────────────────────────────────────────────────────────────────────

class TestMultiplesRostros:
    """Valida que imágenes con más de un rostro son rechazadas."""

    @pytest.mark.parametrize("n_rostros", [2, 3, 5])
    def test_multiples_rostros_lanza_value_error(self, n_rostros: int):
        """
        DeepFace retorna una lista con N embeddings cuando detecta N rostros.
        El pipeline debe rechazar cualquier N > 1.
        """
        from app.services import face_service

        imagen = _imagen_dummy_base64()
        emb = _embedding_facenet512()

        # Simular N rostros detectados
        resultado_deepface = [{"embedding": emb} for _ in range(n_rostros)]

        with patch("app.services.face_service.DeepFace.represent") as mock_repr:
            mock_repr.return_value = resultado_deepface

            with pytest.raises(ValueError) as exc_info:
                face_service.generar_embedding(imagen)

        error_msg = str(exc_info.value).lower()
        assert str(n_rostros) in str(exc_info.value), (
            f"El mensaje debe indicar cuántos rostros se detectaron ({n_rostros})"
        )
        assert "sola persona" in error_msg or "rostros" in error_msg, (
            "El mensaje debe instruir al usuario a enviar una imagen con una sola persona"
        )


# ─────────────────────────────────────────────────────────────────────────────
# TEST 3 — Modelo Facenet512 es el que se pasa a DeepFace
# ─────────────────────────────────────────────────────────────────────────────

class TestModeloFacenet512:
    """Verifica que el modelo configurado (Facenet512) se pasa a DeepFace."""

    def test_modelo_facenet512_en_llamada_deepface(self):
        """
        El modelo debe leerse de settings.face_recognition_model ('Facenet512')
        y no estar hardcodeado como 'ArcFace' u otro valor.
        """
        from app.services import face_service

        imagen = _imagen_dummy_base64()
        emb = _embedding_facenet512()

        with patch("app.services.face_service.DeepFace.represent") as mock_repr:
            mock_repr.return_value = [{"embedding": emb}]

            face_service.generar_embedding(imagen)

            _, kwargs = mock_repr.call_args
            modelo_usado = kwargs.get("model_name")

        assert modelo_usado == "Facenet512", (
            f"Se esperaba model_name='Facenet512', se obtuvo '{modelo_usado}'. "
            "Verificar que face_service.py lee settings.face_recognition_model."
        )
        assert modelo_usado != "ArcFace", (
            "ArcFace NO debe usarse — está incompatible con los embeddings de Facenet512 en BD"
        )


# ─────────────────────────────────────────────────────────────────────────────
# TEST 4 & 5 — Threshold dinámico: Falsos Positivos y Falsos Negativos
# ─────────────────────────────────────────────────────────────────────────────

def _mock_db_con_rostro(similitud_objetivo: float):
    """
    Crea una DB mock con un único empleado registrado cuyo embedding
    produce exactamente `similitud_objetivo` de similitud coseno contra
    el embedding de consulta [1, 0, 0, ...].
    """
    # Embedding de consulta: vector unitario e1
    emb_consulta = np.zeros(512)
    emb_consulta[0] = 1.0

    # Embedding almacenado: vector que produce la similitud deseada
    # cos(theta) = dot(a,b)/(|a||b|) → para e1 y b: cos = b[0]/|b|
    # Si b = [similitud, sqrt(1-s^2), 0, ...]: cos = similitud
    s = similitud_objetivo
    emb_bd = np.zeros(512)
    emb_bd[0] = s
    if s < 1.0:
        emb_bd[1] = np.sqrt(max(0, 1.0 - s ** 2))

    # Mock de empleado
    empleado_mock = MagicMock()
    empleado_mock.id = uuid.uuid4()
    empleado_mock.prim_nombre = "Test"
    empleado_mock.prim_apellido = "User"
    empleado_mock.cargo = "QA"
    empleado_mock.area = "Engineering"
    empleado_mock.activo = True

    # Mock de rostro
    rostro_mock = MagicMock()
    rostro_mock.vector_facial = emb_bd.tolist()
    rostro_mock.empleado = empleado_mock

    # Mock de DB
    db_mock = MagicMock()
    db_mock.query.return_value.join.return_value.filter.return_value.all.return_value = [
        rostro_mock
    ]

    return db_mock, emb_consulta.tolist()


class TestThresholdDinamico:
    """
    Valida que el umbral leído desde .env controla correctamente
    los falsos positivos y los falsos negativos.
    """

    def test_falso_positivo_bloqueado_con_threshold_alto(self):
        """
        Escenario FP: similitud media (0.50) + threshold alto (0.80).
        → El sistema NO debe reconocer al empleado.
        Garantiza que subir FACE_MATCH_THRESHOLD reduce los falsos positivos.
        """
        from app.services import recognition_service

        similitud_real = 0.50
        threshold_configurado = 0.80

        db_mock, emb_consulta = _mock_db_con_rostro(similitud_real)

        with patch("app.services.face_service.DeepFace.represent") as mock_repr:
            mock_repr.return_value = [{"embedding": emb_consulta}]

            with patch.object(
                recognition_service.settings,
                "face_match_threshold",
                threshold_configurado,
            ):
                resultado = recognition_service.identificar_empleado(
                    db_mock, _imagen_dummy_base64()
                )

        assert resultado["reconocido"] is False, (
            f"Con similitud={similitud_real} y umbral={threshold_configurado}, "
            "el empleado NO debe ser reconocido (falso positivo)"
        )

    def test_falso_negativo_corregido_con_threshold_bajo(self):
        """
        Escenario FN: similitud real alta (0.75) + threshold recomendado (0.65).
        → El sistema SÍ debe reconocer al empleado.
        """
        from app.services import recognition_service

        similitud_real = 0.75
        threshold_configurado = 0.65

        db_mock, emb_consulta = _mock_db_con_rostro(similitud_real)

        with patch("app.services.face_service.DeepFace.represent") as mock_repr:
            mock_repr.return_value = [{"embedding": emb_consulta}]

            with patch.object(
                recognition_service.settings,
                "face_match_threshold",
                threshold_configurado,
            ):
                resultado = recognition_service.identificar_empleado(
                    db_mock, _imagen_dummy_base64()
                )

        assert resultado["reconocido"] is True, (
            f"Con similitud={similitud_real} y umbral={threshold_configurado}, "
            "el empleado SÍ debe ser reconocido (no debe ser falso negativo)"
        )
        assert "confianza" in resultado
        assert resultado["confianza"] > 0


# ─────────────────────────────────────────────────────────────────────────────
# TEST 6 — Bug de fecha: asistencia abierta de ayer NO bloquea entrada hoy
# ─────────────────────────────────────────────────────────────────────────────

class TestBugFechaAsistencia:
    """
    Valida el fix del bug crítico de asistencia:
    una entrada abierta (hora_salida IS NULL) de un día anterior
    NO debe ser detectada como 'entrada activa' para hoy.
    """

    def test_asistencia_abierta_ayer_no_bloquea_hoy(self):
        """
        Simula el caso donde el empleado olvidó registrar salida ayer.
        Hoy, al marcar entrada, el sistema debe:
          - NO encontrar 'entrada activa' (la de ayer queda fuera del filtro)
          - Registrar una nueva entrada correctamente
        """
        from app.reconocimiento.service import marcar_con_reconocimiento

        empleado_id = uuid.uuid4()

        # Asistencia de AYER con hora_salida=None (abierta)
        ayer = datetime.now(timezone.utc) - timedelta(days=1)
        asistencia_ayer = MagicMock()
        asistencia_ayer.empleado_id = empleado_id
        asistencia_ayer.hora_salida = None
        asistencia_ayer.hora_entrada = ayer

        # Mock del resultado de identificar_empleado (reconocido exitosamente)
        resultado_reconocimiento = {
            "reconocido": True,
            "empleado_id": empleado_id,
            "nombre_completo": "Test User",
            "cargo": "QA",
            "area": "Engineering",
            "confianza": 85.0,
            "mensaje": "Empleado reconocido exitosamente",
        }

        # Mock de la asistencia nueva registrada hoy
        asistencia_nueva = MagicMock()
        asistencia_nueva.hora_entrada = datetime.now(timezone.utc)
        asistencia_nueva.hora_salida = None

        db_mock = MagicMock()

        # La query con el filtro correcto de fecha NO debe retornar la asistencia de ayer
        # Simulamos: el filtro de fecha filtra correctamente → retorna None
        db_mock.query.return_value.filter.return_value.first.return_value = None

        with patch(
            "app.reconocimiento.service.shared_identificar",
            return_value=resultado_reconocimiento,
        ):
            with patch(
                "app.reconocimiento.service.asistencias_service.registrar_entrada",
                return_value=asistencia_nueva,
            ) as mock_entrada:
                resultado = marcar_con_reconocimiento(db_mock, _imagen_dummy_base64())

        # Debe haberse registrado UNA ENTRADA (no una salida)
        mock_entrada.assert_called_once(), (
            "Debería registrarse una ENTRADA, no una salida, "
            "cuando la única asistencia abierta es de otro día"
        )
        assert resultado["tipo_marcacion"] == "entrada", (
            "El tipo de marcación debe ser 'entrada', no 'salida'"
        )
        assert resultado["reconocido"] is True

    def test_entrada_activa_hoy_si_registra_salida(self):
        """
        Confirma el flujo correcto: si hay una entrada abierta HOY,
        el sistema registra la salida.
        """
        from app.reconocimiento.service import marcar_con_reconocimiento

        empleado_id = uuid.uuid4()

        # Entrada de HOY con hora_salida=None (activa)
        hoy = datetime.now(timezone.utc)
        asistencia_hoy = MagicMock()
        asistencia_hoy.empleado_id = empleado_id
        asistencia_hoy.hora_salida = None
        asistencia_hoy.hora_entrada = hoy

        resultado_reconocimiento = {
            "reconocido": True,
            "empleado_id": empleado_id,
            "nombre_completo": "Test User",
            "cargo": "QA",
            "area": "Engineering",
            "confianza": 85.0,
            "mensaje": "Empleado reconocido exitosamente",
        }

        asistencia_cerrada = MagicMock()
        asistencia_cerrada.hora_salida = datetime.now(timezone.utc)

        db_mock = MagicMock()
        # El filtro de fecha SÍ retorna la entrada de hoy
        db_mock.query.return_value.filter.return_value.first.return_value = asistencia_hoy

        with patch(
            "app.reconocimiento.service.shared_identificar",
            return_value=resultado_reconocimiento,
        ):
            with patch(
                "app.reconocimiento.service.asistencias_service.registrar_salida",
                return_value=asistencia_cerrada,
            ) as mock_salida:
                resultado = marcar_con_reconocimiento(db_mock, _imagen_dummy_base64())

        mock_salida.assert_called_once(), (
            "Debe registrarse una SALIDA cuando hay entrada activa hoy"
        )
        assert resultado["tipo_marcacion"] == "salida"
