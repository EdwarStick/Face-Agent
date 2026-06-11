import uuid
from datetime import time
from sqlalchemy import ForeignKey, String, Time, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class Horario(Base):
    __tablename__ = "horarios"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    empleado_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("empleados.id"), nullable=False
    )
    dia_semana: Mapped[int] = mapped_column(Integer, nullable=False)
    hora_entrada: Mapped[time] = mapped_column(Time, nullable=False)
    hora_salida: Mapped[time] = mapped_column(Time, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    empleado = relationship("Empleado", backref="horarios")
