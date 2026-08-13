"""Extend horarios table for global/specific inheritance pattern

Revision ID: 004_horarios_herencia
Revises: 003_add_horarios_table
Create Date: 2026-08-13

Cambios:
  - empleado_id pasa a nullable (NULL = horario global de empresa)
  - Agrega columna es_global (bool)
  - Agrega tolerancia_minutos (int, default 15)
  - Agrega timestamps de auditoría (created_at, updated_at)
  - Check constraint: global ↔ empleado_id NULL
  - Índice único parcial: un global activo por día
  - Índice único parcial: un específico activo por empleado+día
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = "004_horarios_herencia"
down_revision: Union[str, None] = "003_add_horarios_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. empleado_id pasa a nullable (soportar horarios globales) ───────────
    op.alter_column("horarios", "empleado_id", nullable=True)

    # ── 2. Columna es_global ──────────────────────────────────────────────────
    op.add_column(
        "horarios",
        sa.Column(
            "es_global",
            sa.Boolean(),
            nullable=False,
            server_default="false",
            comment="TRUE = horario global de empresa; FALSE = específico del empleado",
        ),
    )

    # ── 3. Tolerancia de tardanza en minutos ──────────────────────────────────
    op.add_column(
        "horarios",
        sa.Column(
            "tolerancia_minutos",
            sa.Integer(),
            nullable=False,
            server_default="15",
            comment="Minutos de gracia antes de marcar tardanza",
        ),
    )

    # ── 4. Timestamps de auditoría ────────────────────────────────────────────
    op.add_column(
        "horarios",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
    )
    op.add_column(
        "horarios",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
    )

    # ── 5. Check constraint: integridad global ↔ empleado_id ──────────────────
    op.create_check_constraint(
        "ck_horario_global_o_especifico",
        "horarios",
        "(es_global = TRUE AND empleado_id IS NULL) OR "
        "(es_global = FALSE AND empleado_id IS NOT NULL)",
    )

    # ── 6. Índice único parcial: un solo global activo por día ────────────────
    op.execute(
        """
        CREATE UNIQUE INDEX uq_horario_global_dia_activo
        ON horarios (dia_semana)
        WHERE es_global = TRUE AND activo = TRUE
        """
    )

    # ── 7. Índice único parcial: un específico activo por empleado+día ─────────
    op.execute(
        """
        CREATE UNIQUE INDEX uq_horario_especifico_empleado_dia_activo
        ON horarios (empleado_id, dia_semana)
        WHERE es_global = FALSE AND activo = TRUE
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_horario_especifico_empleado_dia_activo")
    op.execute("DROP INDEX IF EXISTS uq_horario_global_dia_activo")
    op.drop_constraint("ck_horario_global_o_especifico", "horarios", type_="check")
    op.drop_column("horarios", "updated_at")
    op.drop_column("horarios", "created_at")
    op.drop_column("horarios", "tolerancia_minutos")
    op.drop_column("horarios", "es_global")
    op.alter_column("horarios", "empleado_id", nullable=False)
