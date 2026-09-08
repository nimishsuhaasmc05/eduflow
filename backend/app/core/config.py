import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Ensure .env in backend directory and root workspace directory are loaded automatically
env_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
if os.path.exists(env_file_path):
    load_dotenv(env_file_path, override=True)

root_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env")
if os.path.exists(root_env_path) and root_env_path != env_file_path:
    load_dotenv(root_env_path, override=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Edu-Flow Affective Adaptive Learning System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "eduflow-super-secret-jwt-key-2026-affective-ai-closed-loop")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://eduflow_user:eduflow_secure_password_2026@localhost:5432/eduflow"
    )
    
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # AI & Generative Services (Gemini & OpenAI Abstraction)
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "gemini")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Zoom Meeting Integration Settings
    ZOOM_SDK_KEY: str = os.getenv("ZOOM_SDK_KEY", "eduflow_zoom_sdk_key_2026")
    ZOOM_SDK_SECRET: str = os.getenv("ZOOM_SDK_SECRET", "eduflow_zoom_sdk_secret_2026")
    ZOOM_ACCOUNT_ID: Optional[str] = os.getenv("ZOOM_ACCOUNT_ID", "")

    # Affective Vision Thresholds
    CONFUSION_THRESHOLD: float = 0.65
    DISTRACTION_THRESHOLD: float = 0.70
    BOREDOM_THRESHOLD: float = 0.60
    HIGH_COGNITIVE_LOAD_THRESHOLD: float = 0.75
    
    # Video Upload & Media Storage Settings
    MAX_VIDEO_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_VIDEO_UPLOAD_SIZE_MB", "500"))
    ALLOWED_VIDEO_EXTENSIONS: List[str] = [".mp4", ".webm", ".mov", ".avi"]
    MEDIA_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "media")

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    class Config:
        case_sensitive = True
        env_file = env_file_path
        extra = "ignore"

settings = Settings()
