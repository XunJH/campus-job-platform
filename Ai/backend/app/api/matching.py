"""
智能匹配API路由

包含正向推荐（学生→岗位）和反向推荐（岗位→学生）
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ..services.matching_service import matching_service
from ..models.ai_models import PersonalityProfile

router = APIRouter(prefix="/matching", tags=["智能匹配"])


class MatchRequest(BaseModel):
    """正向推荐请求（学生→岗位）"""
    user_id: str
    # 可以传入人格画像，也可以让系统自动获取
    personality_profile: Optional[dict] = None
    top_n: int = 5


class ReverseMatchRequest(BaseModel):
    """反向推荐请求（岗位→学生）"""
    job_title: str
    job_tags: List[str] = []
    job_requirements: List[str] = []
    top_n: int = 5


@router.get("/jobs")
async def get_all_jobs():
    """获取所有可用岗位"""
    jobs = matching_service.get_all_jobs()
    return {
        "code": 200,
        "message": "success",
        "data": {
            "total": len(jobs),
            "jobs": jobs
        }
    }


@router.post("/recommend")
async def recommend_jobs(request: MatchRequest):
    """
    智能推荐岗位

    根据用户的人格画像，推荐最适合的兼职岗位
    """
    try:
        # 如果前端传了人格画像，直接使用
        if request.personality_profile:
            profile = PersonalityProfile(**request.personality_profile)
        else:
            # TODO: 从数据库获取用户的人格画像
            raise HTTPException(
                status_code=400,
                detail="需要提供人格画像数据"
            )

        # 执行匹配
        results = matching_service.match_jobs(profile, request.top_n)

        # 转换为可序列化格式
        match_list = [
            {
                "job": result.job.model_dump(),
                "match_score": result.match_score,
                "match_reasons": result.match_reasons,
                "warnings": result.warnings
            }
            for result in results
        ]

        return {
            "code": 200,
            "message": "推荐完成",
            "data": {
                "total": len(match_list),
                "recommendations": match_list
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reverse")
async def reverse_recommend(request: ReverseMatchRequest):
    """
    反向推荐：根据岗位需求推荐匹配的学生

    企业端核心功能：输入岗位标签和要求，返回最匹配的学生列表
    """
    try:
        results = matching_service.reverse_match(
            job_title=request.job_title,
            job_tags=request.job_tags,
            job_requirements=request.job_requirements,
            top_n=request.top_n
        )

        return {
            "code": 200,
            "message": "反向推荐完成",
            "data": {
                "total": len(results),
                "recommendations": results
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
