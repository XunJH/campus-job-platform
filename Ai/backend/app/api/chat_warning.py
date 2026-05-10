"""
聊天风险预警 API 路由

包含：
1. 单条消息实时检测（聊天过程中调用）
2. 整段对话风险分析（聊天结束后调用）
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from ..services.chat_warning_service import chat_warning_service

router = APIRouter(prefix="/chat-warning", tags=["聊天风险预警"])


# ==================== 数据模型 ====================

class MessageCheckRequest(BaseModel):
    """单条消息风险检测请求"""
    message: str = Field(..., max_length=2000, description="待检测的消息内容")
    sender_role: str = Field(default="employer", pattern="^(employer|student)$", description="发送者角色")
    conversation_id: Optional[str] = Field(default=None, description="对话ID（可选，用于日志）")


class ConversationMessage(BaseModel):
    """对话中的单条消息"""
    role: str = Field(..., pattern="^(employer|student)$")
    content: str = Field(..., max_length=2000)


class ConversationAnalysisRequest(BaseModel):
    """整段对话风险分析请求"""
    conversation: List[ConversationMessage] = Field(..., description="完整对话记录")
    job_title: Optional[str] = Field(default=None, max_length=200, description="相关岗位名称（可选）")
    employer_name: Optional[str] = Field(default=None, max_length=100, description="企业名称（可选）")


# ==================== 1. 单条消息实时检测 ====================

@router.post("/check-message")
async def check_message(request: MessageCheckRequest):
    """
    检测单条消息的风险

    在聊天过程中实时调用，检测到风险后立即返回预警信息。
    前端收到后可在聊天界面显示预警横幅。
    """
    try:
        result = chat_warning_service.detect_risks(
            message=request.message,
            sender_role=request.sender_role,
            conversation_history=None
        )

        return {
            "code": 200,
            "message": "检测完成",
            "data": {
                "has_risk": result["has_risk"],
                "risk_level": result["risks"][0]["level"] if result["risks"] else None,
                "risks": result["risks"],
                "risk_summary": result["risk_summary"],
                "should_block": any("🔴" in r.get("level", "") for r in result["risks"])
            }
        }

    except Exception as e:
        import logging
        logging.error(f"Chat warning check error: {e}")
        # 降级：不阻断聊天，返回无风险
        return {
            "code": 200,
            "message": "检测服务暂不可用，继续聊天",
            "data": {
                "has_risk": False,
                "risks": [],
                "risk_summary": None,
                "should_block": False
            }
        }


# ==================== 2. 整段对话风险分析 ====================

@router.post("/analyze-conversation")
async def analyze_conversation(request: ConversationAnalysisRequest):
    """
    分析整段对话的风险

    在聊天结束后调用，生成综合风险报告。
    用于「聊天记录」页面的风险预警展示。
    """
    try:
        # 转换为服务层需要的格式
        conversation = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversation
        ]

        result = chat_warning_service.analyze_conversation(conversation)

        return {
            "code": 200,
            "message": "对话分析完成",
            "data": {
                "overall_risk_level": result["overall_risk_level"],
                "risk_summary": result["risk_summary"],
                "detected_risks": result["detected_risks"],
                "suggestions": result["suggestions"],
                "conversation_score": result["conversation_score"],
                "total_messages_analyzed": result["total_messages_analyzed"]
            }
        }

    except Exception as e:
        import logging
        logging.error(f"Conversation analysis error: {e}")
        raise HTTPException(status_code=500, detail="对话分析服务暂时不可用")


# ==================== 3. 获取风险类型说明（前端渲染用） ====================

@router.get("/risk-types")
async def get_risk_types():
    """
    获取所有风险类型及说明

    前端可用于渲染风险说明页面或帮助文档。
    """
    risk_types = {
        "🔴高危": {
            "description": "需要立即停止沟通的风险类型",
            "types": [
                {"name": "金钱诈骗", "desc": "要求交押金、培训费等任何前期费用"},
                {"name": "隐私窃取", "desc": "索要身份证号、银行卡号等敏感信息"},
                {"name": "站外引流", "desc": "诱导加微信/QQ，脱离平台监管"}
            ]
        },
        "🟡中危": {
            "description": "需要谨慎对待的风险类型",
            "types": [
                {"name": "虚假薪资", "desc": "薪资承诺明显超出合理范围"},
                {"name": "心理施压", "desc": "用紧迫感迫使快速决策"}
            ]
        },
        "🔵低危": {
            "description": "需要注意的风险类型",
            "types": [
                {"name": "过度收集", "desc": "收集与岗位无关的个人隐私"},
                {"name": "规避监管", "desc": "建议不签合同、私下交易"}
            ]
        }
    }

    return {
        "code": 200,
        "message": "获取成功",
        "data": risk_types
    }
