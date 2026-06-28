from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Green Mobility Incentive Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@postgres:5432/carbon_db"

    # JWT
    SECRET_KEY: str = "super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # AI
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    AI_PROVIDER: str = "MOCK"  # OPENAI | CLAUDE | MOCK

    # External APIs
    GOONG_API_KEY: Optional[str] = None  # for distance calculation

    @field_validator("DATABASE_URL")
    @classmethod
    def _force_asyncpg_driver(cls, v: str) -> str:
        """Railway (and others) provide a libpq-style URL like
        `postgresql://...` or `postgres://...`. SQLAlchemy's async engine
        needs the asyncpg driver, so normalize the scheme here."""
        if v.startswith("postgres://"):
            v = "postgresql://" + v[len("postgres://"):]
        if v.startswith("postgresql://"):
            v = "postgresql+asyncpg://" + v[len("postgresql://"):]
        # asyncpg rejects libpq's `sslmode` query param; drop it if present.
        if "sslmode=" in v:
            from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

            parts = urlsplit(v)
            query = [(k, val) for k, val in parse_qsl(parts.query) if k != "sslmode"]
            v = urlunsplit(parts._replace(query=urlencode(query)))
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()