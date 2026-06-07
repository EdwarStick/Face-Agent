"""
SQLAlchemy ORM model for the 'empleados' table.
Matches existing database schema:
- UUID primary key via UUIDMixin
- Spanish audit column names (fecha_creacion, fecha_actualizacion) mapped to created_at/updated_at
- Non-nullable second name and second surname fields with empty string defaults
"""
from datetime import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy import Boolean, String, DateTime, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDMixin


class Empleado(Base, UUIDMixin):
    __tablename__ = "empleados"

    codigo_empleado: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    prim_nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    seg_nombres: Mapped[str] = mapped_column(String(100), default="", server_default="", nullable=False)
    prim_apellido: Mapped[str] = mapped_column(String(100), nullable=False)
    seg_apellido: Mapped[str] = mapped_column(String(100), default="", server_default="", nullable=False)
    correo: Mapped[str | None] = mapped_column(String(150), unique=True, nullable=True)
    telefono: Mapped[str | None] = mapped_column(String(30), nullable=True)
    cargo: Mapped[str | None] = mapped_column(String(100), nullable=True)
    area: Mapped[str | None] = mapped_column(String(100), nullable=True)
    activo: Mapped[bool | None] = mapped_column(Boolean, default=True, server_default="true", nullable=True)

    # Audit fields mapped to Spanish column names in database
    created_at: Mapped[datetime | None] = mapped_column(
        "fecha_creacion",
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=True,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        "fecha_actualizacion",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=True,
    )

    rostros = relationship("Rostro", back_populates="empleado")

