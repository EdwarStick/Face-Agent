import uuid
from datetime import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy import ForeignKey, String, JSON, DateTime
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Mapped, mapped_column, relationship
# pyrefly: ignore [missing-import]
from sqlalchemy.dialects.postgresql import UUID
# pyrefly: ignore [missing-import]
from sqlalchemy.sql import func
from app.db.base import Base


class Rostro(Base): 
    __tablename__ = "rostros"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    empleado_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("empleados.id"),
        nullable=False
    )
    ruta_imagen: Mapped[str | None] = mapped_column(String(255))
    vector_facial: Mapped[list] = mapped_column(JSON, nullable=False)
    fecha_registro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    empleado = relationship("Empleado", back_populates="rostros")