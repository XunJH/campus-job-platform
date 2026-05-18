"""
Kimi (Moonshot) service using the OpenAI-compatible API.
"""

from __future__ import annotations

import json
import os
from typing import Optional

from openai import OpenAI

from ..core.config import settings


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

        if not api_key or api_key == "your-kimi-api-key":
            print("[WARNING] KIMI_API_KEY not configured.")
            print("          Please set your API key in .env file")
            return

        try:
            self._client = OpenAI(api_key=api_key, base_url="https://api.moonshot.cn/v1")
            print(f"[OK] Kimi API configured successfully (model={self._model})")
        except Exception as error:
            print(f"[ERROR] Kimi API configuration failed: {error}")

    @property
    def model(self) -> str:
        return getattr(self, "_model", "moonshot-v1-auto")

    def generate_text(self, prompt: str, temperature: float = 0.7) -> str:
        if not self._client:
            raise ValueError("Kimi API not configured")

        try:
            response = self._client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=getattr(self, "_max_tokens", 1024),
            )
            return response.choices[0].message.content
        except Exception as error:
            raise RuntimeError(f"Kimi API call failed: {error}") from error

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
            raise ValueError(f"无法解析响应中的 JSON: {response_text}")

    def chat(self, messages: list, temperature: float = 0.7) -> str:
        if not self._client:
            raise ValueError("Kimi API not configured")

        try:
            response = self._client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=getattr(self, "_chat_max_tokens", 1200),
            )
            return response.choices[0].message.content
        except Exception as error:
            raise RuntimeError(f"Kimi API call failed: {error}") from error


kimi_service = KimiService()
