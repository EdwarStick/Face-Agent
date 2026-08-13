"""
FaceAttendance AI — Core Configuration
=======================================
Uses Pydantic Settings (v2) to load and validate all environment variables.
A single Settings instance is created once and shared across the application
via the `get_settings()` dependency.
"""

# pyrefly: ignore [missing-import]
from functools import lru_cache
from typing import List
# pyrefly: ignore [missing-import]
from pydantic import field_validator
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Application ───────────────────────────────────────────────────────────
    app_name: str = "FaceAttendance AI"
    app_version: str = "0.1.0"
    app_env: str = "development"
    debug: bool = True

    # ── API ───────────────────────────────────────────────────────────────────
    api_v1_prefix: str = "/api/v1"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 30

    # ── Database ──────────────────────────────────────────────────────────────
    postgres_server: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "postgres"
    postgres_password: str = ""
    postgres_db: str = "faceattendance"

    @property
    def database_url(self) -> str:
        """Assembles the PostgreSQL connection URL from individual components."""
        url = (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_server}:{self.postgres_port}/{self.postgres_db}"
        )
        if self.postgres_server not in ("localhost", "127.0.0.1"):
            url += "?sslmode=require"
        return url

    @property
    def async_database_url(self) -> str:
        """Async variant for future use with asyncpg."""
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_server}:{self.postgres_port}/{self.postgres_db}"
        )

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:5174"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, value: str) -> str:
        """Kept as-is; parsed into a list by the property below."""
        return value

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    # ── Groq AI ───────────────────────────────────────────────────────────────
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    # Modelo dedicado para el agente de chat con Function Calling.
    # llama-3.3-70b-versatile tiene mejor soporte de tool_use que el modelo rápido.
    groq_chat_model: str = "llama-3.3-70b-versatile"

    # ── Azure AI ──────────────────────────────────────────────────────────────
    azure_subscription_key: str = ""
    azure_endpoint: str = ""
    azure_region: str = ""

    # ── Face Recognition ──────────────────────────────────────────────────────
    face_detection_model: str = "opencv"
    # Canonical recognition model — must match the embeddings stored in DB.
    # Changing this requires re-enrolling ALL employee faces.
    face_recognition_model: str = "Facenet512"
    # Canonical match threshold read by the recognition pipeline.
    # Default 0.65 (65% similarity) for Facenet512 + cosine.
    # Note: Cosine similarity threshold >= 0.65 corresponds to Cosine distance <= 0.35.
    face_match_threshold: float = 0.65
    # Legacy field — kept for backward-compat with older .env files.
    face_similarity_threshold: float = 0.40

    # ── Image Quality Validation ───────────────────────────────────────────────
    # Umbrales para FaceQualityValidator (quality_validator.py).
    # Ajusta los valores en .env sin necesidad de tocar el código.
    #
    # image_min_blur_score : Varianza mínima de Laplacian.
    #   < 80  → imagen borrosa rechazada.  Sube si recibes falsos rechazos en
    #           entornos con buena cámara; baja en cámaras de baja resolución.
    #
    # image_min_brightness : Luminancia mínima (canal L de LAB, escala 0-255).
    #   < 40  → subexposición — imagen demasiado oscura.
    #
    # image_max_brightness : Luminancia máxima (canal L de LAB, escala 0-255).
    #   > 220 → sobreexposición — imagen saturada de luz.
    image_min_blur_score: float = 80.0
    image_min_brightness: float = 40.0
    image_max_brightness: float = 220.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """
    Returns a cached Settings instance.
    Use as a FastAPI dependency: `settings: Settings = Depends(get_settings)`
    """
    return Settings()


# Module-level convenience alias
settings: Settings = get_settings()
