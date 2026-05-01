"""
智能岗位描述生成API路由
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ..services.jd_service import jd_service

router = APIRouter(prefix="/jd", tags=["智能JD生成"])


class JdGenerateRequest(BaseModel):
    """JD生成请求"""
    job_title: str
    keywords: Optional[List[str]] = None
    company_type: str = ""


@router.post("/generate")
async def generate_jd(request: JdGenerateRequest):
    """
    智能生成岗位描述

    输入岗位名称和关键词，AI自动生成完整JD
    """
    try:
        result = jd_service.generate_jd(
            job_title=request.job_title,
            keywords=request.keywords,
            company_type=request.company_type
        )
        return {
            "code": 200,
            "message": "JD生成完成",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
