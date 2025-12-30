"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "GRIMLOCK API"
    debug: bool = False
    api_prefix: str = "/api"

    # Database
    database_url: str = "postgresql+asyncpg://grimlock:grimlock@localhost:5432/grimlock"

    # JWT
    jwt_secret: str = "change-me-in-production-min-32-chars"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    oauth_redirect_uri: str = "http://localhost:8000/auth/callback"

    # n8n Integration
    n8n_webhook_base_url: str = "https://im4tlai.app.n8n.cloud/webhook"

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",        # Vite dev server
        "https://grimlockfactory.netlify.app",
        "https://54.225.171.108",       # For direct access (if needed)
    ]

    # Build logs (for migration)
    build_logs_dir: str = "/home/ubuntu/projects/grimlock/build-logs"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
