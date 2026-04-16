"""
AI对话助手服务

实现智能对话助手，回答用户关于兼职的各种问题
"""

import os
from typing import List, Dict, Any
from ..core.config import settings
from ..models.ai_models import ChatMessage

USE_MOCK = os.getenv("USE_MOCK", str(settings.USE_MOCK)).lower() == "true"

if USE_MOCK:
    from ..services.gemini_service import GeminiService
    _ai_service = GeminiService()
else:
    from ..services.deepseek_service import DeepSeekService
    _ai_service = DeepSeekService()


class ChatAssistantService:
    """AI对话助手服务"""

    def __init__(self):
        self.system_prompt = """你是一个友善的校园兼职平台AI助手，名叫"小兼"。

【你的能力】
1. 回答用户关于兼职的各种问题
2. 帮用户分析适合自己的兼职类型
3. 提供简历优化建议
4. 提醒用户注意兼职安全
5. 解答平台使用问题

【你的性格】
- 亲切友善，像朋友一样聊天
- 专业但不呆板
- 善于用简单的语言解释复杂的问题
- 会主动关心用户

【安全准则】
- 不透露具体薪资数字（可以说范围）
- 不评价具体企业的好坏
- 发现疑似骗局会主动提醒

请用中文回答，每次回答控制在100字以内。"""

    def chat(
        self,
        user_id: str,
        message: str,
        history: List[ChatMessage] = None
    ) -> str:
        """
        处理用户对话，支持多轮上下文

        参数:
            user_id: 用户ID
            message: 用户发送的消息
            history: 历史消息列表

        返回:
            AI的回复文本
        """
        messages = [{"role": "system", "content": self.system_prompt}]

        if history:
            for h in history[-5:]:  # 只保留最近5轮，避免超出token限制
                messages.append({"role": h.role, "content": h.content})

        messages.append({"role": "user", "content": message})

        response = _ai_service.chat(messages)

        return response

    def analyze_intent(self, message: str) -> Dict[str, Any]:
        """识别用户消息意图，返回结构化分析结果"""
        prompt = f"""
请分析以下用户消息的意图，并返回JSON格式的结果。

用户消息："{message}"

意图类型：
- "greeting": 打招呼/问候
- "job_search": 找工作
- "skill_consult": 技能咨询
- "safety_consult": 安全咨询
- "platform_consult": 平台问题
- "resume_consult": 简历问题
- "other": 其他

另外判断情绪：
- "positive": 积极
- "neutral": 中性
- "negative": 消极/焦虑

请返回JSON格式：
{{
    "intent": "意图类型",
    "confidence": 0.9,
    "emotion": "情绪",
    "key_entities": ["关键词1", "关键词2"]
}}

confidence表示你对判断的信心程度（0-1）。
"""

        import re
        import json

        response = _ai_service.generate_text(
            prompt,
            temperature=0.3
        )

        # 从回复中提取JSON结果
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        # 解析失败时的默认返回
        return {
            "intent": "other",
            "confidence": 0.5,
            "emotion": "neutral",
            "key_entities": []
        }


# 创建全局实例
chat_assistant = ChatAssistantService()
