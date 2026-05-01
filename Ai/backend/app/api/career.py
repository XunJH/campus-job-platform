"""
职业发展路径API路由
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ..services.career_path_service import career_path_service

router = APIRouter(prefix="/career", tags=["职业发展路径"])


class CareerPathRequest(BaseModel):
    """职业路径请求"""
    target_job: str
    current_skills: Optional[List[str]] = None
    personality_tags: Optional[List[str]] = None


@router.post("/path")
async def generate_career_path(request: CareerPathRequest):
    """
    生成职业发展路径

    根据目标岗位，规划3-5步成长路线
    """
    try:
        result = career_path_service.generate_path(
            target_job=request.target_job,
            current_skills=request.current_skills,
            personality_tags=request.personality_tags
        )
        return {
            "code": 200,
            "message": "路径生成完成",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
