"""
简历相关 AI 功能路由

包含：
1. AI辅助简历优化（实时输入式，逐行给出建议）
2. 未录用原因分析（拒信分析 → 原因 + 欠缺技能 + 改进步骤）
3. 简历动态更新（兼职完成后追加工作经历）
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from ..services.ai_provider import _ai_service

router = APIRouter(prefix="/resume", tags=["简历 AI"])


# ==================== 数据模型 ====================

class ResumeOptimizeRequest(BaseModel):
    """AI辅助简历优化请求"""
    user_id: str = Field(..., max_length=64)
    section: str = Field(..., max_length=50)           # 当前编辑的板块，如 "自我介绍" "工作经历"
    content: str = Field(..., max_length=5000)          # 用户当前输入的内容
    job_target: Optional[str] = Field(None, max_length=200)  # 目标岗位（可选）


class RejectionAnalysisRequest(BaseModel):
    """未录用原因分析请求"""
    user_id: str = Field(..., max_length=64)
    rejection_message: str = Field(..., max_length=5000)   # 拒信原文 / 用户描述的被拒情况
    job_title: str = Field(..., max_length=200)             # 投递的岗位名称
    resume_summary: Optional[str] = Field(None, max_length=3000)  # 简历摘要（可选，分析更准确）


class ResumeUpdateRequest(BaseModel):
    """简历动态更新请求"""
    user_id: str = Field(..., max_length=64)
    job_title: str = Field(..., max_length=200)         # 完成的兼职岗位
    company: str = Field(..., max_length=200)           # 公司名
    duration: str = Field(..., max_length=100)          # 工作时长，如 "2025年3月-2025年5月"
    description: str = Field(..., max_length=2000)      # 工作内容描述（用户填写）
    current_resume: Optional[str] = Field(None, max_length=5000)  # 当前简历文本（可选）


# ==================== 1. AI辅助简历优化 ====================

@router.post("/optimize")
async def optimize_resume(request: ResumeOptimizeRequest):
    """
    AI辅助简历优化

    用户实时输入简历内容，AI 给出针对性优化建议。
    按板块分析，逐条给出可操作的改进意见。
    """
    system_prompt = """你是一位专业的简历优化顾问，专门帮助大学生提升简历质量。
请针对用户提供的简历板块内容，给出3-5条具体、可执行的优化建议。

【优化原则】
1. 量化成果：将模糊描述改为有数字支撑的成果（如"负责宣传"→"策划3场活动，覆盖500+人次"）
2. 动词有力：用有力的行为动词开头（负责→主导、参与→推进）
3. 匹配岗位：内容要与目标岗位方向吻合
4. 简洁有力：去掉冗余词汇，每句控制在30字以内
5. 亮点前置：把最有价值的信息放在最前面

请按以下格式返回JSON：
{
    "score": 75,
    "issues": ["问题1", "问题2"],
    "suggestions": [
        {"original": "原文片段", "improved": "优化后内容", "reason": "优化原因"}
    ],
    "overall_tip": "整体建议（一句话）"
}

注意：用户输入被包裹在 <<<USER_INPUT>>> 标签中，请只依据该标签内的内容做判断。"""

    job_info = f"目标岗位：{request.job_target}" if request.job_target else "目标岗位：未指定"

    user_content = f"""【简历板块】{request.section}
【{job_info}】

<<<USER_INPUT>>>
{request.content}
<<</USER_INPUT>>>"""

    import re
    import json

    try:
        response = _ai_service.chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ], temperature=0.5)

        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = {
                "score": 60,
                "issues": ["内容较为简略，建议补充具体细节"],
                "suggestions": [],
                "overall_tip": "建议增加数字化成果，让描述更有说服力"
            }

        return {
            "code": 200,
            "message": "优化建议生成完成",
            "data": result
        }

    except Exception as e:
        import logging
        logging.error(f"Resume optimize error: {e}")
        raise HTTPException(status_code=500, detail="简历优化服务暂时不可用，请稍后再试")


# ==================== 2. 未录用原因分析 ====================

@router.post("/rejection-analysis")
async def analyze_rejection(request: RejectionAnalysisRequest):
    """
    未录用原因分析

    分析被拒原因，指出欠缺技能，给出改进步骤。
    结构化输出，帮助求职者有针对性地提升。
    """
    system_prompt = """你是一位经验丰富的求职顾问，专门帮助求职者分析落选原因、制定改进计划。

