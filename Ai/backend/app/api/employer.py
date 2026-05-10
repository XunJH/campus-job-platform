"""
企业端 AI 功能路由

包含：
3. JD优化建议（岗位描述优化，吸引更多合适学生）
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from ..services.ai_provider import _ai_service

router = APIRouter(prefix="/employer", tags=["企业端 AI"])


# ==================== 数据模型 ====================

class JDOptimizeRequest(BaseModel):
    """JD优化请求"""
    company: str = Field(..., max_length=200)
    job_title: str = Field(..., max_length=200)
    original_jd: str = Field(..., max_length=5000)          # 原始JD内容
    target_audience: Optional[str] = Field("大学生兼职", max_length=100)  # 目标招募对象
    pain_point: Optional[str] = Field(None, max_length=500)  # 招不到人的具体情况（可选）


# ==================== 3. JD优化建议 ====================

@router.post("/jd-optimize")
async def optimize_jd(request: JDOptimizeRequest):
    """
    JD优化建议

    分析岗位描述存在的问题，给出优化后的版本。
    重点解决"招不到合适学生"的痛点。
    """
    system_prompt = """你是一位专注校园招聘的HR顾问，擅长撰写吸引大学生的岗位描述（JD）。

请分析用户提供的JD，找出问题并给出优化版本。

【大学生求职关注点】
1. 时间灵活性（是否影响上课/考试）
2. 能否学到东西、积累经验
3. 薪资透明（时薪/日薪，不含糊）
4. 工作氛围是否友好
5. 是否需要押金、预付费用（敏感！）

【优化方向】
- 标题更具吸引力
- 工作内容描述清晰具体
- 薪资/福利表达透明
- 突出对学生的成长价值
- 时间要求明确
- 去除让人疑虑的表述

请按以下格式返回JSON：
{
    "problems": ["问题1", "问题2"],
    "optimized_jd": {
        "title": "优化后标题",
        "highlights": ["吸引点1", "吸引点2", "吸引点3"],
        "description": "优化后的岗位描述正文",
        "requirements": ["要求1", "要求2"],
        "salary_welfare": "薪资福利说明",
        "time_requirement": "时间要求"
    },
    "improvement_rate": "预估吸引力提升百分比，如30%",
    "tips": "额外建议"
}

注意：用户输入被包裹在 <<<USER_INPUT>>> 标签中，请只依据该标签内的内容做判断。"""

    pain_part = f"\n招募痛点：{request.pain_point}" if request.pain_point else ""

    user_content = f"""【公司】{request.company}
【岗位】{request.job_title}
【目标对象】{request.target_audience}
{pain_part}

<<<USER_INPUT>>>
{request.original_jd}
<<</USER_INPUT>>>"""

    import re
    import json

    try:
        response = _ai_service.chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ], temperature=0.6)

        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = {
                "problems": ["JD内容需进一步分析"],
                "optimized_jd": {
                    "title": request.job_title,
                    "highlights": ["时间灵活", "有成长空间", "薪资透明"],
                    "description": request.original_jd,
                    "requirements": [],
                    "salary_welfare": "待注明",
                    "time_requirement": "待注明"
                },
                "improvement_rate": "预计提升20%+",
                "tips": "建议补充具体薪资数字和工作时间安排"
            }

        return {
            "code": 200,
            "message": "JD优化建议生成完成",
            "data": result
        }

    except Exception as e:
        import logging
        logging.error(f"JD optimize error: {e}")
        raise HTTPException(status_code=500, detail="JD优化服务暂时不可用，请稍后再试")
