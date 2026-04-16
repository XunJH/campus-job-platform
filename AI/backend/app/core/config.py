"""
项目配置模块
集中管理所有配置项
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # 应用基本信息
    APP_NAME: str = "校园智能兼职平台 - AI招聘助手"
    DEBUG: bool = True

    # DeepSeek API 密钥（从 .env 文件读取）
    DEEPSEEK_API_KEY: str = ""

    # 是否使用模拟模式（不调用真实AI接口）
    USE_MOCK: bool = False

    # 数据库配置
    DATABASE_URL: str = "sqlite:///./campus_parttime.db"

    # CORS配置（开发阶段允许所有来源）
    CORS_ORIGINS: list = ["*"]


# 创建全局配置实例
settings = Settings()