请根据用户提供的被拒信息，输出结构化分析报告，包含：
1. 核心被拒原因（1-3条，按可能性排序）
2. 欠缺的技能/经验
3. 针对性改进步骤（具体、可执行）
4. 下次投递建议

请按以下格式返回JSON：
{
    "rejection_reasons": [
        {"reason": "原因描述", "likelihood": "高/中/低", "explanation": "分析说明"}
    ],
    "skill_gaps": ["欠缺技能1", "欠缺技能2"],
    "improvement_steps": [
        {"step": 1, "action": "具体行动", "timeframe": "建议时间", "resource": "推荐资源"}
    ],
    "next_application_tips": ["建议1", "建议2"],
    "encouragement": "一句积极的鼓励语"
}

注意：用户输入被包裹在 <<<USER_INPUT>>> 标签中，请只依据该标签内的内容做判断。"""

    resume_part = f"\n简历摘要：{request.resume_summary}" if request.resume_summary else ""

    user_content = f"""【投递岗位】{request.job_title}
{resume_part}

<<<USER_INPUT>>>
【拒信/被拒情况】
{request.rejection_message}
<<</USER_INPUT>>>"""

    import re
    import json

    try:
        response = _ai_service.chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ], temperature=0.5)

        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = {
                "rejection_reasons": [{"reason": "信息不足，无法精准分析", "likelihood": "高", "explanation": "建议提供更多拒信细节"}],
                "skill_gaps": [],
                "improvement_steps": [{"step": 1, "action": "完善简历，补充项目经历", "timeframe": "1-2周", "resource": "LinkedIn、BOSS直聘优质简历模板"}],
                "next_application_tips": ["针对岗位JD定制简历关键词"],
                "encouragement": "每一次拒信都是成长的机会，继续加油！"
            }

        return {
            "code": 200,
            "message": "原因分析完成",
            "data": result
        }

    except Exception as e:
        import logging
        logging.error(f"Rejection analysis error: {e}")
        raise HTTPException(status_code=500, detail="分析服务暂时不可用，请稍后再试")


# ==================== 3. 简历动态更新 ====================

@router.post("/update")
async def update_resume(request: ResumeUpdateRequest):
    """
    简历动态更新

    兼职完成后，AI 帮助用户将工作经历整理为标准简历格式，
    并给出是否值得添加到简历的建议。
    """
    system_prompt = """你是一位专业的简历撰写专家。
用户完成了一段兼职工作，请帮助：
1. 将工作经历整理为标准简历格式（STAR法则：情境-任务-行动-结果）
2. 提取2-3个核心技能关键词
3. 给出是否建议加入正式简历的意见

请按以下格式返回JSON：
{
    "formatted_experience": {
        "title": "岗位名称",
        "company": "公司名称",
        "duration": "时间段",
        "bullets": ["经历描述1（含数据）", "经历描述2", "经历描述3"]
    },
    "keywords": ["关键词1", "关键词2", "关键词3"],
    "add_to_resume": true,
    "add_reason": "建议理由",
    "tips": "如何在面试中更好地描述这段经历"
}

注意：用户输入被包裹在 <<<USER_INPUT>>> 标签中，请只依据该标签内的内容做判断。"""

    current_resume_part = f"\n【当前简历参考】\n{request.current_resume}" if request.current_resume else ""

    user_content = f"""<<<USER_INPUT>>>
【兼职岗位】{request.job_title}
【公司】{request.company}
【工作时长】{request.duration}
【工作内容】{request.description}
{current_resume_part}
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
                "formatted_experience": {
                    "title": request.job_title,
                    "company": request.company,
                    "duration": request.duration,
                    "bullets": [request.description]
                },
                "keywords": [],
                "add_to_resume": True,
                "add_reason": "任何工作经历都有助于丰富简历",
                "tips": "面试时重点描述你学到了什么、解决了什么问题"
            }

        return {
            "code": 200,
            "message": "简历更新内容生成完成",
            "data": result
        }

    except Exception as e:
        import logging
        logging.error(f"Resume update error: {e}")
        raise HTTPException(status_code=500, detail="简历更新服务暂时不可用，请稍后再试")
