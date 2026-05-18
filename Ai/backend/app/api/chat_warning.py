"""Chat risk warning API."""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..services.chat_warning_service import chat_warning_service

router = APIRouter(prefix="/chat-warning", tags=["聊天风险预警"])


class MessageCheckRequest(BaseModel):
    """Single-message risk check request."""

    message: str = Field(..., max_length=2000, description="待检测的消息内容")
    sender_role: str = Field(default="employer", pattern="^(employer|student)$", description="发送方角色")
    conversation_id: Optional[str] = Field(default=None, description="可选会话标识")


class ConversationMessage(BaseModel):
    """Single message in a conversation."""

    role: str = Field(..., pattern="^(employer|student)$")
    content: str = Field(..., max_length=2000)


class ConversationAnalysisRequest(BaseModel):
    """Conversation-level risk analysis request."""

    conversation: List[ConversationMessage] = Field(..., description="完整对话记录")
    job_title: Optional[str] = Field(default=None, max_length=200, description="关联岗位")
    employer_name: Optional[str] = Field(default=None, max_length=100, description="企业名称")


@router.post("/check-message")
async def check_message(request: MessageCheckRequest):
    """Check a single message before it is sent."""

    try:
        result = chat_warning_service.detect_risks(
            message=request.message,
            sender_role=request.sender_role,
            conversation_history=None,
        )
        return {
            "code": 200,
            "message": "检测完成",
            "data": result,
        }
    except Exception as exc:
        logging.error("Chat warning check error: %s", exc)
        return {
            "code": 200,
            "message": "风险检测服务暂时不可用，本次按低风险处理。",
            "data": chat_warning_service.detect_risks("", sender_role=request.sender_role),
        }


@router.post("/analyze-conversation")
async def analyze_conversation(request: ConversationAnalysisRequest):
    """Analyze the overall governance risk of a conversation."""

    try:
        conversation = [{"role": message.role, "content": message.content} for message in request.conversation]
        result = chat_warning_service.analyze_conversation(conversation)
        return {
            "code": 200,
            "message": "对话分析完成",
            "data": result,
        }
    except Exception as exc:
        logging.error("Conversation analysis error: %s", exc)
        raise HTTPException(status_code=500, detail="对话分析服务暂时不可用，请稍后再试。") from exc


@router.get("/risk-types")
async def get_risk_types():
    """Return grouped risk-type metadata for the frontend."""

    return {
        "code": 200,
        "message": "获取成功",
        "data": chat_warning_service.get_risk_types(),
    }
