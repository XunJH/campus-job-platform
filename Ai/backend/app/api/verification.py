"""
认证审核API路由

包含认证辅助审核、虚假岗位检测、信用分计算等功能
支持 DeepSeek / Gemini / Mock 三种模式
"""

import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ..core.config import settings

# 根据配置选择 AI 服务
USE_MOCK = os.getenv("USE_MOCK", str(settings.USE_MOCK)).lower() == "true"

if USE_MOCK:
    from ..services.gemini_service import GeminiService
    _ai_service = GeminiService()
else:
    from ..services.deepseek_service import DeepSeekService
    _ai_service = DeepSeekService()

router = APIRouter(prefix="/verification", tags=["认证审核"])


class VerificationRequest(BaseModel):
    """认证审核请求"""
    type: str  # "id_card" | "student_card" | "enterprise"
    user_id: str
    content: str  # 待审核的文本内容或图片描述


class FraudCheckRequest(BaseModel):
    """虚假岗位检测请求"""
    job_id: str
    title: str
    company: str
    salary: str
    description: str
    requirements: List[str] = []


class CreditScoreRequest(BaseModel):
    """信用分计算请求"""
    user_id: str
    # 这些数据实际应该从数据库获取
    completed_jobs: int = 0  # 完成的兼职数
    bad_reviews: int = 0  # 差评数
    violation_count: int = 0  # 违规次数
    avg_rating: float = 5.0  # 平均评分


# ==================== 认证辅助审核 ====================

@router.post("/verify")
async def verify_identity(request: VerificationRequest):
    """
    认证辅助审核

    使用AI辅助审核用户提交的认证材料
    检测信息真实性，评估风险等级
    """
    prompt = f"""
你是一个专业的认证审核助手。请分析以下认证材料，判断其真实性和可信度。

【认证类型】
{request.type}

【用户ID】
{request.user_id}

【认证内容】
{request.content}

【审核要点】
1. 信息是否完整、清晰
2. 是否存在明显的伪造痕迹
3. 文字描述是否合理

请返回JSON格式的审核结果：
{{
    "is_valid": true/false,
    "risk_level": "low/medium/high",
    "details": ["具体发现1", "具体发现2"],
    "suggestions": ["建议1", "建议2"]
}}
"""

    import re
    import json

    try:
        response = _ai_service.generate_text(prompt, temperature=0.3)

        # 解析JSON
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = {
                "is_valid": True,
                "risk_level": "low",
                "details": ["审核通过"],
                "suggestions": []
            }

        return {
            "code": 200,
            "message": "审核完成",
            "data": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 虚假岗位检测 ====================

@router.post("/fraud-check")
async def check_fraud(request: FraudCheckRequest):
    """
    虚假岗位检测

    分析岗位信息，识别潜在的虚假或高风险岗位
    """
    prompt = f"""
你是一个兼职岗位安全审核专家。请分析以下岗位信息，判断是否为虚假或高风险岗位。

【岗位信息】
- 岗位名称：{request.title}
- 发布公司：{request.company}
- 薪资待遇：{request.salary}
- 岗位描述：{request.description}
- 岗位要求：{', '.join(request.requirements)}

【虚假岗位常见特征】
1. 薪资明显高于市场水平
2. 要求低（不限经验、学历）
3. 描述模糊，工作内容不清楚
4. 要求提前交钱或交押金
5. 公司信息不明确或查不到

请返回JSON格式的检测结果：
{{
    "is_suspicious": true/false,
    "risk_level": "low/medium/high",
    "warning_signs": ["可疑点1", "可疑点2"],
    "recommendation": "建议"
}}
"""

    import re
    import json

    try:
        response = _ai_service.generate_text(prompt, temperature=0.3)

        # 解析JSON
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = {
                "is_suspicious": False,
                "risk_level": "low",
                "warning_signs": [],
                "recommendation": "未发现明显异常"
            }

        return {
            "code": 200,
            "message": "检测完成",
            "data": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 信用分计算 ====================

@router.post("/credit-score")
async def calculate_credit(request: CreditScoreRequest):
    """
    信用分计算

    根据用户的行为数据，计算信用评分
    """
    # 基础分100分，根据各项指标加减分
    base_score = 100

    # 完成的兼职：每完成一个+2分，封顶+20分
    job_bonus = min(request.completed_jobs * 2, 20)

    # 差评：每个-5分
    review_penalty = request.bad_reviews * 5

    # 违规：每次-10分
    violation_penalty = request.violation_count * 10

    # 评分：如果低于4.5分，扣分
    rating_penalty = max(0, (4.5 - request.avg_rating) * 10)

    # 计算最终分数
    final_score = base_score + job_bonus - review_penalty - violation_penalty - rating_penalty
    final_score = max(0, min(100, round(final_score, 1)))

    # 确定信用等级
    if final_score >= 90:
        credit_level = "优秀"
    elif final_score >= 75:
        credit_level = "良好"
    elif final_score >= 60:
        credit_level = "一般"
    else:
        credit_level = "较差"

    # 生成改进建议
    suggestions = []
    if request.completed_jobs < 5:
        suggestions.append("多完成一些兼职可以提升信用分")
    if request.bad_reviews > 0:
        suggestions.append("注意提升服务质量，减少差评")
    if request.violation_count > 0:
        suggestions.append("遵守平台规则，避免违规行为")
    if request.avg_rating < 4.5:
        suggestions.append("争取获得更多好评")
    if not suggestions:
        suggestions.append("继续保持良好的服务记录")

    return {
        "code": 200,
        "message": "信用分计算完成",
        "data": {
            "user_id": request.user_id,
            "credit_score": final_score,
            "credit_level": credit_level,
            "breakdown": {
                "base_score": base_score,
                "job_bonus": job_bonus,
                "review_penalty": review_penalty,
                "violation_penalty": violation_penalty,
                "rating_penalty": round(rating_penalty, 1)
            },
            "suggestions": suggestions
        }
    }
