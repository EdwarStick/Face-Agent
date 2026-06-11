"""drop marcaciones table

Revision ID: 1803fadc9b9f
Revises: 001_create_marcaciones
Create Date: 2026-06-09 14:55:23.278925
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '1803fadc9b9f'
down_revision: Union[str, None] = '001_create_marcaciones'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index('ix_marcaciones_empleado_id', table_name='marcaciones')
    op.drop_index('ix_marcaciones_id', table_name='marcaciones')
    op.drop_table('marcaciones')


def downgrade() -> None:
    op.create_table(
        'marcaciones',
        sa.Column('empleado_id', sa.UUID(), autoincrement=False, nullable=False),
        sa.Column('fecha_marcacion', sa.DateTime(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
        sa.Column('tipo', sa.VARCHAR(length=10), autoincrement=False, nullable=False),
        sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
        sa.ForeignKeyConstraint(['empleado_id'], ['empleados.id'], name='marcaciones_empleado_id_fkey'),
        sa.PrimaryKeyConstraint('id', name='marcaciones_pkey')
    )
    op.create_index('ix_marcaciones_id', 'marcaciones', ['id'], unique=False)
    op.create_index('ix_marcaciones_empleado_id', 'marcaciones', ['empleado_id'], unique=False)
