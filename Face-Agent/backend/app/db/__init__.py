"""
app/db — Package init
Import all ORM models here so Alembic's autogenerate can detect them.
"""

# Base must always be imported first
from app.db.base import Base, engine, SessionLocal, get_db  # noqa: F401

# Import models as they are created, e.g.:
# from app.models.employee import Employee       # noqa: F401
# from app.models.attendance import Attendance   # noqa: F401

__all__ = ["Base", "engine", "SessionLocal", "get_db"]
