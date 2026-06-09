"""create marcaciones table

Revision ID: 001_create_marcaciones
Revises:
Create Date: 2026-06-09
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = "001_create_marcaciones"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "marcaciones",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            index=True,
        ),
        sa.Column(
            "empleado_id",
            UUID(as_uuid=True),
            sa.ForeignKey("empleados.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "fecha_marcacion",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("tipo", sa.String(10), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("marcaciones")
