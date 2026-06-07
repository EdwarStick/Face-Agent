import uuid
# pyrefly: ignore [missing-import]
from sqlalchemy import ForeignKey, String, JSON
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Rostro(Base, TimestampMixin):
    __tablename__ = "rostros"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    empleado_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empleados.id"), nullable=False)
    ruta_imagen: Mapped[str | None] = mapped_column(String(255))
    vector_facial: Mapped[list] = mapped_column(JSON, nullable=False)

    empleado = relationship("Empleado", back_populates="rostros")
