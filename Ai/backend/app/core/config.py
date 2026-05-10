"""
项目配置模块
集中管理 AI backend 的环境配置。
"""

from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "校园智能兼职平台 - AI 招聘助手"
    DEBUG: bool = False

    AI_PROVIDER: str = "kimi"
    KIMI_API_KEY: str = "your-kimi-api-key"
    DEEPSEEK_API_KEY: str = "your-deepseek-api-key"
    GEMINI_API_KEY: str = "your-api-key-here"
    USE_MOCK: bool = True

    DATABASE_URL: str = "sqlite:///./campus_parttime.db"
    CAMPUS_JOB_API_URL: str = "http://localhost:3001/api/v1"
    AI_INTERNAL_TOKEN: str = "campus-job-ai-internal"
    CORS_ORIGINS: str = "http://localhost:4200,http://localhost:4202,http://localhost:4204,http://localhost:8000"

    @property
    def cors_origins(self) -> List[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(',')
            if origin.strip()
        ]

    class Config:
        env_file = ".env"


settings = Settings()
