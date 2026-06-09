"""
FaceAttendance AI — Logging Configuration
==========================================
Loguru-based structured logging with environment-aware formatting.
Call `setup_logging()` once during application startup.
"""

import sys
from app.core.config import settings    
# pyrefly: ignore [missing-import]
from loguru import logger         


def setup_logging() -> None:
    """Configure Loguru for the application."""
    logger.remove()  # Remove the default handler

    log_level = "DEBUG" if settings.debug else "INFO"
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> — "
        "<level>{message}</level>"
    )

    logger.add(sys.stdout, level=log_level, format=log_format, colorize=True)

    if settings.app_env == "production":
        logger.add(
            "logs/app.log",
            level="INFO",
            format=log_format,
            rotation="10 MB",
            retention="30 days",
            compression="zip",
        )

    logger.info(
        f"Logging initialised | env={settings.app_env} | level={log_level}"
    )
