from typing import List
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from pathlib import Path

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str 
    
    # Securitytr 
    SECRET_KEY: str 
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Startup
    # Creating/checking tables on every reload can be very slow with remote DBs.
    # Set `INIT_DB_ON_STARTUP=0` to skip init_db during app startup.
    INIT_DB_ON_STARTUP: bool = True
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "*"]

    # Email (optional)
    # Disabled by default to avoid accidental outbound mail.
    EMAIL_ENABLED: bool = False
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM: str | None = None
    SMTP_STARTTLS: bool = True

    _backend_dir = Path(__file__).resolve().parents[2]

    model_config = ConfigDict(
        # Pydantic loads env files in order and later files override earlier ones.
        # Keep `.env` as the default (e.g. remote) and let `.env.local` override for offline/local dev.
        env_file=(_backend_dir / ".env", _backend_dir / ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
