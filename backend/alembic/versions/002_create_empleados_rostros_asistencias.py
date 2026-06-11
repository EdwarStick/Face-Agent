"""create empleados, rostros, asistencias tables

Revision ID: 002_create_empleados_rostros_asistencias
Revises: 1803fadc9b9f
Create Date: 2026-06-11
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON


revision: str = "002_create_empleados_rostros_asistencias"
down_revision: Union[str, None] = "1803fadc9b9f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- empleados ---
    op.create_table(
        "empleados",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False, index=True),
        sa.Column("codigo_empleado", sa.String(50), unique=True, nullable=False),
        sa.Column("prim_nombre", sa.String(100), nullable=False),
        sa.Column("seg_nombres", sa.String(100), nullable=False, server_default=""),
        sa.Column("prim_apellido", sa.String(100), nullable=False),
        sa.Column("seg_apellido", sa.String(100), nullable=False, server_default=""),
        sa.Column("correo", sa.String(150), unique=True, nullable=True),
        sa.Column("telefono", sa.String(30), nullable=True),
        sa.Column("cargo", sa.String(100), nullable=True),
        sa.Column("area", sa.String(100), nullable=True),
        sa.Column("activo", sa.Boolean, nullable=True, server_default="true"),
        sa.Column(
            "fecha_creacion", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=True,
        ),
        sa.Column(
            "fecha_actualizacion", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=True,
        ),
    )

    # --- rostros ---
    op.create_table(
        "rostros",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False, index=True),
        sa.Column(
            "empleado_id", UUID(as_uuid=True),
            sa.ForeignKey("empleados.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("ruta_imagen", sa.String(255), nullable=True),
        sa.Column("vector_facial", JSON, nullable=False),
        sa.Column(
            "fecha_registro", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=False,
        ),
    )
    op.create_index("ix_rostros_empleado_id", "rostros", ["empleado_id"])

    # --- asistencias ---
    op.create_table(
        "asistencias",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False, index=True),
        sa.Column(
            "empleado_id", UUID(as_uuid=True),
            sa.ForeignKey("empleados.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("hora_entrada", sa.DateTime(timezone=True), nullable=True),
        sa.Column("hora_salida", sa.DateTime(timezone=True), nullable=True),
        sa.Column("horas_trabajadas", sa.Float, nullable=True),
        sa.Column("estado", sa.String(50), nullable=True),
        sa.Column("porcentaje_confianza", sa.Float, nullable=True),
        sa.Column(
            "fecha_registro", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=False,
        ),
    )
    op.create_index("ix_asistencias_empleado_id", "asistencias", ["empleado_id"])


def downgrade() -> None:
    op.drop_table("asistencias")
    op.drop_table("rostros")
    op.drop_table("empleados")
