"""
SQLAlchemy ORM model for the 'horarios' table.

Patrón de herencia global/específico:
  - es_global=True,  empleado_id=NULL  → Horario base de empresa
  - es_global=False, empleado_id=UUID  → Horario específico del empleado
                                         (sobrescribe el global para ese día)

La resolución de prioridad la implementa:
    app/horarios/service.resolver_horario_efectivo()
"""

import uuid
from datetime import time, datetime
from sqlalchemy import (
    ForeignKey, Integer, Time, Boolean, DateTime, UniqueConstraint,
    CheckConstraint, func, text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class Horario(Base):
    __tablename__ = "horarios"

    __table_args__ = (
        # Integridad: global ↔ sin empleado_id | específico ↔ con empleado_id
        CheckConstraint(
            "(es_global = TRUE AND empleado_id IS NULL) OR "
            "(es_global = FALSE AND empleado_id IS NOT NULL)",
            name="ck_horario_global_o_especifico",
        ),
        # Nota: los índices únicos parciales se crean en la migración 004
        # porque SQLAlchemy no soporta índices parciales con WHERE en __table_args__
        # de forma portable. Ver: alembic/versions/004_horarios_herencia.py
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )

    # NULL → horario global de empresa | UUID → horario específico del empleado
    empleado_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("empleados.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # 0=Lunes … 6=Domingo
    dia_semana: Mapped[int] = mapped_column(Integer, nullable=False)
    hora_entrada: Mapped[time] = mapped_column(Time, nullable=False)
    hora_salida: Mapped[time] = mapped_column(Time, nullable=False)

    # Minutos de gracia antes de marcar tardanza (default 15)
    tolerancia_minutos: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("15")
    )

    # TRUE = horario global de empresa; FALSE = específico del empleado
    es_global: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )

    activo: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )

    # Auditoría
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=True
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        onupdate=func.now(), nullable=True
    )

    empleado = relationship("Empleado", backref="horarios")
