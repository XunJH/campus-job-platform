"""
项目配置模块
集中管理所有配置项
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """
    项目配置类

    使用pydantic_settings管理配置，好处是：
    1. 可以从环境变量读取配置
    2. 有默认值，不用担心漏填
    3. 类型检查，避免配置错误
    """

    # 应用基本信息
    APP_NAME: str = "校园智能兼职平台 - AI招聘助手"
    DEBUG: bool = False

    # AI 提供商选择: kimi | deepseek | gemini
    AI_PROVIDER: str = "kimi"

    # Kimi API配置（Moonshot）
    KIMI_API_KEY: str = "your-kimi-api-key"

    # DeepSeek API配置（推荐使用，免费额度高）
    DEEPSEEK_API_KEY: str = "your-deepseek-api-key"

    # Gemini API配置（可选）
    GEMINI_API_KEY: str = "your-api-key-here"

    # 是否使用模拟模式（没有API密钥时设为true）
    USE_MOCK: bool = True

    # 数据库配置（等会可能会用到）
    DATABASE_URL: str = "sqlite:///./campus_parttime.db"

    # CORS配置（允许前端访问）
    CORS_ORIGINS: list = ["http://localhost:4200", "http://localhost:4202", "http://localhost:4204", "http://localhost:8000"]

    class Config:
        env_file = ".env"  # 从.env文件读取配置


# 创建全局配置实例
settings = Settings()
