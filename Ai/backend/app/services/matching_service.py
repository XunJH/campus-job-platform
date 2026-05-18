"""
Matching service for student-job and employer-candidate recommendations.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional, Tuple

import requests

from ..core.config import settings
from ..models.ai_models import Job, MatchResult, PersonalityProfile
from .ai_provider import _ai_service

CAMPUS_JOB_API = settings.CAMPUS_JOB_API_URL

TERM_LABELS: Dict[str, str] = {
    "part_time": "兼职",
    "full_time": "全职",
    "internship": "实习",
    "temporary": "临时",
    "on_campus": "校内",
    "remote": "远程",
    "hybrid": "混合",
    "hourly": "时薪",
    "daily": "日薪",
    "weekly": "周薪",
    "monthly": "月薪",
    "per_project": "项目制",
    "new": "新投递",
    "screening": "待筛选",
    "interview_shortlist": "待面试",
    "interview_confirmed": "已确认面试",
    "rejected_pool": "已淘汰",
    "archived": "已归档",
    "new_submission": "新投递",
    "shortlist": "待面试",
    "interview": "面试中",
    "confirmed_interview": "已确认面试",
    "offered": "已录用",
    "pending": "流程处理中",
    "approved": "已通过",
    "rejected": "已淘汰",
    "withdrawn": "已撤回",
}


def _humanize_term(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    return TERM_LABELS.get(text.lower(), text)


def _humanize_text(text: str) -> str:
    result = str(text or "")
    for key, label in sorted(TERM_LABELS.items(), key=lambda item: len(item[0]), reverse=True):
        pattern = rf"(?<![A-Za-z0-9_]){re.escape(key)}(?![A-Za-z0-9_])"
        result = re.sub(pattern, label, result, flags=re.IGNORECASE)
    return result


def _split_text_terms(text: str) -> List[str]:
    if not text:
        return []

    return [
        item.strip()
        for item in re.split(r"[\n,，、；;|/]+", text)
        if item and item.strip()
    ]


def _normalize_terms(items: List[Any]) -> List[str]:
    seen = set()
    normalized: List[str] = []

    for item in items:
        cleaned = _humanize_term(item)
        if not cleaned:
            continue
        lowered = cleaned.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        normalized.append(cleaned)

    return normalized


def _tokenize_keywords(text: str) -> List[str]:
    raw_tokens = re.split(r"[\s,，。、；;|/()（）]+", _humanize_text(text or ""))
    return _normalize_terms([token for token in raw_tokens if len(token.strip()) >= 2])


class MatchingService:
    def __init__(self) -> None:
        self.student_pool = self._init_student_pool()

    def _build_internal_headers(self) -> Dict[str, str]:
        return {"X-AI-Service-Token": settings.AI_INTERNAL_TOKEN}

    def _fetch_real_jobs(self) -> List[Job]:
        try:
            response = requests.get(
                f"{CAMPUS_JOB_API}/jobs",
                params={"page": 1, "limit": 100},
                timeout=8,
            )
            response.raise_for_status()
            payload = response.json()
            if not payload.get("success"):
                return []

            jobs: List[Job] = []
            for item in payload.get("data", {}).get("jobs", []):
                requirements_raw = item.get("requirements", [])
                if isinstance(requirements_raw, list):
                    requirements = _normalize_terms(requirements_raw)
                else:
                    requirements = _normalize_terms(_split_text_terms(str(requirements_raw)))

                tags = _normalize_terms(
                    [
                        item.get("category", ""),
                        item.get("jobType", ""),
                        item.get("salaryType", ""),
                        item.get("workLocation", ""),
                    ]
                )

                description = _humanize_text(str(item.get("description", "") or ""))
                tags.extend(_tokenize_keywords(description)[:6])
                tags = _normalize_terms(tags)

                employer = item.get("employer") or {}
                company = employer.get("username") or employer.get("companyName") or "未知企业"

                jobs.append(
                    Job(
                        id=str(item.get("id", "")),
                        title=_humanize_text(item.get("title", "未命名岗位")),
                        company=_humanize_text(company),
                        requirements=requirements,
                        tags=tags,
                        description=description,
                    )
                )

            return jobs
        except Exception as error:
            print(f"[MatchingService] Failed to fetch real jobs: {error}")
            return []

    def fetch_personality_profile(self, user_id: str) -> Optional[PersonalityProfile]:
        try:
            response = requests.get(
                f"{CAMPUS_JOB_API}/auth/internal/personality-profile/{user_id}",
                headers=self._build_internal_headers(),
                timeout=8,
            )
            response.raise_for_status()
            payload = response.json()
            profile = payload.get("data", {}).get("profile")
            if not profile:
                return None
            return PersonalityProfile(**profile)
        except Exception as error:
            print(f"[MatchingService] Failed to fetch personality profile: {error}")
            return None

    def _normalize_recruitment_context(self, value: Any) -> Optional[Dict[str, Any]]:
        if not isinstance(value, dict):
            return None

        return {
            "application_id": value.get("application_id"),
            "application_status": value.get("application_status"),
            "application_stage": value.get("application_stage"),
            "applied_at": value.get("applied_at"),
            "stage_updated_at": value.get("stage_updated_at"),
            "has_conversation": bool(value.get("has_conversation")),
            "conversation_status": value.get("conversation_status"),
            "last_message_at": value.get("last_message_at"),
            "in_pipeline": bool(value.get("in_pipeline")),
            "pipeline_priority": int(value.get("pipeline_priority") or 0),
            "next_action": _humanize_text(str(value.get("next_action") or "")) or None,
        }

    def _fetch_real_students(self, job_id: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            params: Dict[str, Any] = {"limit": 300}
            if job_id:
                params["jobId"] = job_id

            response = requests.get(
                f"{CAMPUS_JOB_API}/auth/internal/candidate-profiles",
                headers=self._build_internal_headers(),
                params=params,
                timeout=8,
            )
            response.raise_for_status()
            payload = response.json()
            candidates = payload.get("data", {}).get("candidates", [])
            if not isinstance(candidates, list):
                return []

            normalized_candidates: List[Dict[str, Any]] = []
            for item in candidates:
                normalized_candidates.append(
                    {
                        "student_id": str(item.get("student_id") or item.get("studentId") or ""),
                        "name": _humanize_text(item.get("name", "未命名学生")),
                        "major": _humanize_text(item.get("major", "")),
                        "grade": _humanize_text(item.get("grade", "")),
                        "bio": _humanize_text(item.get("bio", "")),
                        "summary": _humanize_text(item.get("summary", "")),
                        "tags": _normalize_terms(item.get("tags", []) or []),
                        "strengths": _normalize_terms(item.get("strengths", []) or []),
                        "suitable_jobs": _normalize_terms(item.get("suitable_jobs", []) or []),
                        "dimensions": item.get("dimensions", {}) or {},
                        "resume_image": item.get("resume_image", "") or "",
                        "has_resume_image": bool(item.get("has_resume_image")),
                        "credit_score": int(item.get("credit_score") or 0),
                        "completed_at": item.get("completed_at"),
                        "created_at": item.get("created_at"),
                        "recruitment_context": self._normalize_recruitment_context(item.get("recruitment_context")),
                        "source": "platform",
                    }
                )

            return normalized_candidates
        except Exception as error:
            print(f"[MatchingService] Failed to fetch real students: {error}")
            return []

    @property
    def job_pool(self) -> List[Job]:
        return self._fetch_real_jobs() or []

    def _candidate_pool(self, job_id: Optional[str] = None) -> List[Dict[str, Any]]:
        real_students = self._fetch_real_students(job_id)
        return real_students or self.student_pool

    def _init_student_pool(self) -> List[Dict[str, Any]]:
        return [
            {
                "student_id": "stu001",
                "name": "张同学",
                "major": "计算机科学",
                "grade": "大二",
                "bio": "偏技术型，擅长结构化分析和独立完成任务。",
                "summary": "细心、逻辑强，适合技术支持和数据处理类岗位。",
                "tags": ["技术类", "细心", "逻辑强", "自学能力"],
                "strengths": ["编程", "数据分析", "逻辑思维"],
                "suitable_jobs": ["数据标注", "程序员助理", "技术支持"],
                "dimensions": {
                    "外向性": 0.4,
                    "尽责性": 0.8,
                    "开放性": 0.7,
                    "宜人性": 0.6,
                    "情绪稳定性": 0.7,
                },
                "resume_image": "",
                "has_resume_image": False,
                "credit_score": 92,
                "completed_at": None,
                "created_at": None,
                "recruitment_context": None,
                "source": "mock",
            },
            {
                "student_id": "stu002",
                "name": "李同学",
                "major": "市场营销",
                "grade": "大三",
                "bio": "沟通主动，适合活动、社群和推广类岗位。",
                "summary": "外向、表达强，适合校园推广和活动执行岗位。",
                "tags": ["外向", "沟通", "创意", "社交"],
                "strengths": ["沟通表达", "活动策划", "人际交往"],
                "suitable_jobs": ["促销员", "校园代理", "活动策划"],
                "dimensions": {
                    "外向性": 0.9,
                    "尽责性": 0.6,
                    "开放性": 0.8,
                    "宜人性": 0.7,
                    "情绪稳定性": 0.5,
                },
                "resume_image": "",
                "has_resume_image": False,
                "credit_score": 88,
                "completed_at": None,
                "created_at": None,
                "recruitment_context": None,
                "source": "mock",
            },
            {
                "student_id": "stu003",
                "name": "王同学",
                "major": "英语",
                "grade": "大一",
                "bio": "耐心稳定，适合教学辅助和客服支持岗位。",
                "summary": "耐心细致，适合教学与服务类兼职。",
                "tags": ["耐心", "细致", "认真", "稳定"],
                "strengths": ["语言能力", "耐心辅导", "服务意识"],
                "suitable_jobs": ["家教", "翻译助理", "客服"],
                "dimensions": {
                    "外向性": 0.3,
                    "尽责性": 0.9,
                    "开放性": 0.5,
                    "宜人性": 0.8,
                    "情绪稳定性": 0.8,
                },
                "resume_image": "",
                "has_resume_image": False,
                "credit_score": 90,
                "completed_at": None,
                "created_at": None,
                "recruitment_context": None,
                "source": "mock",
            },
        ]

    def get_all_jobs(self) -> List[Dict[str, Any]]:
        return [job.model_dump() for job in self.job_pool]

    def match_jobs(self, personality_profile: PersonalityProfile, top_n: int = 5) -> List[MatchResult]:
        user_tags = _normalize_terms(personality_profile.tags)
        user_strengths = _normalize_terms(personality_profile.strengths)
        suitable_jobs = _normalize_terms(personality_profile.suitable_jobs)

        results: List[MatchResult] = []
        for job in self.job_pool:
            base_score = self._calculate_base_score(user_tags, user_strengths, suitable_jobs, job)
            match_reasons = self._generate_match_reasons(personality_profile, job, base_score)
            warnings = self._generate_warnings(personality_profile, job)
            results.append(
                MatchResult(
                    job=job,
                    match_score=base_score,
                    match_reasons=match_reasons,
                    warnings=warnings,
                )
            )

        results.sort(key=lambda item: item.match_score, reverse=True)
        return results[:top_n]

    def _calculate_base_score(
        self,
        user_tags: List[str],
        user_strengths: List[str],
        suitable_jobs: List[str],
        job: Job,
    ) -> float:
        job_terms = _normalize_terms(job.tags + job.requirements + _tokenize_keywords(job.title))
        tag_hits = self._count_soft_matches(user_tags, job_terms)
        strength_hits = self._count_soft_matches(user_strengths, job.requirements + job.tags)
        suitable_hits = self._count_soft_matches(suitable_jobs, [job.title] + job.tags)

        score = 0.0
        if user_tags:
            score += (tag_hits / len(user_tags)) * 35
        if user_strengths:
            score += (strength_hits / len(user_strengths)) * 35
        if suitable_jobs:
            score += (suitable_hits / len(suitable_jobs)) * 30

        return round(min(score, 100.0), 1)

    def _count_soft_matches(self, left_items: List[str], right_items: List[str]) -> int:
        count = 0
        right_joined = " ".join(item.lower() for item in right_items)

        for item in left_items:
            lowered = item.lower()
            if lowered and lowered in right_joined:
                count += 1

        return count

    def _generate_match_reasons(
        self,
        profile: PersonalityProfile,
        job: Job,
        base_score: float,
    ) -> List[str]:
        reasons: List[str] = []
        tags = _normalize_terms(profile.tags)
        strengths = _normalize_terms(profile.strengths)
        suitable_jobs = _normalize_terms(profile.suitable_jobs)
        job_terms = _normalize_terms(job.tags + job.requirements + _tokenize_keywords(job.title))
        job_term_text = " ".join(term.lower() for term in job_terms)
        job_requirement_text = " ".join(term.lower() for term in job.requirements + job.tags)

        matched_tags = [tag for tag in tags if tag.lower() in job_term_text]
        matched_strengths = [strength for strength in strengths if strength.lower() in job_requirement_text]
        matched_directions = [item for item in suitable_jobs if item.lower() in job_term_text]

        if matched_tags:
            reasons.append(f"候选人标签与岗位特质贴合：{matched_tags[0]}")
        if matched_strengths:
            reasons.append(f"核心优势与岗位要求相符：{matched_strengths[0]}")
        if matched_directions:
            reasons.append(f"求职方向与岗位类别一致：{matched_directions[0]}")

        if base_score >= 80:
            reasons.append("综合匹配度高，适合优先安排沟通。")
        elif base_score >= 60:
            reasons.append("岗位方向基本吻合，建议进一步筛选确认。")
        else:
            reasons.append("具备一定匹配基础，建议结合沟通结果综合判断。")

        if not reasons:
            reasons.append(f"综合匹配度约为 {base_score}%")

        unique_reasons: List[str] = []
        for item in reasons:
            humanized = _humanize_text(item)
            if humanized and humanized not in unique_reasons:
                unique_reasons.append(humanized)

        return unique_reasons[:3]

    def _generate_warnings(self, profile: PersonalityProfile, job: Job) -> List[str]:
        warnings: List[str] = []
        job_tags = " ".join(job.tags)

        if "夜班" in job_tags:
            warnings.append("该岗位涉及夜班，建议注意学习与作息安排。")

        if "提成" in job_tags:
            warnings.append("该岗位收入波动较大，建议提前确认结算规则。")

        if "体力" in job_tags and profile.dimensions.get("情绪稳定性", 0) < 0.5:
            warnings.append("该岗位节奏可能较快，建议关注工作压力与体力消耗。")

        return warnings

    def smart_referral(
        self,
        job_id: str,
        job_title: str,
        job_description: str = "",
        job_requirements: Optional[List[str]] = None,
        job_salary: Optional[str] = None,
        top_n: int = 10,
        include_gap_analysis: bool = True,
    ) -> Dict[str, Any]:
        job_title = _humanize_text(job_title)
        job_description = _humanize_text(job_description)
        job_requirements = _normalize_terms(job_requirements or [])
        extra_keywords = _normalize_terms(_tokenize_keywords(job_description))
        candidates = self._candidate_pool(job_id)
        results: List[Dict[str, Any]] = []

        for candidate in candidates:
            recruitment_context = self._normalize_recruitment_context(candidate.get("recruitment_context"))
            if self._should_skip_candidate(recruitment_context):
                continue

            score, breakdown, reasons = self._build_candidate_fit(
                candidate,
                job_title=job_title,
                job_description=job_description,
                job_requirements=job_requirements,
                extra_keywords=extra_keywords,
                recruitment_context=recruitment_context,
            )

            gap_analysis = (
                self._analyze_gap(candidate, job_requirements, extra_keywords)
                if include_gap_analysis
                else None
            )
            recommendation, recruit_condition = self._recommendation_from_score(
                score,
                gap_analysis,
                recruitment_context,
            )

            results.append(
                {
                    "student": self._serialize_candidate(candidate),
                    "match_score": score,
                    "recommendation": recommendation,
                    "recruit_condition": recruit_condition,
                    "candidate_readiness": self._build_readiness_label(candidate, recruitment_context),
                    "fit_breakdown": breakdown,
                    "match_reasons": reasons,
                    "gap_analysis": gap_analysis,
                }
            )

        results.sort(key=self._recommendation_sort_key, reverse=True)
        top_results = results[:top_n]

        strong_count = sum(1 for item in top_results if item["match_score"] >= 78)
        consider_count = sum(1 for item in top_results if 58 <= item["match_score"] < 78)

        return {
            "job_id": job_id,
            "job_title": job_title,
            "job_salary": _humanize_text(job_salary or "") or None,
            "job_requirements": job_requirements,
            "total_candidates": len(results),
            "candidate_source": "platform"
            if any(item["student"].get("source") == "platform" for item in top_results)
            else "mock",
            "recommendations": top_results,
            "statistics": {
                "strongly_recommended": strong_count,
                "worth_considering": consider_count,
                "not_recommended": len(top_results) - strong_count - consider_count,
            },
            "ai_summary": self._generate_referral_summary(top_results, job_title),
        }

    def _build_candidate_fit(
        self,
        candidate: Dict[str, Any],
        job_title: str,
        job_description: str,
        job_requirements: List[str],
        extra_keywords: List[str],
        recruitment_context: Optional[Dict[str, Any]] = None,
    ) -> Tuple[float, Dict[str, float], List[str]]:
        strengths = _normalize_terms(candidate.get("strengths", []))
        tags = _normalize_terms(candidate.get("tags", []))
        suitable_jobs = _normalize_terms(candidate.get("suitable_jobs", []))

        requirement_hits = self._match_text_groups(job_requirements, strengths + tags)
        keyword_hits = self._match_text_groups(extra_keywords, tags + strengths)
        role_keywords = _tokenize_keywords(job_title)
        role_hits = self._match_text_groups(role_keywords, suitable_jobs + tags)

        requirement_score = (
            (len(requirement_hits) / max(len(job_requirements), 1)) * 38 if job_requirements else 0
        )
        keyword_score = (
            (len(keyword_hits) / max(len(extra_keywords), 1)) * 18 if extra_keywords else 0
        )
        role_score = (len(role_hits) / max(len(role_keywords), 1)) * 14 if role_keywords else 0
        readiness_score = self._profile_readiness_score(candidate)
        pipeline_score = self._pipeline_fit_component(recruitment_context)
        credit_score = self._credit_score_component(candidate)

        total_score = round(
            min(
                requirement_score
                + keyword_score
                + role_score
                + readiness_score
                + pipeline_score
                + credit_score,
                100.0,
            ),
            1,
        )
        breakdown = {
            "requirements_fit": round(requirement_score, 1),
            "keyword_fit": round(keyword_score, 1),
            "role_fit": round(role_score, 1),
            "profile_readiness": round(readiness_score, 1),
            "pipeline_fit": round(pipeline_score, 1),
            "credit_score": round(credit_score, 1),
        }

        reasons = self._build_candidate_reasons(
            candidate=candidate,
            job_title=job_title,
            job_description=job_description,
            requirement_hits=requirement_hits,
            keyword_hits=keyword_hits,
            role_hits=role_hits,
            recruitment_context=recruitment_context,
            total_score=total_score,
        )

        return total_score, breakdown, reasons

    def _match_text_groups(self, left_items: List[str], right_items: List[str]) -> List[Dict[str, str]]:
        matches: List[Dict[str, str]] = []

        for left in left_items:
            left_lower = left.lower()
            for right in right_items:
                right_lower = right.lower()
                if not left_lower or not right_lower:
                    continue
                if left_lower in right_lower or right_lower in left_lower:
                    matches.append({"target": left, "candidate": right})
                    break

        return matches

    def _profile_readiness_score(self, candidate: Dict[str, Any]) -> float:
        score = 0.0
        if candidate.get("has_resume_image"):
            score += 4.0
        if candidate.get("completed_at"):
            score += 3.0
        if candidate.get("bio") or candidate.get("summary"):
            score += 3.0
        return min(score, 10.0)

    def _pipeline_fit_component(self, recruitment_context: Optional[Dict[str, Any]]) -> float:
        if not recruitment_context:
            return 0.0

        if recruitment_context.get("in_pipeline"):
            stage = str(recruitment_context.get("application_stage") or "").lower()
            stage_scores = {
                "new": 4.5,
                "screening": 6.5,
                "interview_shortlist": 8.0,
                "interview_confirmed": 10.0,
                "new_submission": 4.5,
                "shortlist": 8.0,
                "interview": 9.0,
                "confirmed_interview": 10.0,
                "offered": 10.0,
            }
            return stage_scores.get(stage, 5.0)

        if recruitment_context.get("has_conversation"):
            return 3.0

        return 0.0

    def _credit_score_component(self, candidate: Dict[str, Any]) -> float:
        raw_score = float(candidate.get("credit_score") or 0)
        if raw_score <= 0:
            return 0.0
        return max(min(((raw_score - 60) / 40) * 10, 10.0), 0.0)

    def _build_candidate_reasons(
        self,
        candidate: Dict[str, Any],
        job_title: str,
        job_description: str,
        requirement_hits: List[Dict[str, str]],
        keyword_hits: List[Dict[str, str]],
        role_hits: List[Dict[str, str]],
        recruitment_context: Optional[Dict[str, Any]],
        total_score: float,
    ) -> List[str]:
        reasons: List[str] = []

        if recruitment_context and recruitment_context.get("in_pipeline"):
            stage_label = self._stage_label(recruitment_context.get("application_stage"))
            reasons.append(f"已在当前岗位流程中，当前阶段为“{stage_label}”。")

        if requirement_hits:
            matched_text = "、".join(hit["target"] for hit in requirement_hits[:2])
            reasons.append(f"已命中关键要求：{matched_text}")

        if role_hits:
            matched_roles = "、".join(hit["candidate"] for hit in role_hits[:2])
            reasons.append(f"候选人画像与岗位方向贴合：{matched_roles}")

        if candidate.get("has_resume_image") and len(reasons) < 3:
            reasons.append("已上传简历图片，便于企业快速查看完整资料。")

        if len(reasons) < 3 and keyword_hits:
            reasons.append(f"与岗位关键词存在重合：{keyword_hits[0]['candidate']}")

        if len(reasons) < 3 and candidate.get("summary"):
            reasons.append(str(candidate["summary"])[:40])

        if len(reasons) < 3:
            reasons.append(f"综合匹配度约为 {total_score}%")

        return reasons[:3]

    def _recommendation_from_score(
        self,
        score: float,
        gap_analysis: Optional[Dict[str, Any]],
        recruitment_context: Optional[Dict[str, Any]],
    ) -> Tuple[str, str]:
        if recruitment_context and recruitment_context.get("in_pipeline"):
            stage = str(recruitment_context.get("application_stage") or "").lower()
            if stage in {"interview_confirmed", "confirmed_interview", "offered"}:
                return "已确认重点推进", "已在重点推进名单中，建议优先确认到场和后续安排。"
            if stage in {"interview_shortlist", "interview"}:
                return "优先安排面试", "已进入待面试阶段，建议尽快确认具体面试时间。"
            if stage == "screening":
                return "优先二次筛选", "已进入筛选流程，建议结合差距分析继续推进。"
            return "优先跟进沟通", "候选人已经进入申请流程，建议优先结合差距分析继续筛选。"

        if score >= 78:
            return "强烈推荐", "建议优先发起沟通，并尽快推进到筛选或面试阶段。"
        if score >= 58:
            if gap_analysis and gap_analysis.get("gap_count", 0) <= 2:
                return "优先沟通", "存在少量待确认项，建议先沟通再决定是否安排面试。"
            return "可作为备选", "建议先放入待筛选池，确认关键问题后再推进。"
        if score >= 40:
            return "保留观察", "可暂时保留在候选池，等待更合适岗位或补充资料。"
        return "暂不推荐", "当前与岗位要求差距较大，建议优先查看其他候选人。"

    def _serialize_candidate(self, candidate: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "student_id": candidate.get("student_id", ""),
            "name": candidate.get("name", "未命名学生"),
            "major": candidate.get("major", ""),
            "grade": candidate.get("grade", ""),
            "bio": _humanize_text(candidate.get("bio", "")),
            "summary": _humanize_text(candidate.get("summary", "")),
            "tags": _normalize_terms(candidate.get("tags", [])),
            "strengths": _normalize_terms(candidate.get("strengths", [])),
            "suitable_jobs": _normalize_terms(candidate.get("suitable_jobs", [])),
            "credit_score": candidate.get("credit_score", 0),
            "has_resume_image": bool(candidate.get("has_resume_image")),
            "resume_image": candidate.get("resume_image", ""),
            "recruitment_context": self._normalize_recruitment_context(candidate.get("recruitment_context")),
            "source": candidate.get("source", "mock"),
        }

    def _build_readiness_label(
        self,
        candidate: Dict[str, Any],
        recruitment_context: Optional[Dict[str, Any]],
    ) -> str:
        if recruitment_context and recruitment_context.get("in_pipeline"):
            return f"当前流程：{self._stage_label(recruitment_context.get('application_stage'))}"
        if candidate.get("has_resume_image") and candidate.get("completed_at"):
            return "资料完整，可直接沟通"
        if candidate.get("completed_at"):
            return "画像已完成，建议补充简历"
        return "资料待完善"

    def _analyze_gap(
        self,
        candidate: Dict[str, Any],
        job_requirements: List[str],
        extra_keywords: List[str],
    ) -> Dict[str, Any]:
        candidate_terms = _normalize_terms(
            candidate.get("strengths", [])
            + candidate.get("tags", [])
            + candidate.get("suitable_jobs", [])
        )

        matched_items: List[Dict[str, str]] = []
        gap_items: List[Dict[str, str]] = []

        for requirement in job_requirements:
            requirement_lower = requirement.lower()
            matched_term = next(
                (
                    term
                    for term in candidate_terms
                    if requirement_lower in term.lower() or term.lower() in requirement_lower
                ),
                None,
            )

            if matched_term:
                matched_items.append(
                    {
                        "requirement": requirement,
                        "evidence": matched_term,
                    }
                )
            else:
                gap_items.append(
                    {
                        "requirement": requirement,
                        "severity": "较高" if len(requirement) >= 6 else "中等",
                        "suggestion": f"建议在沟通或面试中重点确认“{requirement}”。",
                    }
                )

        if not job_requirements and extra_keywords:
            for keyword in extra_keywords[:3]:
                matched_term = next(
                    (
                        term
                        for term in candidate_terms
                        if keyword.lower() in term.lower() or term.lower() in keyword.lower()
                    ),
                    None,
                )
                if matched_term:
                    matched_items.append(
                        {
                            "requirement": keyword,
                            "evidence": matched_term,
                        }
                    )

        gap_count = len(gap_items)
        if gap_count == 0:
            suggestion = "岗位关键要求基本命中，可直接安排沟通或面试。"
        elif gap_count <= 2:
            suggestion = "存在少量差距，建议先沟通确认可培养空间。"
        else:
            suggestion = "关键差距较多，建议优先查看其他候选人或适当放宽要求。"

        return {
            "matched_items": matched_items,
            "gap_items": gap_items,
            "matched_count": len(matched_items),
            "gap_count": gap_count,
            "gap_suggestion": suggestion,
        }

    def _generate_referral_summary(self, recommendations: List[Dict[str, Any]], job_title: str) -> str:
        if not recommendations:
            return f"当前没有适合“{job_title}”的候选人，建议扩大搜索范围或补充学生画像。"

        pipeline_items = [
            item
            for item in recommendations
            if item["student"].get("recruitment_context", {}).get("in_pipeline")
        ]
        strong = [item for item in recommendations if item["match_score"] >= 78]
        medium = [item for item in recommendations if 58 <= item["match_score"] < 78]

        if pipeline_items:
            names = "、".join(item["student"]["name"] for item in pipeline_items[:3])
            return (
                f"当前推荐里有 {len(pipeline_items)} 位候选人已经进入你的招聘流程，"
                f"建议优先查看 {names} 的最新阶段和沟通状态，避免重点人选被新消息淹没。"
            )

        if strong:
            names = "、".join(item["student"]["name"] for item in strong[:3])
            return f"建议优先联系 {names}，这批候选人在岗位要求、岗位方向和资料完整度上最接近当前岗位。"

        if medium:
            names = "、".join(item["student"]["name"] for item in medium[:3])
            return f"{names} 可作为第二梯队候选人，建议先沟通确认关键差距，再决定是否推进面试。"

        return f"当前候选池中与“{job_title}”高度匹配的人选较少，建议继续积累候选人或调整岗位要求。"

    def _should_skip_candidate(self, recruitment_context: Optional[Dict[str, Any]]) -> bool:
        if not recruitment_context:
            return False

        status = str(recruitment_context.get("application_status") or "").lower()
        stage = str(recruitment_context.get("application_stage") or "").lower()
        return status in {"withdrawn", "rejected"} or stage in {"rejected_pool", "archived"}

    def _stage_label(self, stage: Optional[str]) -> str:
        return _humanize_term(stage) or "未进入流程"

    def _recommendation_sort_key(self, item: Dict[str, Any]) -> Tuple[int, int, float]:
        context = item["student"].get("recruitment_context") or {}
        in_pipeline = 1 if context.get("in_pipeline") else 0
        pipeline_priority = int(context.get("pipeline_priority") or 0)
        return in_pipeline, pipeline_priority, item["match_score"]


matching_service = MatchingService()
