"""
DeepSeek API 服务
使用 OpenAI 兼容格式调用 DeepSeek Chat API
"""
import os
import json
from typing import Optional
from openai import OpenAI
from ..core.config import settings


class DeepSeekService:
    """DeepSeek API 服务封装类"""

    _instance: Optional["DeepSeekService"] = None
    _initialized: bool = False
    _client: Optional[OpenAI] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not DeepSeekService._initialized:
            self._configure()
            DeepSeekService._initialized = True

    def _configure(self):
        """配置 DeepSeek API"""
        api_key = os.getenv("DEEPSEEK_API_KEY") or settings.DEEPSEEK_API_KEY

        if not api_key or api_key == "your-deepseek-api-key":
            print("[WARNING] DEEPSEEK_API_KEY not configured. Using mock mode.")
            print("          Please set your API key in .env file")
            return

        try:
            # DeepSeek API 端点
            self._client = OpenAI(
                api_key=api_key,
                base_url="https://api.deepseek.com"  # DeepSeek 官方 API 地址
            )
            print("[OK] DeepSeek API configured successfully")
        except Exception as e:
            print(f"[ERROR] DeepSeek API configuration failed: {e}")

    def generate_text(self, prompt: str, temperature: float = 0.7) -> str:
        """
        生成文本

        Args:
            prompt: 提示词
            temperature: 温度参数 (0-1)，越低越确定，越高越随机

        Returns:
            生成的文本
        """
        if not self._client:
            raise ValueError("DeepSeek API not configured")

        try:
            response = self._client.chat.completions.create(
                model="deepseek-chat",  # DeepSeek V3 模型
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=2048,
            )
            return response.choices[0].message.content
        except Exception as e:
            raise RuntimeError(f"DeepSeek API call failed: {str(e)}")

    def generate_structured_response(self, prompt: str, response_format: dict, temperature: float = 0.7) -> dict:
        """
        生成结构化响应（JSON格式）

        Args:
            prompt: 提示词
            response_format: 期望的响应格式描述
            temperature: 温度参数

        Returns:
            解析后的响应字典
        """
        # 构建提示词，要求返回 JSON
        full_prompt = f"""{prompt}

请以 JSON 格式返回，格式要求：
{json.dumps(response_format, ensure_ascii=False, indent=2)}

只返回 JSON，不要有其他内容。"""

        response_text = self.generate_text(full_prompt, temperature)

        # 解析 JSON
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            # 尝试提取 JSON 部分
            import re
            json_match = re.search(r"\{.*\}|\[.*\]", response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            raise ValueError(f"无法解析响应为 JSON: {response_text}")

    def chat(self, messages: list, temperature: float = 0.7) -> str:
        """
        多轮对话

        Args:
            messages: 对话历史 [{"role": "user", "content": "..."}, ...]
            temperature: 温度参数

        Returns:
            AI 回复
        """
        if not self._client:
            raise ValueError("DeepSeek API not configured")

        try:
            response = self._client.chat.completions.create(
                model="deepseek-chat",
                messages=messages,
                temperature=temperature,
            )
            return response.choices[0].message.content
        except Exception as e:
            raise RuntimeError(f"DeepSeek API call failed: {str(e)}")


# 全局单例
deepseek_service = DeepSeekService()
