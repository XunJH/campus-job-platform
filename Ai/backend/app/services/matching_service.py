"""
智能岗位匹配服务

根据用户的人格画像，智能匹配适合的兼职岗位
支持 DeepSeek / Gemini / Mock 三种模式
"""

from typing import List, Dict, Any
import requests
from ..models.ai_models import Job, MatchResult, PersonalityProfile
from ..core.config import settings
from .personality_service import personality_service
from ..services.ai_provider import _ai_service

# 主后端API地址
CAMPUS_JOB_API = settings.CAMPUS_JOB_API_URL


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

    def fetch_personality_profile(self, user_id: str):
        """Fetch the persisted personality profile from the main backend."""
        try:
            resp = requests.get(
                f"{CAMPUS_JOB_API}/auth/internal/personality-profile/{user_id}",
                headers={"X-AI-Service-Token": settings.AI_INTERNAL_TOKEN},
                timeout=5
            )
            resp.raise_for_status()
            data = resp.json()
            profile = data.get("data", {}).get("profile")
            if not profile:
                return None

            return PersonalityProfile(**profile)
        except Exception as e:
            print(f"[MatchingService] Failed to fetch personality profile: {e}")
            return None

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


    # ==================== 智能调剂推荐（增强版） ====================

    def smart_referral(
        self,
        job_id: str,
        job_title: str,
        job_description: str = "",
        job_requirements: List[str] = None,
        job_salary: str = None,
        top_n: int = 10,
        include_gap_analysis: bool = True
    ) -> Dict[str, Any]:
        """
        智能调剂推荐（增强版）

        企业端核心功能：
        1. 根据岗位需求推荐最接近的学生
        2. 对每位学生做差距分析（已匹配项 vs 差距项）
        3. 给出 AI 调剂建议（是否建议录用 + 条件）
        """
        job_requirements = job_requirements or []
        job_keywords = set(job_requirements + [job_title] + job_description.split())

        # Step 1: 对所有学生计算匹配度
        results = []
        for student in self.student_pool:
            score = self._calc_student_match(student, job_requirements, job_title, job_keywords)

            # 差距分析
            gap_analysis = None
            if include_gap_analysis:
                gap_analysis = self._analyze_gap(student, job_requirements, job_title)

            # 推荐度分级
            if score >= 70:
                recommendation = "✅ 强烈推荐"
                recruit_condition = "可直接录用"
            elif score >= 50:
                recommendation = "⚠️ 可考虑调剂"
                recruit_condition = gap_analysis["gap_suggestion"] if gap_analysis else "需面试确认"
            else:
                recommendation = "❌ 不推荐"
                recruit_condition = "匹配度过低，不建议录用"

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
                "recommendation": recommendation,
                "recruit_condition": recruit_condition,
                "gap_analysis": gap_analysis
            })

        # 按匹配度排序
        results.sort(key=lambda x: x["match_score"], reverse=True)
        top_results = results[:top_n]

        # 统计
        strong_count = sum(1 for r in top_results if "✅" in r["recommendation"])
        consider_count = sum(1 for r in top_results if "⚠️" in r["recommendation"])

        return {
            "job_id": job_id,
            "job_title": job_title,
            "job_requirements": job_requirements,
            "total_candidates": len(results),
            "recommendations": top_results,
            "statistics": {
                "strongly_recommended": strong_count,
                "worth_considering": consider_count,
                "not_recommended": len(top_results) - strong_count - consider_count
            },
            "ai_summary": self._generate_referral_summary(top_results, job_title)
        }

    def _calc_student_match(
        self,
        student: Dict[str, Any],
        job_requirements: List[str],
        job_title: str,
        job_keywords: set
    ) -> float:
        """计算单个学生的匹配度"""
        score = 0.0

        # 1. 学生优势 vs 岗位要求（占50%）
        strength_matches = 0
        for req in job_requirements:
            for strength in student.get("strengths", []):
                if any(kw.lower() in strength.lower() or strength.lower() in kw.lower()
                       for kw in req.split() if len(kw) > 1):
                    strength_matches += 1
                    break

        if job_requirements:
            score += min((strength_matches / len(job_requirements)) * 50, 50)

        # 2. 学生标签 vs 岗位关键词（占30%）
        student_tags = student.get("tags", [])
        tag_matches = 0
        for keyword in job_keywords:
            for tag in student_tags:
                if keyword.lower() in tag.lower() or tag.lower() in keyword.lower():
                    tag_matches += 1
                    break

        if job_keywords:
            score += min((tag_matches / max(len(job_keywords), 1)) * 30, 30)

        # 3. 适合岗位 vs 岗位名称（占20%）
        suitable_jobs = student.get("suitable_jobs", [])
        title_match = 0
        for suitable in suitable_jobs:
            if suitable.lower() in job_title.lower() or job_title.lower() in suitable.lower():
                title_match = 1
                break
        score += title_match * 20

        return min(round(score, 1), 100.0)

    def _analyze_gap(
        self,
        student: Dict[str, Any],
        job_requirements: List[str],
        job_title: str
    ) -> Dict[str, Any]:
        """
        差距分析：逐项对比岗位要求和学生能力

        返回：
        - matched: 已匹配的项
        - gaps: 差距项（含severity和建议）
        - gap_suggestion: 一句话调剂建议
        """
        matched = []
        gaps = []

        student_strengths = [s.lower() for s in student.get("strengths", [])]
        student_tags = [t.lower() for t in student.get("tags", [])]
        student_all = student_strengths + student_tags

        for req in job_requirements:
            req_lower = req.lower()
            matched_flag = False

            for sa in student_all:
                if req_lower in sa or sa in req_lower or \
                   any(word in sa for word in req_lower.split() if len(word) > 2):
                    matched_flag = True
                    break

            if matched_flag:
                matched.append({
                    "requirement": req,
                    "status": "✅ 已匹配",
                    "evidence": next((s for s in student.get("strengths", [])
                                      if req_lower in s.lower() or s.lower() in req_lower),
                               student.get("tags", [""])[0])
                })
            else:
                # 判断差距严重程度
                severity = "🟡 部分匹配"
                suggestion = f"可在入职后补充学习「{req}」"

                if any(kw in req_lower for kw in ["精通", "资深", "5年", "3年"]):
                    severity = "🔴 差距较大"
                    suggestion = f"该要求较高，建议降低此条要求或提供培训"
                elif any(kw in req_lower for kw in ["熟练", "经验"]):
                    severity = "🟡 部分匹配"
                    suggestion = f"可安排1-2周岗前培训补充「{req}」技能"

                gaps.append({
                    "requirement": req,
                    "status": "❌ 未匹配",
                    "severity": severity,
                    "suggestion": suggestion
                })

        # 生成调剂建议
        gap_count = len(gaps)
        if gap_count == 0:
            gap_suggestion = "全部要求已匹配，可直接录用"
        elif gap_count <= 2:
            gap_suggestion = f"有{gap_count}项差距，建议面试后决定是否录用，或安排短期培训"
        else:
            gap_suggestion = f"有{gap_count}项差距较大，建议降低部分要求或考虑其他候选人"

        return {
            "matched_items": matched,
            "gap_items": gaps,
            "matched_count": len(matched),
            "gap_count": gap_count,
            "gap_suggestion": gap_suggestion
        }

    def _generate_referral_summary(
        self,
        recommendations: List[Dict[str, Any]],
        job_title: str
    ) -> str:
        """生成 AI 调剂建议总结"""
        strong = [r for r in recommendations if "✅" in r["recommendation"]]
        consider = [r for r in recommendations if "⚠️" in r["recommendation"]]

        if strong:
            names = "、".join(r["student"]["name"] for r in strong[:3])
            return f"推荐优先考虑「{names}」等{len(strong)}位同学，匹配度较高，建议直接面试或录用。"
        elif consider:
            names = "、".join(r["student"]["name"] for r in consider[:3])
            return f"「{names}」等{len(consider)}位同学可考虑调剂，但需在面试中重点考察差距项。"
        else:
            return f"当前候选人池中没有与「{job_title}」高度匹配的同学，建议放宽岗位要求或扩大搜索范围。"


# 创建全局实例
matching_service = MatchingService()
