"""
FaceAttendance AI — SQLAlchemy Database Session
================================================
Provides:
  - engine      : synchronous SQLAlchemy engine
  - SessionLocal : session factory
  - Base        : declarative base for all ORM models
  - get_db()    : FastAPI dependency that yields a DB session per request
"""

from typing import Generator

from loguru import logger
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


# ── Declarative Base ──────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """
    All SQLAlchemy ORM models must inherit from this class.
    Imported in each model file: `from app.db.base import Base`
    """
    pass


# ── Engine ────────────────────────────────────────────────────────────────────
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,        # Re-checks connections before use (avoids stale sockets)
    pool_size=10,              # Number of persistent connections
    max_overflow=20,           # Extra connections allowed beyond pool_size
    echo=settings.debug,       # Log SQL statements in debug mode
)


# ── Session Factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,    # Prevents lazy-load errors after commit
)


# ── Optional: Log slow queries ────────────────────────────────────────────────
@event.listens_for(engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):  # noqa: E501
    conn.info.setdefault("query_start_time", []).append(None)


# ── FastAPI Dependency ────────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """
    Yields a SQLAlchemy session and guarantees it is closed after the request,
    even if an exception is raised.

    Usage in route:
        db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ── Database Connectivity Check ───────────────────────────────────────────────
def check_db_connection() -> bool:
    """
    Performs a lightweight connectivity check against the database.
    Called during application startup to fail fast on misconfiguration.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection established successfully.")
        return True
    except Exception as exc:
        logger.error(f"Database connection failed: {exc}")
        return False
