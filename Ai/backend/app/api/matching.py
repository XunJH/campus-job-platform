"""
Smart matching API routes.
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..models.ai_models import PersonalityProfile
from ..services.matching_service import matching_service

router = APIRouter(prefix="/matching", tags=["智能匹配"])


class MatchRequest(BaseModel):
    user_id: str
    personality_profile: Optional[dict] = None
    top_n: int = 5


class ReverseMatchRequest(BaseModel):
    job_title: str
    job_tags: List[str] = []
    job_requirements: List[str] = []
    top_n: int = 5


class SmartReferralRequest(BaseModel):
    job_id: str = Field(..., description="岗位ID")
    job_title: str = Field(..., description="岗位名称")
    job_description: str = Field(default="", description="岗位描述")
    job_requirements: List[str] = Field(default=[], description="岗位要求（技能列表）")
    job_salary: Optional[str] = Field(default=None, description="薪资说明")
    top_n: int = Field(default=10, ge=1, le=50, description="返回推荐人数上限")
    include_gap_analysis: bool = Field(default=True, description="是否包含差距分析")


@router.get("/jobs")
async def get_all_jobs():
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
    try:
        if request.personality_profile:
            profile = PersonalityProfile(**request.personality_profile)
        else:
            profile = matching_service.fetch_personality_profile(request.user_id)
            if not profile:
                raise HTTPException(
                    status_code=404,
                    detail="未找到已保存的人格画像，请先完成测评并保存"
                )

        results = matching_service.match_jobs(profile, request.top_n)
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
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@router.post("/reverse")
async def reverse_recommend(request: ReverseMatchRequest):
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
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@router.post("/smart-referral")
async def smart_referral(request: SmartReferralRequest):
    try:
        result = matching_service.smart_referral(
            job_id=request.job_id,
            job_title=request.job_title,
            job_description=request.job_description,
            job_requirements=request.job_requirements,
            job_salary=request.job_salary,
            top_n=request.top_n,
            include_gap_analysis=request.include_gap_analysis
        )

        return {
            "code": 200,
            "message": "智能调剂推荐完成",
            "data": result
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))
