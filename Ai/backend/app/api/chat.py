"""
AI对话助手API路由
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from ..services.chat_assistant import chat_assistant
from ..models.ai_models import ChatMessage

router = APIRouter(prefix="/chat", tags=["AI对话助手"])


class ChatRequest(BaseModel):
    """对话请求"""
    user_id: str
    message: str
    history: List[ChatMessage] = []


class IntentRequest(BaseModel):
    """意图识别请求"""
    message: str


@router.post("/send")
async def send_message(request: ChatRequest):
    """
    发送消息，获取AI回复

    支持多轮对话，会自动维护对话上下文
    """
    try:
        response = chat_assistant.chat(
            user_id=request.user_id,
            message=request.message,
            history=request.history
        )

        return {
            "code": 200,
            "message": "success",
            "data": {
                "reply": response,
                "timestamp": None  # 实际应该返回时间戳
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/intent")
async def analyze_intent(request: IntentRequest):
    """
    意图识别

    分析用户消息的意图，用于分类处理
    """
    try:
        result = chat_assistant.analyze_intent(request.message)

        return {
            "code": 200,
            "message": "success",
            "data": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
