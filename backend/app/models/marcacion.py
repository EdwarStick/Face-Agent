from datetime import datetime
import uuid
from sqlalchemy import ForeignKey, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
from app.models.mixins import UUIDMixin


class Marcacion(Base, UUIDMixin):
    __tablename__ = "marcaciones"

    empleado_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("empleados.id"), nullable=False, index=True
    )
    fecha_marcacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)

    empleado = relationship("Empleado", back_populates="marcaciones")
