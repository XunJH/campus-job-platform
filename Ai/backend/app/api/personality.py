"""
人格画像API路由

定义人格画像相关的接口
"""

from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel
from ..services.personality_service import personality_service

router = APIRouter(prefix="/personality", tags=["人格画像"])


class GetQuestionnaireRequest(BaseModel):
    """获取问卷请求"""
    count: int = 10


class SubmitAnswersRequest(BaseModel):
    """提交答案请求"""
    user_id: str
    answers: List[dict]  # [{"question_id": 1, "selected_option": 0}, ...]


@router.get("/questionnaire")
async def get_questionnaire():
    """
    获取人格测试问卷

    返回一组性格测试题目，供用户作答
    """
    questions = personality_service.get_questionnaire()
    return {
        "code": 200,
        "message": "success",
        "data": {
            "total": len(questions),
            "questions": questions
        }
    }


@router.post("/analyze")
async def analyze_personality(request: SubmitAnswersRequest):
    """
    提交答案，分析人格画像

    用户提交答卷后，调用AI分析生成人格画像报告
    """
    try:
        profile = personality_service.analyze_answers(
            user_id=request.user_id,
            answers=request.answers
        )

        return {
            "code": 200,
            "message": "分析完成",
            "data": {
                "user_id": profile.user_id,
                "dimensions": profile.dimensions,
                "tags": profile.tags,
                "summary": profile.summary,
                "strengths": profile.strengths,
                "weaknesses": profile.weaknesses,
                "suitable_jobs": profile.suitable_jobs
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
