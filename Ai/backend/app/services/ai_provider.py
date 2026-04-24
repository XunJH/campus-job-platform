import os
from ..core.config import settings

USE_MOCK = os.getenv("USE_MOCK", str(getattr(settings, "USE_MOCK", True))).lower() == "true"

if USE_MOCK:
    # 模拟模式：统一使用 Gemini 模拟服务
    from .gemini_service import GeminiService
    _ai_service = GeminiService()
else:
    AI_PROVIDER = os.getenv("AI_PROVIDER", getattr(settings, "AI_PROVIDER", "kimi")).lower()

    if AI_PROVIDER == "kimi":
        from .kimi_service import KimiService
        _ai_service = KimiService()
    elif AI_PROVIDER == "deepseek":
        from .deepseek_service import DeepSeekService
        _ai_service = DeepSeekService()
    else:
        from .gemini_service import GeminiService
        _ai_service = GeminiService()
