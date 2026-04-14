"""
智能岗位匹配服务

根据用户的人格画像，智能匹配适合的兼职岗位
支持 DeepSeek / Gemini / Mock 三种模式
"""

import os
from typing import List, Dict, Any
from ..core.config import settings
from ..models.ai_models import Job, MatchResult, PersonalityProfile
from .personality_service import personality_service

# 根据配置选择 AI 服务
USE_MOCK = os.getenv("USE_MOCK", str(settings.USE_MOCK)).lower() == "true"

if USE_MOCK:
    from ..services.gemini_service import GeminiService
    _ai_service = GeminiService()
else:
    from ..services.deepseek_service import DeepSeekService
    _ai_service = DeepSeekService()


class MatchingService:
    """智能匹配服务"""

    def __init__(self):
        # 预设岗位库（实际项目从数据库读取）
        self.job_pool = self._init_job_pool()

    def _init_job_pool(self) -> List[Job]:
        """初始化岗位库"""
        jobs = [
            Job(
                id="job001",
                title="餐厅服务员",
                company="麦当劳",
                requirements=["年满18岁", "能适应轮班", "有健康证优先"],
                tags=["餐饮", "时间灵活", "可培训", "体力活"],
                description="负责点餐、传菜、收桌等基础服务工作"
            ),
            Job(
                id="job002",
                title="家教老师",
                company="个人/机构",
                requirements=["本科在读及以上", "某学科成绩优秀", "有耐心"],
                tags=["教育", "时薪高", "时间固定", "脑力劳动"],
                description="为中小学生提供学科辅导"
            ),
            Job(
                id="job003",
                title="超市促销员",
                company=" Various品牌",
                requirements=["口齿清晰", "形象良好", "有促销经验优先"],
                tags=["销售", "沟通能力", "站岗", "提成"],
                description="在超市推销商品，引导顾客购买"
            ),
            Job(
                id="job004",
                title="外卖配送员",
                company="美团/饿了么",
                requirements=["有电动车", "熟悉周边", "吃苦耐劳"],
                tags=["配送", "多劳多得", "体力活", "时间自由"],
                description="负责外卖餐品的配送工作"
            ),
            Job(
                id="job005",
                title="图书馆助理",
                company="学校图书馆",
                requirements=["细心认真", "手脚麻利", "每周至少8小时"],
                tags=["安静", "稳定", "环境好", "可自习"],
                description="负责图书整理、上架、读者服务等工作"
            ),
            Job(
                id="job006",
                title="校园代理",
                company=" Various商家",
                requirements=["人脉广", "善于推广", "有执行力"],
                tags=["销售", "提成高", "锻炼能力", "社交"],
                description="在校园内推广产品或服务，赚取佣金"
            ),
            Job(
                id="job007",
                title="便利店店员",
                company="全家/7-11",
                requirements=["能上夜班", "细心负责", "手脚麻利"],
                tags=["零售", "夜班", "稳定", "可培训"],
                description="收银、商品整理、货架陈列等工作"
            ),
            Job(
                id="job008",
                title="展会工作人员",
                company="展会公司",
                requirements=["形象端正", "沟通能力强", "能站一天"],
                tags=["活动", "短期", "薪资日结", "社交"],
                description="在各类展会、活动中提供现场服务"
            ),
            Job(
                id="job009",
                title="数据标注员",
                company="AI公司外包",
                requirements=["电脑操作熟练", "细心认真", "耐心"],
                tags=["远程", "脑力劳动", "可兼职", "新兴"],
                description="对图片、文本等数据进行标注"
            ),
            Job(
                id="job010",
                title="咖啡店店员",
                company="瑞幸/星巴克",
                requirements=["年满18岁", "对咖啡有兴趣", "有服务意识"],
                tags=["餐饮", "环境好", "技能培训", "氛围轻松"],
                description="制作咖啡饮品、提供顾客服务"
            ),
        ]
        return jobs

    def get_all_jobs(self) -> List[Dict[str, Any]]:
        """获取所有岗位列表"""
        return [job.model_dump() for job in self.job_pool]

    def match_jobs(
        self,
        personality_profile: PersonalityProfile,
        top_n: int = 5
    ) -> List[MatchResult]:
        """
        核心功能：为人格画像匹配最适合的岗位

        匹配策略：
        1. 基于规则计算基础匹配度（快速筛选）
        2. 调用Gemini生成详细的匹配理由（精准推荐）
        """
        # 准备匹配数据
        user_tags = personality_profile.tags
        user_strengths = personality_profile.strengths
        suitable_jobs = personality_profile.suitable_jobs

        results = []

        for job in self.job_pool:
            # Step 1: 基于规则的快速匹配度计算
            base_score = self._calculate_base_score(
                user_tags, user_strengths, suitable_jobs, job
            )

            # Step 2: 生成匹配理由
            match_reasons = self._generate_match_reasons(
                personality_profile, job, base_score
            )

            # Step 3: 生成风险提示（如果有的话）
            warnings = self._generate_warnings(
                personality_profile, job
            )

            result = MatchResult(
                job=job,
                match_score=base_score,
                match_reasons=match_reasons,
                warnings=warnings
            )
            results.append(result)

        # 按匹配度排序，返回top_n个
        results.sort(key=lambda x: x.match_score, reverse=True)
        return results[:top_n]

    def _calculate_base_score(
        self,
        user_tags: List[str],
        user_strengths: List[str],
        suitable_jobs: List[str],
        job: Job
    ) -> float:
        """
        计算基础匹配度

        使用简单的标签重叠 + 关键词匹配
        """
        score = 0.0
        max_score = 100.0

        # 1. 性格标签匹配（占40%）
        tag_matches = 0
        job_keywords = set(job.tags + [job.title] + job.requirements)

        for tag in user_tags:
            if any(keyword in str(job_keywords) for keyword in [tag]):
                tag_matches += 1

        if user_tags:
            score += (tag_matches / len(user_tags)) * 40

        # 2. 优势匹配（占30%）
        strength_matches = 0
        for strength in user_strengths:
            if any(keyword in str(job_keywords) for keyword in [strength]):
                strength_matches += 1

        if user_strengths:
            score += (strength_matches / len(user_strengths)) * 30

        # 3. 适合岗位类型匹配（占30%）
        job_type_matches = 0
        for suitable in suitable_jobs:
            if suitable.lower() in job.title.lower() or \
               suitable.lower() in ' '.join(job.tags).lower():
                job_type_matches += 1

        if suitable_jobs:
            score += (job_type_matches / len(suitable_jobs)) * 30

        return min(round(score, 1), 100.0)

    def _generate_match_reasons(
        self,
        profile: PersonalityProfile,
        job: Job,
        base_score: float
    ) -> List[str]:
        """
        使用Gemini生成详细的匹配理由

        让AI用自然语言解释为什么这个岗位适合用户
        """
        prompt = f"""
作为一个智能兼职推荐助手，请为人格画像与岗位的匹配生成3个简洁的理由。

【用户人格画像】
- 性格标签：{', '.join(profile.tags)}
- 核心优势：{', '.join(profile.strengths)}
- 适合岗位类型：{', '.join(profile.suitable_jobs)}

【岗位信息】
- 岗位名称：{job.title}
- 公司：{job.company}
- 岗位特点：{', '.join(job.tags)}
- 基本要求：{', '.join(job.requirements)}
- 岗位描述：{job.description}
- 匹配度：{base_score}%

请生成3条简洁的匹配理由，每条不超过20个字。
只输出理由列表，格式如：
["理由1", "理由2", "理由3"]
"""
        response = _ai_service.generate_text(
            prompt,
            temperature=0.5
        )

        # 尝试解析JSON
        import re
        import json
        json_match = re.search(r'\[.*\]', response, re.DOTALL)
        if json_match:
            try:
                reasons = json.loads(json_match.group())
                return reasons[:3]
            except json.JSONDecodeError:
                pass

        # 解析失败，返回默认理由
        return [
            f"匹配度{base_score}%，适合你的性格特点",
            f"与你的优势{profile.strengths[0] if profile.strengths else '相关'}契合",
            "岗位要求与你的画像匹配"
        ]

    def _generate_warnings(
        self,
        profile: PersonalityProfile,
        job: Job
    ) -> List[str]:
        """
        生成风险提示

        善意的提醒，帮助用户避免踩坑
        """
        warnings = []

        # 检查潜在问题
        if "体力活" in job.tags:
            if profile.dimensions.get("情绪稳定性", 0) < 0.5:
                warnings.append("该岗位需要一定的体力，兼职同时要注意学习")

        if "夜班" in job.tags:
            warnings.append("注意：该岗位有夜班，要合理安排作息")

        if "提成" in job.tags:
            warnings.append("注意：提成岗位收入不稳定，要有一定心理准备")

        return warnings


# 创建全局实例
matching_service = MatchingService()
