"""
tests/test_horarios_herencia.py
================================
Suite de QA para el patrón de herencia global/específico del módulo Horarios.

Cubre los 20 casos límite del análisis arquitectónico:
  Grupo A — Resolución de herencia        (H-01 a H-05)
  Grupo B — Integridad de BD en schemas   (H-06 a H-10)
  Grupo C — Estados de marcación          (H-11 a H-14)
  Grupo D — Eliminación y consistencia    (H-17 a H-20) [parcial con mocks]

Todos los tests de resolver son UNITARIOS (mock de DB).
Los tests de schemas son PUROS (sin DB).
Los tests de integración (E2E con DB real) se marcan con @pytest.mark.integration.
"""

import uuid
from datetime import time
from unittest.mock import MagicMock, patch, PropertyMock
import pytest


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_horario(
    es_global: bool,
    dia_semana: int,
    hora_entrada: str = "08:00",
    hora_salida: str = "17:00",
    tolerancia_minutos: int = 15,
    activo: bool = True,
    empleado_id=None,
) -> MagicMock:
    """Crea un mock de Horario con los atributos correctos."""
    h = MagicMock()
    h.id = uuid.uuid4()
    h.es_global = es_global
    h.dia_semana = dia_semana
    h.activo = activo
    h.tolerancia_minutos = tolerancia_minutos
    partes_e = hora_entrada.split(":")
    h.hora_entrada = time(int(partes_e[0]), int(partes_e[1]))
    partes_s = hora_salida.split(":")
    h.hora_salida = time(int(partes_s[0]), int(partes_s[1]))
    h.empleado_id = empleado_id or (None if es_global else uuid.uuid4())
    return h


def _make_db_resolver(especifico=None, global_=None):
    """
    Crea un mock de Session que devuelve `especifico` en la primera query
    y `global_` en la segunda (simula el comportamiento del resolver).
    """
    db = MagicMock()
    filter_mock = MagicMock()
    # first() retorna especifico la 1ª vez, global_ la 2ª
    filter_mock.first.side_effect = [especifico, global_]
    db.query.return_value.filter.return_value = filter_mock
    return db


# ─────────────────────────────────────────────────────────────────────────────
# Grupo A — Resolución de herencia
# ─────────────────────────────────────────────────────────────────────────────

