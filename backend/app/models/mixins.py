"""
FaceAttendance AI — Base Model Mixin
======================================
Provides common columns (id, created_at, updated_at) for all ORM models.
Inherit from TimestampMixin alongside Base to get these columns automatically.

Usage:
    class Employee(Base, TimestampMixin):
        __tablename__ = "employees"
        ...
"""

import uuid
from datetime import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy import DateTime, func
# pyrefly: ignore [missing-import]
from sqlalchemy.dialects.postgresql import UUID     
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    """Adds created_at and updated_at audit columns to any model."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class UUIDMixin:
    """Adds a UUID primary key to any model."""

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
