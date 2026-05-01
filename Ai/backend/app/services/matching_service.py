"""
智能岗位匹配服务

根据用户的人格画像，智能匹配适合的兼职岗位
支持 DeepSeek / Gemini / Mock 三种模式
"""

from typing import List, Dict, Any
import requests
from ..models.ai_models import Job, MatchResult, PersonalityProfile
from .personality_service import personality_service
from ..services.ai_provider import _ai_service

# 主后端API地址
CAMPUS_JOB_API = "http://localhost:3001/api/v1"


class MatchingService:
    """智能匹配服务"""

    def __init__(self):
        # 预设学生池（用于反向推荐，实际项目从数据库读取）
        self.student_pool = self._init_student_pool()

    def _fetch_real_jobs(self) -> List[Job]:
        """从 campus_job_api 获取真实岗位数据"""
        try:
            resp = requests.get(
                f"{CAMPUS_JOB_API}/jobs",
                params={"page": 1, "limit": 100},
                timeout=5
            )
            resp.raise_for_status()
            data = resp.json()
            if not data.get("success"):
                return []

            jobs = []
            for item in data.get("data", {}).get("jobs", []):
                # 解析 requirements（数据库中为文本，可能按换行/逗号分隔）
                req_raw = item.get("requirements", "")
                if isinstance(req_raw, list):
                    requirements = req_raw
                elif isinstance(req_raw, str):
                    requirements = [r.strip() for r in req_raw.replace("，", ",").replace("\n", ",").split(",") if r.strip()]
                else:
                    requirements = []

                # 构建 tags：从 category + jobType + salaryType 组合
                tags = []
                if item.get("category"):
                    tags.append(item["category"])
                if item.get("jobType"):
                    tags.append(item["jobType"])
                if item.get("salaryType"):
                    tags.append(item["salaryType"])
                if item.get("workLocation"):
                    tags.append(item["workLocation"])

                # 获取公司名（employer.username）
                employer = item.get("employer", {})
                company = employer.get("username", employer.get("companyName", "未知企业"))

                jobs.append(Job(
                    id=str(item.get("id", "")),
                    title=item.get("title", "未命名岗位"),
                    company=company,
                    requirements=requirements,
                    tags=tags,
                    description=item.get("description", "")
                ))
            return jobs
        except Exception as e:
            print(f"[MatchingService] 获取真实岗位失败: {e}")
            return []

    @property
    def job_pool(self) -> List[Job]:
        """动态从主后端获取岗位列表"""
        return self._fetch_real_jobs()

    def _init_student_pool(self) -> List[Dict[str, Any]]:
        """初始化学生池（用于反向推荐）"""
        students = [
            {
                "student_id": "stu001",
                "name": "张同学",
                "major": "计算机科学",
                "grade": "大二",
                "tags": ["技术", "细心", "逻辑强", "自学能力"],
                "strengths": ["编程", "数据分析", "逻辑思维"],
                "suitable_jobs": ["数据标注", "程序员助理", "技术支持"],
                "dimensions": {"外向性": 0.4, "尽责性": 0.8, "开放性": 0.7, "宜人性": 0.6, "情绪稳定性": 0.7}
            },
            {
                "student_id": "stu002",
                "name": "李同学",
                "major": "市场营销",
                "grade": "大三",
                "tags": ["外向", "沟通", "创意", "社交"],
                "strengths": ["沟通表达", "活动策划", "人际交往"],
                "suitable_jobs": ["促销员", "校园代理", "活动策划"],
                "dimensions": {"外向性": 0.9, "尽责性": 0.6, "开放性": 0.8, "宜人性": 0.7, "情绪稳定性": 0.5}
            },
            {
                "student_id": "stu003",
                "name": "王同学",
                "major": "英语",
                "grade": "大一",
                "tags": ["耐心", "细心", "安静", "认真"],
                "strengths": ["语言能力", "耐心辅导", "细致认真"],
                "suitable_jobs": ["家教", "翻译助理", "客服"],
                "dimensions": {"外向性": 0.3, "尽责性": 0.9, "开放性": 0.5, "宜人性": 0.8, "情绪稳定性": 0.8}
            },
            {
                "student_id": "stu004",
                "name": "赵同学",
                "major": "设计",
                "grade": "大二",
                "tags": ["创意", "审美", "独立", "学习快"],
                "strengths": ["平面设计", "审美能力", "创意思维"],
                "suitable_jobs": ["设计助理", "美工", "新媒体运营"],
                "dimensions": {"外向性": 0.5, "尽责性": 0.7, "开放性": 0.9, "宜人性": 0.6, "情绪稳定性": 0.6}
            },
            {
                "student_id": "stu005",
                "name": "陈同学",
                "major": "工商管理",
                "grade": "大三",
                "tags": ["领导力", "组织", "沟通", "积极"],
                "strengths": ["团队管理", "项目协调", "执行能力"],
                "suitable_jobs": ["校园代理", "活动执行", "管理培训生"],
                "dimensions": {"外向性": 0.8, "尽责性": 0.8, "开放性": 0.6, "宜人性": 0.5, "情绪稳定性": 0.7}
            },
            {
                "student_id": "stu006",
                "name": "刘同学",
                "major": "金融",
                "grade": "大二",
                "tags": ["严谨", "数学好", "细心", "稳定"],
                "strengths": ["数据处理", "财务分析", "细心严谨"],
                "suitable_jobs": ["数据录入", "财务助理", "收银员"],
                "dimensions": {"外向性": 0.3, "尽责性": 0.9, "开放性": 0.4, "宜人性": 0.7, "情绪稳定性": 0.9}
            },
            {
                "student_id": "stu007",
                "name": "孙同学",
                "major": "新闻传播",
                "grade": "大二",
                "tags": ["写作", "社交", "敏锐", "表达"],
                "strengths": ["文案撰写", "信息搜集", "沟通采访"],
                "suitable_jobs": ["新媒体运营", "文案编辑", "记者助理"],
                "dimensions": {"外向性": 0.7, "尽责性": 0.6, "开放性": 0.8, "宜人性": 0.7, "情绪稳定性": 0.5}
            },
            {
                "student_id": "stu008",
                "name": "周同学",
                "major": "体育",
                "grade": "大一",
                "tags": ["体力好", "守时", "团队", "积极"],
                "strengths": ["体力充沛", "团队协作", "时间观念强"],
                "suitable_jobs": ["配送员", "展会工作", "健身房助理"],
                "dimensions": {"外向性": 0.7, "尽责性": 0.7, "开放性": 0.5, "宜人性": 0.8, "情绪稳定性": 0.8}
            },
        ]
        return students

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

    def reverse_match(
        self,
        job_title: str,
        job_tags: List[str],
        job_requirements: List[str],
        top_n: int = 5
    ) -> List[Dict[str, Any]]:
        """
        反向推荐：根据岗位需求匹配学生

        逻辑与 match_jobs 相反：
        - match_jobs: 用户性格 → 岗位池
        - reverse_match: 岗位需求 → 学生池
        """
        # 构建岗位关键词集合
        job_keywords = set(job_tags + job_requirements + [job_title])

        results = []

        for student in self.student_pool:
            # 计算匹配度（复用打分逻辑，交换角色）
            score = self._calculate_reverse_score(
                job_tags, job_requirements, job_title,
                student, job_keywords
            )

            # 生成匹配理由
            match_reasons = self._generate_reverse_reasons(
                job_title, job_tags, student, score
            )

            results.append({
                "student": {
                    "student_id": student["student_id"],
                    "name": student["name"],
                    "major": student["major"],
                    "grade": student["grade"],
                    "tags": student["tags"],
                    "strengths": student["strengths"],
                    "suitable_jobs": student["suitable_jobs"]
                },
                "match_score": score,
                "match_reasons": match_reasons
            })

        # 按匹配度排序
        results.sort(key=lambda x: x["match_score"], reverse=True)
        return results[:top_n]

    def _calculate_reverse_score(
        self,
        job_tags: List[str],
        job_requirements: List[str],
        job_title: str,
        student: Dict[str, Any],
        job_keywords: set
    ) -> float:
        """
        计算反向匹配度

        岗位需求 vs 学生能力
        """
        score = 0.0

        # 1. 岗位标签 vs 学生标签（占40%）
        tag_matches = 0
        student_tags = student.get("tags", [])
        for tag in job_tags:
            for s_tag in student_tags:
                if tag in s_tag or s_tag in tag:
                    tag_matches += 1
                    break

        if job_tags:
            score += (tag_matches / len(job_tags)) * 40

        # 2. 岗位要求 vs 学生优势（占30%）
        strength_matches = 0
        student_strengths = student.get("strengths", [])
        for req in job_requirements:
            for strength in student_strengths:
                if any(kw in strength for kw in req if len(kw) > 1):
                    strength_matches += 1
                    break

        if job_requirements:
            score += (strength_matches / len(job_requirements)) * 30

        # 3. 岗位名称 vs 适合岗位类型（占30%）
        suitable_matches = 0
        suitable_jobs = student.get("suitable_jobs", [])
        for suitable in suitable_jobs:
            if suitable.lower() in job_title.lower() or \
               job_title.lower() in suitable.lower():
                suitable_matches += 1

        if suitable_jobs:
            score += (suitable_matches / len(suitable_jobs)) * 30

        return min(round(score, 1), 100.0)

    def _generate_reverse_reasons(
        self,
        job_title: str,
        job_tags: List[str],
        student: Dict[str, Any],
        score: float
    ) -> List[str]:
        """生成反向匹配理由"""
        reasons = []

        # 基于分数和匹配情况生成理由
        if score >= 60:
            reasons.append(f"综合匹配度{score}%，高度适配该岗位")
        elif score >= 30:
            reasons.append(f"匹配度{score}%，基本符合岗位需求")
        else:
            reasons.append(f"匹配度{score}%，部分条件吻合")

        # 基于标签匹配生成理由
        student_tags = student.get("tags", [])
        matched_tags = [t for t in job_tags if any(t in st or st in t for st in student_tags)]
        if matched_tags:
            reasons.append(f"具备岗位所需特质：{'、'.join(matched_tags[:3])}")

        # 基于优势生成理由
        strengths = student.get("strengths", [])
        if strengths:
            reasons.append(f"核心优势：{strengths[0]}")

        return reasons[:3]


# 创建全局实例
matching_service = MatchingService()
