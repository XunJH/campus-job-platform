"""AI backend configuration."""

from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "校园智能招聘平台 - AI 招聘助手"
    DEBUG: bool = False

    AI_PROVIDER: str = "kimi"
    KIMI_API_KEY: str = "your-kimi-api-key"
    KIMI_MODEL: str = "moonshot-v1-auto"
    KIMI_MAX_TOKENS: int = 1024
    KIMI_CHAT_MAX_TOKENS: int = 1200
    DEEPSEEK_API_KEY: str = "your-deepseek-api-key"
    GEMINI_API_KEY: str = "your-gemini-api-key"

    # Keep mock enabled by default for local development, but expose the
    # current runtime mode so the frontend can show whether it is demo data.
    USE_MOCK: bool = True
    EXPOSE_RUNTIME_METADATA: bool = True

    DATABASE_URL: str = "sqlite:///./campus_parttime.db"
    CAMPUS_JOB_API_URL: str = "http://localhost:3001/api/v1"
    AI_INTERNAL_TOKEN: str = "campus-job-ai-internal"
    CORS_ORIGINS: str = (
        "http://localhost:4200,"
        "http://localhost:4202,"
        "http://localhost:4204,"
        "http://localhost:8000"
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