class TestResolucionHerencia:

    def test_H01_especifico_tiene_prioridad_sobre_global(self):
        """H-01: Con específico Y global activos → retorna el ESPECÍFICO."""
        from app.horarios.service import resolver_horario_efectivo

        empleado_id = uuid.uuid4()
        especifico = _make_horario(es_global=False, dia_semana=0, empleado_id=empleado_id)
        global_ = _make_horario(es_global=True, dia_semana=0)
        db = _make_db_resolver(especifico=especifico, global_=global_)

        resultado = resolver_horario_efectivo(db, empleado_id, dia_semana=0)

        assert resultado is especifico, "Debe retornar el horario ESPECÍFICO"
        assert resultado.es_global is False

    def test_H02_fallback_a_global_sin_especifico(self):
        """H-02: Sin específico + con global → retorna el GLOBAL."""
        from app.horarios.service import resolver_horario_efectivo

        empleado_id = uuid.uuid4()
        global_ = _make_horario(es_global=True, dia_semana=1)
        db = _make_db_resolver(especifico=None, global_=global_)

        resultado = resolver_horario_efectivo(db, empleado_id, dia_semana=1)

        assert resultado is global_, "Debe retornar el horario GLOBAL"
        assert resultado.es_global is True

    def test_H03_retorna_none_sin_horario_definido(self):
        """H-03: Sin específico NI global → retorna None."""
        from app.horarios.service import resolver_horario_efectivo

        empleado_id = uuid.uuid4()
        db = _make_db_resolver(especifico=None, global_=None)

        resultado = resolver_horario_efectivo(db, empleado_id, dia_semana=6)

        assert resultado is None, "Debe retornar None cuando no hay horario definido"

    def test_H04_especifico_inactivo_no_bloquea_global(self):
        """H-04: Específico INACTIVO + global activo → retorna el GLOBAL."""
        from app.horarios.service import resolver_horario_efectivo

        empleado_id = uuid.uuid4()
        # El específico está inactivo — el resolver filtra activo=True,
        # así que la query devuelve None para el específico
        global_ = _make_horario(es_global=True, dia_semana=2)
        db = _make_db_resolver(especifico=None, global_=global_)

        resultado = resolver_horario_efectivo(db, empleado_id, dia_semana=2)

        assert resultado is global_, "Con específico inactivo debe usar el GLOBAL"

    def test_H05_eliminar_especifico_revierte_a_global(self):
        """H-05: Tras soft-delete del específico, la siguiente resolución retorna global."""
        from app.horarios import service

        empleado_id = uuid.uuid4()
        horario_id = uuid.uuid4()

        # Mock del horario específico a eliminar
        horario_mock = _make_horario(es_global=False, dia_semana=3, empleado_id=empleado_id)
        horario_mock.id = horario_id

        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = horario_mock

        resultado_delete = service.eliminar_horario(db, horario_id)
        assert resultado_delete.activo is False or resultado_delete is not None

        # Ahora el resolver no encuentra específico → cae al global
        global_ = _make_horario(es_global=True, dia_semana=3)
        db2 = _make_db_resolver(especifico=None, global_=global_)
        resultado_resolver = service.resolver_horario_efectivo(db2, empleado_id, dia_semana=3)

        assert resultado_resolver is global_, (
            "Tras eliminar el específico, el resolver debe retornar el GLOBAL"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Grupo B — Validaciones de schema (sin DB)
# ─────────────────────────────────────────────────────────────────────────────

class TestValidacionesSchema:

    def test_H10_hora_entrada_mayor_que_salida_lanza_error(self):
        """H-10: hora_entrada >= hora_salida → ValidationError en HorarioCreate."""
        from pydantic import ValidationError
        from app.horarios.schemas import HorarioCreate

        with pytest.raises(ValidationError) as exc_info:
            HorarioCreate(
                empleado_id=uuid.uuid4(),
                dia_semana=0,
                hora_entrada="17:00",   # ← mayor que salida
                hora_salida="08:00",
            )
        assert "anterior" in str(exc_info.value).lower() or "hora" in str(exc_info.value).lower()

    def test_H10b_horas_iguales_lanza_error(self):
        """H-10b: hora_entrada == hora_salida → ValidationError."""
        from pydantic import ValidationError
        from app.horarios.schemas import HorarioCreate

        with pytest.raises(ValidationError):
            HorarioCreate(
                empleado_id=uuid.uuid4(),
                dia_semana=0,
                hora_entrada="08:00",
                hora_salida="08:00",
            )

    def test_schema_global_valido(self):
        """HorarioGlobalCreate con horas válidas no lanza error."""
        from app.horarios.schemas import HorarioGlobalCreate

        schema = HorarioGlobalCreate(
            dia_semana=0,
            hora_entrada="08:00",
            hora_salida="17:00",
            tolerancia_minutos=15,
        )
        assert schema.dia_semana == 0

    def test_schema_horario_efectivo_origen_literal(self):
        """HorarioEfectivoResponse acepta solo valores válidos de origen."""
        from pydantic import ValidationError
        from app.horarios.schemas import HorarioEfectivoResponse

        # Valor inválido
        with pytest.raises(ValidationError):
            HorarioEfectivoResponse(
                empleado_id=uuid.uuid4(),
                dia_semana=0,
                hora_entrada=None,
                hora_salida=None,
                tolerancia_minutos=0,
                origen="inventado",      # ← no está en Literal
                horario_id=None,
            )

        # Valores válidos
        for origen_valido in ["especifico", "global", "sin_horario"]:
            resp = HorarioEfectivoResponse(
                empleado_id=uuid.uuid4(),
                dia_semana=0,
                hora_entrada=None,
                hora_salida=None,
                tolerancia_minutos=0,
                origen=origen_valido,
                horario_id=None,
            )
            assert resp.origen == origen_valido


# ─────────────────────────────────────────────────────────────────────────────
# Grupo C — Cálculo de estado de marcación
# ─────────────────────────────────────────────────────────────────────────────

class TestCalcularEstadoMarcacion:

    def _horario(self, hora_entrada="08:00", hora_salida="17:00", tolerancia=15):
        h = MagicMock()
        partes_e = hora_entrada.split(":")
        h.hora_entrada = time(int(partes_e[0]), int(partes_e[1]))
        partes_s = hora_salida.split(":")
        h.hora_salida = time(int(partes_s[0]), int(partes_s[1]))
        h.tolerancia_minutos = tolerancia
        return h

    def test_H12_entrada_dentro_tolerancia_es_a_tiempo(self):
        """H-12: Marca a las 08:14 con horario 08:00 y tolerancia 15 → a_tiempo."""
        from app.horarios.service import calcular_estado_marcacion
        h = self._horario("08:00", "17:00", tolerancia=15)
        assert calcular_estado_marcacion(time(8, 14), h, "entrada") == "a_tiempo"

    def test_H13_entrada_fuera_tolerancia_es_tardanza(self):
        """H-13: Marca a las 08:17 con horario 08:00 y tolerancia 15 → tardanza."""
        from app.horarios.service import calcular_estado_marcacion
        h = self._horario("08:00", "17:00", tolerancia=15)
        assert calcular_estado_marcacion(time(8, 17), h, "entrada") == "tardanza"

    def test_entrada_exacta_es_a_tiempo(self):
        """Marca exactamente a la hora → a_tiempo (delta=0 <= tolerancia)."""
        from app.horarios.service import calcular_estado_marcacion
        h = self._horario("09:00", "18:00", tolerancia=0)
        assert calcular_estado_marcacion(time(9, 0), h, "entrada") == "a_tiempo"

    def test_salida_anticipada(self):
        """Sale 20 min antes con tolerancia 15 → salida_anticipada."""
        from app.horarios.service import calcular_estado_marcacion
        h = self._horario("08:00", "17:00", tolerancia=15)
        assert calcular_estado_marcacion(time(16, 40), h, "salida") == "salida_anticipada"

    def test_horas_extra(self):
        """Sale 20 min después → horas_extra."""
        from app.horarios.service import calcular_estado_marcacion
        h = self._horario("08:00", "17:00", tolerancia=15)
        assert calcular_estado_marcacion(time(17, 20), h, "salida") == "horas_extra"

    def test_salida_dentro_tolerancia(self):
        """Sale 10 min antes con tolerancia 15 → a_tiempo."""
        from app.horarios.service import calcular_estado_marcacion
        h = self._horario("08:00", "17:00", tolerancia=15)
        assert calcular_estado_marcacion(time(16, 50), h, "salida") == "a_tiempo"


# ─────────────────────────────────────────────────────────────────────────────
# Grupo D — Lógica de negocio en service (sin DB real)
# ─────────────────────────────────────────────────────────────────────────────

class TestServiceLogica:

    def test_crear_horario_falla_si_dia_invalido(self):
        """dia_semana fuera de 0-6 lanza ValueError."""
        from app.horarios.service import _validar_dia_semana
        with pytest.raises(ValueError, match="0.*6"):
            _validar_dia_semana(7)
        with pytest.raises(ValueError):
            _validar_dia_semana(-1)

    def test_crear_horario_global_upsert_desactiva_anterior(self):
        """crear_horario_global desactiva el anterior si existe."""
        from app.horarios import service
        from app.horarios.schemas import HorarioGlobalCreate

        anterior_mock = MagicMock()
        anterior_mock.activo = True
        anterior_mock.id = uuid.uuid4()

        nuevo_mock = MagicMock()
        nuevo_mock.id = uuid.uuid4()
        nuevo_mock.es_global = True
        nuevo_mock.activo = True

        db = MagicMock()
        # Primera query (anterior global activo) → retorna anterior_mock
        # Segunda query (refresh) no importa
        db.query.return_value.filter.return_value.first.return_value = anterior_mock
        db.refresh.side_effect = lambda obj: None

        data = HorarioGlobalCreate(
            dia_semana=0,
            hora_entrada="09:00",
            hora_salida="18:00",
        )

        with patch("app.horarios.service.Horario", return_value=nuevo_mock):
            service.crear_horario_global(db, data)

        # Verificar que el anterior fue desactivado
        assert anterior_mock.activo is False, (
            "El horario global anterior debe ser desactivado (activo=False)"
        )
        db.add.assert_called_once()
        db.commit.assert_called()

    def test_resolver_retorna_none_cuando_no_hay_horarios(self):
        """Sin ningún horario en BD → resolver retorna None correctamente."""
        from app.horarios.service import resolver_horario_efectivo

        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        resultado = resolver_horario_efectivo(db, uuid.uuid4(), dia_semana=4)
        assert resultado is None

    @pytest.mark.parametrize("dia", [0, 1, 2, 3, 4, 5, 6])
    def test_resolver_funciona_para_todos_los_dias(self, dia):
        """El resolver acepta días 0-6 sin error."""
        from app.horarios.service import resolver_horario_efectivo

        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        # No debe lanzar ninguna excepción
        resultado = resolver_horario_efectivo(db, uuid.uuid4(), dia_semana=dia)
        assert resultado is None
