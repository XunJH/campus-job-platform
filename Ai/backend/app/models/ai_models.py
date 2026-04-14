"""
数据模型定义

这里定义所有和AI相关的数据结构，让代码更清晰
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


# ==================== 人格画像相关 ====================

class PersonalityQuestion(BaseModel):
    """人格问卷题目"""
    id: int
    question: str  # 题目内容
    options: List[Dict[str, Any]]  # 选项 [{"text": "A选项", "score": 1}, ...]
    dimension: str  # 属于哪个维度（如：外向性、尽责性等）


class PersonalityAnswer(BaseModel):
    """用户答题记录"""
    question_id: int
    selected_option: int  # 选择的选项索引


class PersonalityProfile(BaseModel):
    """人格画像结果"""
    user_id: str
    dimensions: Dict[str, float]  # 各维度得分 {"外向性": 0.8, "尽责性": 0.6, ...}
    tags: List[str]  # 生成的标签 ["开朗", "善于沟通", "细心"]
    summary: str  # 一段话总结
    strengths: List[str]  # 优势
    weaknesses: List[str]  # 不足
    suitable_jobs: List[str]  # 适合的岗位类型
    created_at: datetime = Field(default_factory=datetime.now)


# ==================== 岗位匹配相关 ====================

class Job(BaseModel):
    """岗位信息"""
    id: str
    title: str  # 岗位名称
    company: str  # 公司名
    requirements: List[str]  # 需求列表
    tags: List[str]  # 岗位标签 ["餐饮", "时间灵活", "高薪资"]
    description: str  # 详细描述


class MatchResult(BaseModel):
    """匹配结果"""
    job: Job
    match_score: float  # 匹配度 0-100
    match_reasons: List[str]  # 匹配原因
    warnings: List[str]  # 潜在风险提示


# ==================== AI对话相关 ====================

class ChatMessage(BaseModel):
    """对话消息"""
    role: str  # "user" 或 "model"
    content: str


class ChatRequest(BaseModel):
    """对话请求"""
    user_id: str
    message: str
    context: Optional[ChatMessage] = None  # 可选的上下文


# ==================== 认证审核相关 ====================

class VerificationData(BaseModel):
    """待审核的认证数据"""
    type: str  # "id_card" | "student_card" | "enterprise"
    image_url: Optional[str] = None
    text_content: Optional[str] = None


class VerificationResult(BaseModel):
    """审核结果"""
    is_valid: bool
    risk_level: str  # "low" | "medium" | "high"
    details: List[str]  # 具体发现
    suggestions: List[str]  # 建议
