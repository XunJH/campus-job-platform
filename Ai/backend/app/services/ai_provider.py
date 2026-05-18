"""Runtime provider selection for AI services."""

from __future__ import annotations

import os
from typing import Any, Dict, Tuple

from ..core.config import settings
from .deepseek_service import DeepSeekService
from .gemini_service import GeminiService
from .kimi_service import KimiService


def _bool_env(name: str, fallback: bool) -> bool:
    return os.getenv(name, str(fallback)).strip().lower() == "true"


def _resolve_provider() -> Tuple[Any, Dict[str, Any]]:
    requested_provider = os.getenv("AI_PROVIDER", settings.AI_PROVIDER).strip().lower() or "kimi"
    use_mock_requested = _bool_env("USE_MOCK", settings.USE_MOCK)

    if use_mock_requested:
        return GeminiService(), {
            "mode": "mock",
            "requested_provider": requested_provider,
            "active_provider": "gemini-mock",
            "configured": True,
            "fallback_active": False,
            "display_label": "演示模式（Gemini Mock）",
            "warning": "当前使用演示模式，结果适合联调和答辩演示，不代表真实模型输出。",
        }

    if requested_provider == "kimi":
        service = KimiService()
        if getattr(service, "_client", None):
            model_name = getattr(service, "model", "moonshot-v1-auto")
            return service, {
                "mode": "live",
                "requested_provider": requested_provider,
                "active_provider": "kimi",
                "configured": True,
                "fallback_active": False,
                "display_label": f"Kimi 实时模型（{model_name}）",
                "model": model_name,
                "warning": "",
            }

        return GeminiService(), {
            "mode": "mock",
            "requested_provider": requested_provider,
            "active_provider": "gemini-mock",
            "configured": False,
            "fallback_active": True,
            "display_label": "演示模式（Kimi 未配置）",
            "warning": "已请求使用 Kimi，但服务端未检测到有效的 KIMI_API_KEY，系统已自动回退到演示模式。",
        }

    if requested_provider == "deepseek":
        service = DeepSeekService()
        if getattr(service, "_client", None):
            return service, {
                "mode": "live",
                "requested_provider": requested_provider,
                "active_provider": "deepseek",
                "configured": True,
                "fallback_active": False,
                "display_label": "DeepSeek 实时模型",
                "warning": "",
            }

        return GeminiService(), {
            "mode": "mock",
            "requested_provider": requested_provider,
            "active_provider": "gemini-mock",
            "configured": False,
            "fallback_active": True,
            "display_label": "演示模式（DeepSeek 未配置）",
            "warning": "已请求使用 DeepSeek，但服务端未检测到有效的 DEEPSEEK_API_KEY，系统已自动回退到演示模式。",
        }

    if requested_provider == "gemini":
        return GeminiService(), {
            "mode": "mock",
            "requested_provider": requested_provider,
            "active_provider": "gemini-mock",
            "configured": False,
            "fallback_active": True,
            "display_label": "演示模式（Gemini Mock）",
            "warning": "当前仓库中的 GeminiService 为演示实现，生产或答辩场景建议切换到已配置好的实时模型。",
        }

    return GeminiService(), {
        "mode": "mock",
        "requested_provider": requested_provider,
        "active_provider": "gemini-mock",
        "configured": False,
        "fallback_active": True,
        "display_label": "演示模式（未知模型已回退）",
        "warning": f"未识别的 AI_PROVIDER={requested_provider}，系统已自动回退到演示模式。",
    }


_ai_service, _runtime_status = _resolve_provider()


def is_mock_mode() -> bool:
    return _runtime_status.get("mode") == "mock"


def get_runtime_status() -> Dict[str, Any]:
    return dict(_runtime_status)
