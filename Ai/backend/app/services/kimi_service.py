"""
Kimi (Moonshot) API 服务
使用 OpenAI 兼容格式调用 Kimi Chat API
"""
import os
import json
from typing import Optional
from openai import OpenAI
from ..core.config import settings


class KimiService:
    """Kimi API 服务封装类"""

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
        """配置 Kimi API"""
        api_key = os.getenv("KIMI_API_KEY") or getattr(settings, "KIMI_API_KEY", "")

        if not api_key or api_key == "your-kimi-api-key":
            print("[WARNING] KIMI_API_KEY not configured.")
            print("          Please set your API key in .env file")
            return

        try:
            self._client = OpenAI(
                api_key=api_key,
                base_url="https://api.moonshot.cn/v1"
            )
            print("[OK] Kimi API configured successfully")
        except Exception as e:
            print(f"[ERROR] Kimi API configuration failed: {e}")

    def generate_text(self, prompt: str, temperature: float = 0.7) -> str:
        if not self._client:
            raise ValueError("Kimi API not configured")

        try:
            response = self._client.chat.completions.create(
                model="moonshot-v1-8k",
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=2048,
            )
            return response.choices[0].message.content
        except Exception as e:
            raise RuntimeError(f"Kimi API call failed: {str(e)}")

    def generate_structured_response(self, prompt: str, response_format: dict, temperature: float = 0.7) -> dict:
        full_prompt = f"""{prompt}

请以 JSON 格式返回，格式要求：
{json.dumps(response_format, ensure_ascii=False, indent=2)}

只返回 JSON，不要有其他内容。"""

        response_text = self.generate_text(full_prompt, temperature)

        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r"\{.*\}|\[.*\]", response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            raise ValueError(f"无法解析响应为 JSON: {response_text}")

    def chat(self, messages: list, temperature: float = 0.7) -> str:
        if not self._client:
            raise ValueError("Kimi API not configured")

        try:
            response = self._client.chat.completions.create(
                model="moonshot-v1-8k",
                messages=messages,
                temperature=temperature,
            )
            return response.choices[0].message.content
        except Exception as e:
            raise RuntimeError(f"Kimi API call failed: {str(e)}")


# 全局单例
kimi_service = KimiService()
