"""
Bhoomi Suraksha — Application Configuration
Loads settings from environment variables / .env file.
"""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    app_name: str = "Bhoomi Suraksha"
    app_env: str = "development"
    app_debug: bool = True

    # Database
    database_url: str = "sqlite+aiosqlite:///./propverify.db"

    # Gemini AI
    gemini_api_key: str = ""

    # Google Cloud Vision (OCR)
    google_application_credentials: str = ""

    # JWT Auth
    jwt_secret_key: str = "change-this-secret-key-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # File Uploads
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 20

    # Razorpay (optional)
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""

    @property
    def upload_path(self) -> Path:
        path = Path(self.upload_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
