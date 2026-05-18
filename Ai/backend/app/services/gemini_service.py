"""Mock Gemini service used as a fast fallback for defense/demo flows."""

from __future__ import annotations

import json
import re
from typing import Any, Optional


class GeminiService:
    """Deterministic mock AI service for fallback and demo scenarios."""

    _instance: Optional["GeminiService"] = None
    _initialized: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not GeminiService._initialized:
            self._configure()
            GeminiService._initialized = True

    def _configure(self) -> None:
        print("[MOCK] Using mock Gemini service - no real API calls")
        print("[MOCK] To use real API, set USE_MOCK=false and add GEMINI_API_KEY")

    def generate_text(self, prompt: str, temperature: float = 0.7) -> str:
        lower_prompt = prompt.lower()

        if "suitable_jobs" in lower_prompt and ("人格" in prompt or "personality" in lower_prompt):
            return self._to_json(self._build_personality_payload())
        if "信用分" in prompt or "credit" in lower_prompt:
            return self._to_json(self._build_credit_score_payload())
        if "verify" in lower_prompt or "审核" in prompt:
            return self._to_json(self._build_verification_payload(prompt))

        return "这是演示模式下的基础回复，系统已根据当前输入生成可继续联调和演示的建议。"

    def generate_structured_response(
        self,
        prompt: str,
        response_format: dict,
        temperature: float = 0.7,
    ) -> dict:
        lower_prompt = prompt.lower()

        if "risk_warnings" in lower_prompt and "scores" in response_format:
            return self._build_interview_evaluation_payload()
        if "人格" in prompt or "personality" in lower_prompt:
            return self._build_personality_payload()
        if "信用分" in prompt or "credit" in lower_prompt:
            return self._build_credit_score_payload()

        return self._fill_template(response_format)

    def chat(self, messages: list, temperature: float = 0.7) -> str:
        system_prompt = "\n".join(
            str(item.get("content", ""))
            for item in messages
            if str(item.get("role", "")).lower() == "system"
        )
        user_message = str(messages[-1].get("content", "")) if messages else ""
        payload = self._infer_chat_payload(system_prompt, user_message)
        if isinstance(payload, (dict, list)):
            return self._to_json(payload)
        return str(payload)

    def _infer_chat_payload(self, system_prompt: str, user_message: str) -> Any:
        full_text = f"{system_prompt}\n{user_message}"
        lower_text = full_text.lower()

        if "用户意图分析助手" in system_prompt or ('"intent"' in full_text and '"key_entities"' in full_text):
            return self._build_intent_payload(user_message)
        if "对话安全审核专家" in system_prompt and '"is_safe"' in full_text:
            return self._build_message_guard_payload(user_message)
        if "聊天风控助手" in system_prompt and '"has_risk"' in full_text:
            return self._build_chat_warning_payload(user_message)
        if "简历优化顾问" in system_prompt:
            return self._build_resume_optimize_payload(user_message)
        if "求职顾问" in system_prompt and '"rejection_reasons"' in full_text:
            return self._build_rejection_analysis_payload(user_message)
        if "简历撰写专家" in system_prompt and '"formatted_experience"' in full_text:
            return self._build_resume_update_payload(user_message)
        if "评价审核 ai" in lower_text and '"sentiment"' in full_text:
            return self._build_student_review_payload(user_message)
        if "企业评价分析 ai" in lower_text and '"ability_tags"' in full_text:
            return self._build_employer_review_payload(user_message)
        if "口碑分析 ai" in lower_text and '"overall_reputation"' in full_text:
            return self._build_review_summary_payload(user_message)
        if "职业规划顾问" in system_prompt and '"steps"' in full_text:
            return self._build_career_path_payload(user_message)
        if "认证审核助手" in system_prompt and '"is_valid"' in full_text:
            return self._build_verification_payload(user_message)
        if "岗位安全审核专家" in system_prompt and '"is_suspicious"' in full_text:
            return self._build_fraud_check_payload(user_message)
        if "面试官" in system_prompt or "模拟面试" in system_prompt:
            return self._build_interview_reply(user_message)
        if "校园招聘ai助手" in lower_text or "小招" in full_text:
            return "建议先确认岗位核心要求、筛选标准和沟通节奏，再逐项推进，这样招聘效率会更稳。"
        if "校园兼职平台ai助手" in lower_text or "小兼" in full_text:
            return "可以先确认岗位内容、时间安排和结算方式，再结合自己的课程节奏决定是否投递。"

        return "已收到你的问题，建议优先核对岗位要求、沟通留痕和时间安排，再继续推进。"

    def _build_personality_payload(self) -> dict:
        return {
            "tags": ["认真负责", "学习能力强", "沟通顺畅", "执行稳定"],
            "strengths": [
                "面对任务时执行节奏稳定，能够按要求推进并及时反馈。",
                "学习新内容的接受速度较快，适合在实践中持续提升。",
            ],
            "weaknesses": [
                "在高压场景下还需要继续训练临场表达和节奏控制。",
                "建议补充更多真实案例，让个人优势更容易被岗位方识别。",
            ],
            "suitable_jobs": ["运营助理", "内容整理", "校园推广", "数据支持"],
            "summary": "整体表现踏实稳定，适合从需要执行力和学习能力的校园岗位切入。 ",
        }

    def _build_credit_score_payload(self) -> dict:
        return {
            "score": 86,
            "level": "良好",
            "factors": {
                "completion_rate": 96.0,
                "rating": 4.8,
                "response_rate": 95.0,
                "history_months": 8,
            },
        }

    def _build_intent_payload(self, user_message: str) -> dict:
        text = self._extract_user_input(user_message)
        lower = text.lower()

        if self._contains_any(lower, ["你好", "您好", "hi", "hello", "在吗"]):
            intent = "greeting"
            entities = ["问候"]
        elif self._contains_any(lower, ["简历", "润色", "优化"]):
            intent = "resume_consult"
            entities = ["简历"]
        elif self._contains_any(lower, ["安全", "诈骗", "被骗", "风险"]):
            intent = "safety_consult"
            entities = ["安全风险"]
        elif self._contains_any(lower, ["找工作", "岗位", "投递", "兼职", "实习"]):
            intent = "job_search"
            entities = ["岗位"]
        elif self._contains_any(lower, ["平台", "认证", "审核", "工单"]):
            intent = "platform_consult"
            entities = ["平台功能"]
        elif self._contains_any(lower, ["技能", "学习", "面试", "能力"]):
            intent = "skill_consult"
            entities = ["能力提升"]
        else:
            intent = "other"
            entities = []

        if self._contains_any(lower, ["焦虑", "担心", "不安", "失败", "被骗"]):
            emotion = "negative"
        elif self._contains_any(lower, ["谢谢", "不错", "开心", "满意"]):
            emotion = "positive"
        else:
            emotion = "neutral"

        return {
            "intent": intent,
            "confidence": 0.86,
            "emotion": emotion,
            "key_entities": entities,
        }

    def _build_message_guard_payload(self, user_message: str) -> dict:
        text = self._extract_user_input(user_message)
        lowered = text.lower()

        categories = []
        warning = ""
        suggestion = ""
        risk_level = "low"
        is_safe = True

        if self._contains_any(lowered, ["转账", "押金", "培训费", "保证金", "体检费", "扫码付款"]):
            is_safe = False
            risk_level = "high"
            categories.append("诱导缴费")
            warning = "当前消息涉及前置收费或转账要求，存在明显风险。"
            suggestion = "删除收费、转账、押金等表述，改为平台内合规的录用和结算说明。"
        elif self._contains_any(lowered, ["微信", "qq", "私聊", "加群", "下载app", "二维码"]):
            is_safe = False
            risk_level = "high"
            categories.append("诱导脱离平台")
            warning = "当前消息存在引导脱离平台沟通的风险。"
            suggestion = "尽量保留平台内沟通，不要要求对方转到站外联系。"
        elif self._contains_any(lowered, ["身份证", "银行卡", "验证码", "家庭住址", "父母电话"]):
            is_safe = False
            risk_level = "high"
            categories.append("隐私泄露")
            warning = "当前消息涉及敏感个人信息索取，存在较高风险。"
            suggestion = "仅收集合规履约必需的信息，避免索取敏感隐私。"
        elif self._contains_any(lowered, ["工资", "薪资", "克扣", "不包吃住", "不确定时间"]):
            risk_level = "medium"
            categories.append("沟通信息不充分")
            warning = "当前消息对薪资或工作条件说明不够充分，建议补充确认。"
            suggestion = "补充工作时间、地点、结算方式等关键信息，减少误解。"

        return {
            "is_safe": is_safe,
            "risk_level": risk_level,
            "risk_categories": categories,
            "warning_message": warning,
            "suggestion": suggestion,
        }

    def _build_chat_warning_payload(self, user_message: str) -> dict:
        text = self._extract_user_input(user_message)
        lowered = text.lower()

        risks = []
        if self._contains_any(lowered, ["押金", "保证金", "培训费", "先交", "转账"]):
            risks.append(
                {
                    "type": "前置收费",
                    "severity": "critical",
                    "description": "消息中出现录用前收费或转账要求，属于高危招聘风险。",
                    "evidence": self._extract_keyword(text, ["押金", "保证金", "培训费", "先交", "转账"]),
                    "suggested_action": "立即停止发送该类表述，改为平台内正式录用和结算说明。",
                }
            )
        if self._contains_any(lowered, ["微信", "qq", "私聊", "线下见面", "别走平台"]):
            risks.append(
                {
                    "type": "站外引流",
                    "severity": "high",
                    "description": "消息中存在引导脱离平台沟通的倾向，会削弱平台留痕和维权能力。",
                    "evidence": self._extract_keyword(text, ["微信", "QQ", "私聊", "线下见面", "别走平台"]),
                    "suggested_action": "继续使用平台内沟通，避免要求学生转移到站外联系。",
                }
            )

        return {"has_risk": bool(risks), "risks": risks}

    def _build_resume_optimize_payload(self, user_message: str) -> dict:
        text = self._extract_user_input(user_message)
        content_match = re.search(r"<<<USER_INPUT>>>\s*(.*?)\s*<<</USER_INPUT>>>", user_message, re.DOTALL)
        original = (content_match.group(1).strip() if content_match else text).splitlines()
        snippet = next((line.strip() for line in original if line.strip()), text[:40] or "原始内容")

        improved = self._resume_bullet(snippet)
        return {
            "score": 78,
            "issues": [
                "描述偏口语化，成果感不够强。",
                "缺少动作和结果，岗位匹配点还不够明确。",
            ],
            "suggestions": [
                {
                    "original": snippet[:80],
                    "improved": improved,
                    "reason": "补足动作、场景和结果后，更像正式投递简历里的可用 bullet。",
                }
            ],
            "overall_tip": "优先把经历改成“动作 + 方法 + 结果”的短句，会比泛泛描述更有说服力。",
        }

    def _build_rejection_analysis_payload(self, user_message: str) -> dict:
        return {
            "rejection_reasons": [
                {
                    "reason": "岗位匹配度表达不够直接",
                    "likelihood": "高",
                    "explanation": "简历和沟通内容里对岗位关键词和相关经历的映射还不够明确。",
                },
                {
                    "reason": "项目成果不够量化",
                    "likelihood": "中",
                    "explanation": "缺少数字、结果或具体影响，招聘方较难快速判断价值。",
                },
            ],
            "skill_gaps": ["岗位关键词表达", "成果量化能力"],
            "improvement_steps": [
                {
                    "step": 1,
                    "action": "针对目标岗位补充 2 到 3 条最相关的经历 bullet。",
                    "timeframe": "1-2天",
                    "resource": "对照岗位 JD 补齐关键词和成果数据",
                },
                {
                    "step": 2,
                    "action": "把项目或兼职经历改成动作、方法、结果三段式表达。",
                    "timeframe": "3-5天",
                    "resource": "使用 STAR 法则逐条重写核心经历",
                },
            ],
            "next_application_tips": [
                "投递前先把简历关键词和岗位要求逐条对齐。",
                "面试或沟通时优先说明自己最接近岗位要求的两段经历。",
            ],
            "encouragement": "这次落选更像是表达层面的差距，继续优化材料后会更有竞争力。",
        }

    def _build_resume_update_payload(self, user_message: str) -> dict:
        text = self._extract_user_input(user_message)
        title = self._extract_field(user_message, "兼职岗位", "岗位")
        company = self._extract_field(user_message, "公司")
        duration = self._extract_field(user_message, "工作时长")

        bullet_seed = text.splitlines()[-1].strip() if text.splitlines() else "协助完成岗位日常任务"
        bullets = [
            self._resume_bullet(bullet_seed),
            "根据现场安排及时跟进任务反馈，保证沟通顺畅和执行节奏稳定。",
            "在真实业务场景中积累协作和问题处理经验，可作为简历中的实践经历补充。",
        ]

        return {
            "formatted_experience": {
                "title": title or "兼职岗位",
                "company": company or "合作企业",
                "duration": duration or "近期",
                "bullets": bullets,
            },
            "keywords": ["执行力", "沟通协作", "实践经验"],
            "add_to_resume": True,
            "add_reason": "这段经历具备真实场景、任务执行和可总结的成果点，适合写入正式简历。",
            "tips": "面试时优先说明你具体负责了什么、怎么推进、最终带来了什么结果。",
        }

    def _build_student_review_payload(self, user_message: str) -> dict:
        text = self._extract_user_input(user_message)
        negative = self._contains_any(text.lower(), ["混乱", "拖欠", "加班", "收费", "不推荐", "虚假"])
        return {
            "sentiment": "negative" if negative else "positive",
            "sentiment_score": 0.72 if negative else 0.86,
            "dimensions": {
                "salary_fulfillment": "negative" if "拖欠" in text else "positive",
                "work_environment": "neutral",
                "management_style": "negative" if "混乱" in text else "positive",
                "task_description_match": "negative" if "虚假" in text else "positive",
                "would_recommend": "negative" if negative else "positive",
            },
            "keywords": ["沟通反馈", "岗位体验"] if not negative else ["流程混乱", "岗位偏差"],
            "is_suspicious": False,
            "suspicious_reason": None,
            "has_risk_flag": "收费" in text or "拖欠" in text,
            "risk_description": "评价中提到收费或结算异常，建议平台进一步复核。" if ("收费" in text or "拖欠" in text) else None,
            "quality_score": 7,
            "review_status": "approved",
        }

    def _build_employer_review_payload(self, user_message: str) -> dict:
        text = self._extract_user_input(user_message)
        negative = self._contains_any(text.lower(), ["迟到", "敷衍", "失联", "拖延", "沟通差"])
        return {
            "sentiment": "negative" if negative else "positive",
            "ability_tags": ["执行力强", "反馈及时", "责任心较强"] if not negative else ["执行稳定性待提升", "沟通响应需加强"],
            "dimensions": {
                "attendance": "good" if "迟到" not in text else "average",
                "communication": "excellent" if "沟通差" not in text else "average",
                "task_completion": "good" if "拖延" not in text else "average",
                "attitude": "excellent" if "敷衍" not in text else "average",
                "rehire_willingness": "yes" if not negative else "maybe",
            },
            "is_suspicious": False,
            "suspicious_reason": None,
            "recommendation_level": "A" if not negative else "B",
            "recommendation_note": "整体执行和沟通表现较稳，可继续跟进。" if not negative else "基础表现可用，但建议结合更多工作记录判断。",
            "review_status": "approved",
        }

    def _build_review_summary_payload(self, user_message: str) -> dict:
        text = self._extract_user_input(user_message)
        negative_count = sum(
            text.lower().count(keyword)
            for keyword in ["拖欠", "混乱", "收费", "失联", "差评", "不推荐"]
        )
        overall = "negative" if negative_count >= 3 else "mixed" if negative_count >= 1 else "positive"

        return {
            "overall_reputation": overall,
            "composite_score": 5.8 if overall == "negative" else 6.8 if overall == "mixed" else 8.2,
            "positive_keywords": ["反馈及时", "氛围友好"] if overall != "negative" else [],
            "negative_keywords": ["流程混乱", "结算不稳"] if overall != "positive" else [],
            "one_line_summary": "整体口碑中等偏上，但流程体验仍有优化空间。" if overall == "mixed" else ("整体口碑较好，沟通和体验表现稳定。" if overall == "positive" else "当前负向反馈较多，建议优先处理流程和结算问题。"),
            "detailed_summary": "多数评价认可沟通效率，但也提到流程说明和任务安排还可以更清晰。" if overall != "negative" else "评价中多次提到流程混乱或收费风险，建议平台和企业尽快复核整改。",
            "recommendation_index": 7 if overall == "mixed" else 8 if overall == "positive" else 4,
            "key_concerns": ["岗位说明清晰度", "反馈速度"] if overall != "negative" else ["收费风险", "结算稳定性", "流程合规性"],
            "review_count": max(1, len([line for line in text.splitlines() if line.strip()])),
        }

    def _build_career_path_payload(self, user_message: str) -> dict:
        target_job = self._extract_field(user_message, "目标岗位") or "目标岗位"
        return {
            "target_job": target_job,
            "total_steps": 4,
            "estimated_duration": "约3-6个月",
            "steps": [
                {
                    "step": 1,
                    "title": "厘清要求",
                    "description": "先拆解岗位核心要求和常见任务。",
                    "skills_to_learn": ["岗位认知", "信息搜集"],
                    "estimated_time": "1-2周",
                    "action": f"整理 {target_job} 的 JD 关键词和核心能力项。",
                },
                {
                    "step": 2,
                    "title": "补齐基础",
                    "description": "围绕岗位所需能力做针对性补强。",
                    "skills_to_learn": ["基础技能", "表达能力"],
                    "estimated_time": "3-4周",
                    "action": "结合课程、项目或实操任务补齐最关键的 2 项能力。",
                },
                {
                    "step": 3,
                    "title": "积累案例",
                    "description": "通过项目、兼职或作品证明自己能做事。",
                    "skills_to_learn": ["项目实践", "成果总结"],
                    "estimated_time": "4-6周",
                    "action": "沉淀 1 到 2 个可写进简历和面试的真实案例。",
                },
                {
                    "step": 4,
                    "title": "投递迭代",
                    "description": "根据反馈持续优化简历和表达。",
                    "skills_to_learn": ["投递策略", "复盘能力"],
                    "estimated_time": "持续进行",
                    "action": "每轮投递后复盘岗位匹配点和面试反馈，持续迭代材料。",
                },
            ],
            "tips": ["优先做与目标岗位最接近的实践", "用项目成果替代空泛自我评价"],
        }

    def _build_verification_payload(self, user_message: str) -> dict:
        text = self._extract_user_input(user_message)
        lowered = text.lower()

        details = []
        suggestions = []
        risk_level = "low"
        is_valid = True

        license_match = re.search(r"(营业执照号|营业执照号码)[：:]\s*([A-Za-z0-9]+)", text)
        company_match = re.search(r"(企业名称|公司名称)[：:]\s*(.+)", text)
        contact_match = re.search(r"(联系人|联系人姓名)[：:]\s*(.+)", text)
        license_number = license_match.group(2).strip() if license_match else ""
        company_name = company_match.group(2).strip() if company_match else ""
        contact_name = contact_match.group(2).strip() if contact_match else ""

        if not license_number or len(license_number) < 15:
            is_valid = False
            risk_level = "high"
            details.append("营业执照号长度明显不足，无法满足企业主体校验要求。")
        elif re.fullmatch(r"(\d)\1{14,17}", license_number) or license_number in {"123456789012345", "123456789012345678"}:
            is_valid = False
            risk_level = "high"
            details.append("营业执照号呈现重复或顺序数字特征，疑似演示或伪造数据。")

        if self._contains_any(company_name.lower(), ["测试公司", "abc", "test", "临时公司", "某某工作室", "xx公司"]):
            is_valid = False
            risk_level = "high"
            details.append("企业名称过于随意，缺少正式经营主体特征。")

        if self._contains_any(contact_name, ["张三", "李四", "测试"]):
            if risk_level != "high":
                risk_level = "medium"
            details.append("联系人姓名疑似演示占位，建议补充真实联系人信息。")

        if self._contains_any(lowered, ["placeholder", "picsum", "fake", "example.com"]):
            is_valid = False
            risk_level = "high"
            details.append("营业执照图片地址疑似占位或演示链接。")

        if "/uploads/" not in lowered and "http" not in lowered:
            if risk_level == "low":
                risk_level = "medium"
            details.append("材料中未看到明确的图片提交信息，建议核对营业执照图片是否已上传。")

        if not details:
            details.append("企业名称、营业执照号和图片材料基本完整，当前未发现明显高危异常。")

        if risk_level == "high":
            suggestions.extend(["请补充真实、规范的营业执照信息后重新提交。", "建议平台人工复核该企业认证材料。"])
        elif risk_level == "medium":
            suggestions.extend(["建议补充更完整的企业官网、联系人或地址信息。", "完善材料后可再次发起认证审核。"])
        else:
            suggestions.append("建议保留当前材料并进入后续人工抽检流程。")

        return {
            "is_valid": is_valid,
            "risk_level": risk_level,
            "details": details,
            "suggestions": suggestions,
        }

    def _build_fraud_check_payload(self, user_message: str) -> dict:
        text = self._extract_user_input(user_message)
        lowered = text.lower()

        warning_signs = []
        risk_level = "low"
        is_suspicious = False

        if self._contains_any(lowered, ["押金", "培训费", "保证金", "报名费", "体检费"]):
            is_suspicious = True
            risk_level = "high"
            warning_signs.append("岗位描述中出现前期收费或押金要求。")
        if self._contains_any(lowered, ["刷单", "轻松月入过万", "日赚", "不限时间", "在家即可"]) and risk_level != "high":
            is_suspicious = True
            risk_level = "high"
            warning_signs.append("岗位存在异常高薪或描述过于模糊的风险信号。")
        if self._contains_any(lowered, ["某公司", "保密", "不便透露"]) and risk_level == "low":
            risk_level = "medium"
            warning_signs.append("企业信息不够明确，建议继续核实主体真实性。")

        recommendation = (
            "建议立即下架并进入人工复核。"
            if risk_level == "high"
            else "建议补充岗位说明、公司信息和正规联系方式。"
            if risk_level == "medium"
            else "当前未发现明显异常，可继续观察用户反馈。"
        )

        return {
            "is_suspicious": is_suspicious,
            "risk_level": risk_level,
            "warning_signs": warning_signs,
            "recommendation": recommendation,
        }

    def _build_interview_reply(self, user_message: str) -> str:
        text = self._extract_user_input(user_message)
        if not text.strip():
            return "先做一个简短自我介绍吧，重点说说你的专业背景、最近做过的项目，以及为什么想应聘这个岗位。"
        return "你的回答里已经提到了基础经历。接下来我想继续追问一下：在你刚才提到的那段经历里，你具体负责了什么，最终结果怎样？"

    def _build_interview_evaluation_payload(self) -> dict:
        return {
            "scores": {
                "表达清晰度": 7,
                "内容相关性": 7,
                "专业理解度": 6,
                "综合印象": 7,
            },
            "overall_evaluation": "整体表达比较稳定，能说明自己的经历和动机，但在成果量化和岗位深度理解上还有继续加强的空间。",
            "score_reasons": {
                "表达清晰度": "回答能够围绕问题展开，但还可以进一步压缩无关铺垫，让重点更前置。",
                "内容相关性": "内容基本围绕岗位要求展开，不过部分经历与当前岗位的映射还不够直接。",
                "专业理解度": "能说明基础技能和项目经历，但对岗位方法论和实际应用的表达还偏浅。",
                "综合印象": "整体态度积极，配合度较好，具备继续培养的潜力。",
            },
            "suggestions": [
                "准备 2 到 3 个最能证明岗位匹配度的真实案例。",
                "用数字或结果补强项目成果表达。",
                "提前梳理岗位核心能力与个人经历的对应关系。",
            ],
            "risk_warnings": [],
            "pass_probability": "中(50-75%)",
            "summary": "整体风险较低，主要改进点在表达聚焦度和成果量化。",
        }

    def _resume_bullet(self, text: str) -> str:
        cleaned = re.sub(r"\s+", " ", text).strip("，。；; ")
        if not cleaned:
            return "围绕岗位需求推进日常任务执行，并及时反馈进度，保证协作顺畅。"
        return f"围绕 {cleaned[:24]} 的相关任务进行推进与协作，及时反馈进度并沉淀可复用经验。"

    def _extract_user_input(self, text: str) -> str:
        match = re.search(r"<<<USER_INPUT>>>\s*(.*?)\s*<<</USER_INPUT>>>", text, re.DOTALL)
        if match:
            return match.group(1).strip()
        return text.strip()

    def _extract_field(self, text: str, *field_names: str) -> str:
        for name in field_names:
            pattern = rf"{re.escape(name)}[】：:]\s*(.+)"
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()
        return ""

    def _extract_keyword(self, text: str, keywords: list[str]) -> str:
        for keyword in keywords:
            if keyword.lower() in text.lower():
                return keyword
        return text[:30]

    def _contains_any(self, text: str, keywords: list[str]) -> bool:
        normalized = text.lower()
        return any(keyword.lower() in normalized for keyword in keywords)

    def _fill_template(self, template: Any) -> Any:
        if isinstance(template, dict):
            return {key: self._fill_template(value) for key, value in template.items()}
        if isinstance(template, list):
            return [self._fill_template(template[0])] if template else []
        if isinstance(template, bool):
            return False
        if isinstance(template, int):
            return 0
        if isinstance(template, float):
            return 0.0
        return ""

    def _to_json(self, payload: Any) -> str:
        return json.dumps(payload, ensure_ascii=False)


gemini_service = GeminiService()
