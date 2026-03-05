"""
Configuration module
"""

import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

class Settings:
    """Application settings from environment variables"""

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://user:password@localhost:5432/backoffice_odonto"
    )
    SQLALCHEMY_ECHO: bool = os.getenv("SQLALCHEMY_ECHO", "False") == "True"

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))
    ACCESS_TOKEN_EXPIRE_DELTA: timedelta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    # CORS
    ALLOWED_ORIGINS: list = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:8000"
    ).split(",")
    ALLOWED_HOSTS: list = os.getenv(
        "ALLOWED_HOSTS",
        "localhost,127.0.0.1"
    ).split(",")

    # File Upload
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", 10485760))  # 10MB in bytes
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    ALLOWED_EXTENSIONS: list = os.getenv(
        "ALLOWED_EXTENSIONS",
        "pdf,jpg,jpeg,png,doc,docx"
    ).split(",")

    # Email
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SENDER_EMAIL: str = os.getenv("SENDER_EMAIL", "noreply@dentalcarepro.com")
    SENDER_NAME: str = os.getenv("SENDER_NAME", "DentalCare Pro")

    # Pagination defaults
    DEFAULT_PAGE: int = 1
    DEFAULT_LIMIT: int = 10
    MAX_LIMIT: int = 100

    class Config:
        env_file = ".env"

settings = Settings()

_PLACEHOLDER = "your_super_secret_key_change_in_production"
if not settings.SECRET_KEY or settings.SECRET_KEY == _PLACEHOLDER:
    raise ValueError(
        "SECRET_KEY no está configurada o usa el valor por defecto inseguro. "
        "Genera una clave con: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
    )
del _PLACEHOLDER
