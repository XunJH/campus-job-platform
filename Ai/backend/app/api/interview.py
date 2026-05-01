"""
AI面试模拟API路由
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from ..services.interview_service import interview_service

router = APIRouter(prefix="/interview", tags=["AI面试模拟"])


class StartInterviewRequest(BaseModel):
    """开始面试请求"""
    job_title: str
    job_description: str = ""


class InterviewChatRequest(BaseModel):
    """面试对话请求"""
    job_title: str
    message: str
    history: List[Dict[str, str]] = []


class EndInterviewRequest(BaseModel):
    """结束面试请求"""
    job_title: str
    history: List[Dict[str, str]] = []


@router.post("/start")
async def start_interview(request: StartInterviewRequest):
    """
    开始AI模拟面试

    根据岗位信息生成面试开场白
    """
    try:
        result = interview_service.start_interview(
            job_title=request.job_title,
            job_description=request.job_description
        )
        return {
            "code": 200,
            "message": "面试已开始",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def chat_interview(request: InterviewChatRequest):
    """
    面试对话

    候选人回答问题，AI给出反馈并提下一题
    """
    try:
        result = interview_service.chat_interview(
            job_title=request.job_title,
            message=request.message,
            history=request.history
        )
        return {
            "code": 200,
            "message": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/end")
async def end_interview(request: EndInterviewRequest):
    """
    结束面试

    AI给出综合评价和评分
    """
    try:
        result = interview_service.end_interview(
            job_title=request.job_title,
            history=request.history
        )
        return {
            "code": 200,
            "message": "面试已结束",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
