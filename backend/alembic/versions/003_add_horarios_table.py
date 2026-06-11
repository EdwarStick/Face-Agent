"""add horarios table

Revision ID: 003_add_horarios_table
Revises: 002_create_empleados_rostros_asistencias
Create Date: 2026-06-11
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = "003_add_horarios_table"
down_revision: Union[str, None] = "002_create_empleados_rostros_asistencias"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "horarios",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False, index=True),
        sa.Column(
            "empleado_id", UUID(as_uuid=True),
            sa.ForeignKey("empleados.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("dia_semana", sa.Integer, nullable=False),
        sa.Column("hora_entrada", sa.Time, nullable=False),
        sa.Column("hora_salida", sa.Time, nullable=False),
        sa.Column("activo", sa.Boolean, nullable=False, server_default="true"),
    )
    op.create_index("ix_horarios_empleado_id", "horarios", ["empleado_id"])


def downgrade() -> None:
    op.drop_index("ix_horarios_empleado_id", table_name="horarios")
    op.drop_table("horarios")
