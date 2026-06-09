import uuid
from datetime import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy import ForeignKey, String, DateTime, Float
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Mapped, mapped_column, relationship
# pyrefly: ignore [missing-import]
from sqlalchemy.dialects.postgresql import UUID
# pyrefly: ignore [missing-import]
from sqlalchemy.sql import func
from app.db.base import Base


class Asistencia(Base):
    __tablename__ = "asistencias"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    empleado_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("empleados.id"), nullable=False
    )
    hora_entrada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    hora_salida: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    horas_trabajadas: Mapped[float | None] = mapped_column(Float)
    estado: Mapped[str | None] = mapped_column(String(50))
    porcentaje_confianza: Mapped[float | None] = mapped_column(Float)
    fecha_registro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    empleado = relationship("Empleado", back_populates="asistencias")
