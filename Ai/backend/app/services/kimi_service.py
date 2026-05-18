"""Kimi (Moonshot) service with fast fallback for defense/demo stability."""

from __future__ import annotations

import json
import os
from typing import Optional

from openai import OpenAI

from ..core.config import settings
from .gemini_service import GeminiService


class KimiService:
    """Singleton wrapper around the Kimi API client."""

    _instance: Optional["KimiService"] = None
    _initialized: bool = False
    _client: Optional[OpenAI] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not KimiService._initialized:
            self._configure()
            KimiService._initialized = True

    def _configure(self):
        api_key = os.getenv("KIMI_API_KEY") or getattr(settings, "KIMI_API_KEY", "")
        self._model = os.getenv("KIMI_MODEL") or getattr(settings, "KIMI_MODEL", "moonshot-v1-auto")
        self._max_tokens = int(os.getenv("KIMI_MAX_TOKENS") or getattr(settings, "KIMI_MAX_TOKENS", 1024))
        self._chat_max_tokens = int(
            os.getenv("KIMI_CHAT_MAX_TOKENS") or getattr(settings, "KIMI_CHAT_MAX_TOKENS", 1200)
        )
        self._timeout_seconds = float(
            os.getenv("KIMI_TIMEOUT_SECONDS") or getattr(settings, "KIMI_TIMEOUT_SECONDS", 12)
        )
        self._fallback_service = GeminiService()

        if not api_key or api_key == "your-kimi-api-key":
            print("[WARNING] KIMI_API_KEY not configured.")
            print("          Please set your API key in .env file")
            return

        try:
            self._client = OpenAI(
                api_key=api_key,
                base_url="https://api.moonshot.cn/v1",
                timeout=self._timeout_seconds,
            )
            print(
                f"[OK] Kimi API configured successfully "
                f"(model={self._model}, timeout={self._timeout_seconds}s)"
            )
        except Exception as error:
            print(f"[ERROR] Kimi API configuration failed: {error}")

    @property
    def model(self) -> str:
        return getattr(self, "_model", "moonshot-v1-auto")

    def generate_text(self, prompt: str, temperature: float = 0.7) -> str:
        if not self._client:
            return self._fallback_service.generate_text(prompt, temperature)

        try:
            response = self._client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=getattr(self, "_max_tokens", 1024),
            )
            return response.choices[0].message.content
        except Exception as error:
            print(f"[WARNING] Kimi generate_text failed, fallback to mock service: {error}")
            return self._fallback_service.generate_text(prompt, temperature)

    def generate_structured_response(
        self,
        prompt: str,
        response_format: dict,
        temperature: float = 0.7,
    ) -> dict:
        full_prompt = f"""{prompt}

请以 JSON 格式返回，格式要求如下：
{json.dumps(response_format, ensure_ascii=False, indent=2)}

只返回 JSON，不要包含其他说明。"""

        response_text = self.generate_text(full_prompt, temperature)

        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            import re

            json_match = re.search(r"\{.*\}|\[.*\]", response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())

            print("[WARNING] Kimi structured response parse failed, fallback to mock service")
            return self._fallback_service.generate_structured_response(prompt, response_format, temperature)

    def chat(self, messages: list, temperature: float = 0.7) -> str:
        if not self._client:
            return self._fallback_service.chat(messages, temperature)

        try:
            response = self._client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=getattr(self, "_chat_max_tokens", 1200),
            )
            return response.choices[0].message.content
        except Exception as error:
            print(f"[WARNING] Kimi chat failed, fallback to mock service: {error}")
            return self._fallback_service.chat(messages, temperature)


kimi_service = KimiService()
