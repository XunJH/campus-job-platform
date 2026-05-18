"""Chat risk warning service."""

from __future__ import annotations

import json
import re
from collections import Counter
from typing import Any, Dict, List, Optional

from .ai_provider import _ai_service, get_runtime_status, is_mock_mode


RiskRule = Dict[str, Any]
RiskItem = Dict[str, Any]


class ChatWarningService:
    """Build governance-oriented chat risk results for the platform."""

    SEVERITY_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    SEVERITY_LABELS = {
        "critical": "高危",
        "high": "较高风险",
        "medium": "中风险",
        "low": "低风险",
    }
    DECISION_LABELS = {
        "allow": "可继续沟通",
        "warn": "建议提醒后继续",
        "manual_review": "建议人工复核",
        "block_and_review": "建议拦截并复核",
    }

    RISK_RULES: List[RiskRule] = [
        {
            "code": "advance_payment",
            "type": "前置收费",
            "severity": "critical",
            "keywords": [
                "押金",
                "保证金",
                "培训费",
                "报名费",
                "工本费",
                "体检费",
                "先交",
                "转账",
                "扫码支付",
                "预支工资",
            ],
            "description": "要求学生在录用前支付任何费用，属于校园兼职里最典型的诈骗信号。",
            "student_action": "不要继续支付任何费用，保留聊天记录并立即停止沟通。",
            "employer_action": "招聘沟通中不应要求学生承担任何前置费用，请立即移除相关表述。",
            "platform_actions": [
                {"type": "block", "label": "建议拦截消息并暂停发送", "priority": "high"},
                {"type": "manual_review", "label": "建议转入管理员人工复核", "priority": "high"},
                {"type": "ticket", "label": "建议同步创建风险工单", "priority": "high"},
            ],
            "governance_flags": {
                "block_recommended": True,
                "freeze_recommended": False,
                "admin_attention_required": True,
                "ticket_recommended": True,
            },
        },
        {
            "code": "sensitive_privacy",
            "type": "敏感隐私索取",
            "severity": "critical",
            "keywords": [
                "身份证号",
                "身份证照片",
                "银行卡号",
                "银行卡",
                "验证码",
                "户口本",
                "家庭住址",
                "父母电话",
                "人脸信息",
            ],
            "description": "索要与兼职履约无关的敏感身份信息，存在个人信息泄露和冒用风险。",
            "student_action": "不要提供身份证号、银行卡号、验证码等敏感信息。",
            "employer_action": "请只收集与岗位履约直接相关的信息，避免敏感隐私采集。",
            "platform_actions": [
                {"type": "block", "label": "建议拦截消息并提示合规边界", "priority": "high"},
                {"type": "manual_review", "label": "建议管理员复核企业招聘合规性", "priority": "high"},
            ],
            "governance_flags": {
                "block_recommended": True,
                "freeze_recommended": False,
                "admin_attention_required": True,
                "ticket_recommended": True,
            },
        },
        {
            "code": "off_platform_contact",
            "type": "站外引流",
            "severity": "high",
            "keywords": [
                "加微信",
                "加QQ",
                "私聊",
                "线下见面",
                "不用平台",
                "直接联系",
                "微信号",
                "QQ号",
                "转到别处聊",
            ],
            "description": "引导学生脱离平台沟通，会削弱平台留痕和后续维权能力。",
            "student_action": "尽量在平台内完成沟通，避免把关键信息转到站外。",
            "employer_action": "建议保留平台内沟通链路，避免直接引导学生站外联系。",
            "platform_actions": [
                {"type": "warn", "label": "建议显示平台内沟通提醒", "priority": "medium"},
                {"type": "manual_review", "label": "多次命中时建议进入人工抽查", "priority": "medium"},
            ],
            "governance_flags": {
                "block_recommended": False,
                "freeze_recommended": False,
                "admin_attention_required": False,
                "ticket_recommended": False,
            },
        },
        {
            "code": "unrealistic_salary",
            "type": "异常薪资承诺",
            "severity": "medium",
            "keywords": ["日赚", "躺赚", "轻松过万", "月入过万", "无责底薪", "零门槛高薪"],
            "description": "薪资承诺明显脱离岗位常识，容易构成误导性招聘宣传。",
            "student_action": "先核验岗位职责、结算方式和历史评价，不要只看高薪承诺。",
            "employer_action": "建议回到更真实的薪资和结算表述，避免过度营销式措辞。",
            "platform_actions": [
                {"type": "warn", "label": "建议提醒招聘方优化表述", "priority": "medium"}
            ],
            "governance_flags": {
                "block_recommended": False,
                "freeze_recommended": False,
                "admin_attention_required": False,
                "ticket_recommended": False,
            },
        },
        {
            "code": "pressure_tactics",
            "type": "施压催促",
            "severity": "medium",
            "keywords": ["名额有限", "今天截止", "现在就决定", "不交就没了", "最后一天", "错过不再", "马上处理"],
            "description": "通过制造紧迫感迫使学生快速决策，属于风险较高的沟通方式。",
            "student_action": "不要被催促节奏带走，先确认岗位真实性和具体条款。",
            "employer_action": "建议减少带压迫感的措辞，用清晰的招聘流程替代催促表达。",
            "platform_actions": [
                {"type": "warn", "label": "建议显示温和提醒并记录风险标签", "priority": "medium"}
            ],
            "governance_flags": {
                "block_recommended": False,
                "freeze_recommended": False,
                "admin_attention_required": False,
                "ticket_recommended": False,
            },
        },
        {
            "code": "excessive_collection",
            "type": "过度收集信息",
            "severity": "low",
            "keywords": ["生活照", "家庭情况", "感情状况", "父母职业", "兴趣爱好", "个人照片"],
            "description": "收集与岗位无直接关系的背景信息，存在信息边界不清的问题。",
            "student_action": "只提供和岗位履约直接相关的信息即可。",
            "employer_action": "建议收窄采集范围，聚焦岗位履约所需信息。",
            "platform_actions": [
                {"type": "warn", "label": "建议显示隐私边界提醒", "priority": "low"}
            ],
            "governance_flags": {
                "block_recommended": False,
                "freeze_recommended": False,
                "admin_attention_required": False,
                "ticket_recommended": False,
            },
        },
        {
            "code": "bypass_platform",
            "type": "规避平台流程",
            "severity": "low",
            "keywords": ["不用签合同", "口头约定", "现金结算", "私下交易", "别走平台"],
            "description": "规避平台留痕或正式签约流程，后续纠纷处理难度会明显增加。",
            "student_action": "尽量保留平台留痕，避免脱离合同或结算流程。",
            "employer_action": "建议在平台内完成沟通、确认和结算说明。",
            "platform_actions": [
                {"type": "warn", "label": "建议提醒双方保留平台内留痕", "priority": "low"}
            ],
            "governance_flags": {
                "block_recommended": False,
                "freeze_recommended": False,
                "admin_attention_required": False,
                "ticket_recommended": False,
            },
        },
    ]

    STUDENT_PRIVACY_WARNINGS = {
        "身份证号": "请不要在聊天里直接发送身份证号。",
        "银行卡": "请不要在聊天里发送银行卡号或绑卡信息。",
        "验证码": "任何验证码都不应发送给招聘方。",
        "家庭住址": "详细住址不建议在初步沟通阶段提供。",
    }

    AI_DETECTION_PROMPT = """
你是一名校园兼职平台的聊天风控助手。请只分析“企业发给学生”的消息是否存在招聘风险。

重点关注以下风险：
1. 前置收费
2. 敏感隐私索取
3. 站外引流
4. 异常薪资承诺
5. 施压催促
6. 过度收集信息
7. 规避平台流程

如果没有风险，请返回：
{"has_risk": false, "risks": []}

如果存在风险，请返回 JSON：
{
  "has_risk": true,
  "risks": [
    {
      "type": "风险类型名称",
      "severity": "critical|high|medium|low",
      "description": "为什么有风险",
      "evidence": "直接触发风险的原文片段",
      "suggested_action": "给平台或用户的建议"
    }
  ]
}

只返回 JSON，不要添加其他解释。
""".strip()

    def detect_risks(
        self,
        message: str,
        sender_role: str = "employer",
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """Analyze a single message."""

        content = (message or "").strip()
        if not content:
            return self._build_empty_result(sender_role=sender_role)

        if sender_role == "student":
            return self._detect_student_privacy_risk(content)

        keyword_risks = self._keyword_detect(content)
        ai_risks: List[RiskItem] = []

        if not is_mock_mode():
            ai_risks = self._ai_detect_employer_risk(content)

        merged_risks = self._merge_risks(keyword_risks, ai_risks)
        return self._build_risk_result(merged_risks, sender_role=sender_role, scope="single_message")

    def analyze_conversation(self, conversation: List[Dict[str, str]]) -> Dict[str, Any]:
        """Analyze a whole conversation and produce governance advice."""

        all_risks: List[RiskItem] = []
        employer_messages: List[str] = []
        normalized_messages: List[Dict[str, str]] = []

        for index, item in enumerate(conversation, start=1):
            role = (item.get("role") or "").strip()
            content = (item.get("content") or "").strip()
            if not role or not content:
                continue

            normalized_messages.append({"role": role, "content": content})

            if role == "employer":
                employer_messages.append(content)
                result = self.detect_risks(content, sender_role="employer")
                for risk in result.get("risks", []):
                    enriched = dict(risk)
                    enriched["message_index"] = index
                    enriched["message_excerpt"] = content[:80]
                    all_risks.append(enriched)

        ai_conversation_risks: List[RiskItem] = []
        if employer_messages and not is_mock_mode():
            ai_conversation_risks = self._ai_detect_employer_risk("\n".join(employer_messages))

        merged_risks = self._merge_risks(all_risks, ai_conversation_risks)
        base_result = self._build_risk_result(merged_risks, sender_role="employer", scope="conversation")

        breakdown_counter = Counter(risk["type"] for risk in merged_risks)
        severity_by_type: Dict[str, str] = {}
        for risk in merged_risks:
            risk_type = risk["type"]
            current = severity_by_type.get(risk_type)
            if current is None or self.SEVERITY_RANK[risk["severity"]] > self.SEVERITY_RANK[current]:
                severity_by_type[risk_type] = risk["severity"]

        base_result.update(
            {
                "total_messages_analyzed": len(normalized_messages),
                "risk_breakdown": [
                    {
                        "type": risk_type,
                        "count": count,
                        "highest_level": self.SEVERITY_LABELS[severity_by_type[risk_type]],
                    }
                    for risk_type, count in breakdown_counter.items()
                ],
                "case_summary": self._build_case_summary(merged_risks),
                "detected_risks": merged_risks,
                "suggestions": base_result["recommended_actions"],
            }
        )
        return base_result

    def get_risk_types(self) -> Dict[str, Any]:
        """Return grouped risk type descriptions for the frontend."""

        grouped: Dict[str, Dict[str, Any]] = {
            "高危风险": {
                "description": "建议立即拦截或转入人工复核的场景",
                "types": [],
            },
            "中风险": {
                "description": "建议提醒、留痕并持续观察的场景",
                "types": [],
            },
            "低风险": {
                "description": "建议提示合规边界，帮助用户避免信息误用",
                "types": [],
            },
        }

        for rule in self.RISK_RULES:
            group_key = self._get_risk_group(rule["severity"])
            grouped[group_key]["types"].append({"name": rule["type"], "desc": rule["description"]})

        return grouped

    def _detect_student_privacy_risk(self, message: str) -> Dict[str, Any]:
        risks: List[RiskItem] = []
        for keyword, warning in self.STUDENT_PRIVACY_WARNINGS.items():
            if keyword not in message:
                continue

            risks.append(
                {
                    "code": f"student_privacy_{self._normalize_risk_code(keyword)}",
                    "type": "学生隐私外泄",
                    "severity": "low",
                    "level": self.SEVERITY_LABELS["low"],
                    "description": "学生消息里包含了可能不该直接发送的敏感信息。",
                    "evidence": keyword,
                    "suggested_action": warning,
                    "employer_guidance": "建议引导学生仅在必要环节提供合规资料。",
                    "source": "rule",
                    "confidence": 0.88,
                    "platform_actions": [
                        {"type": "warn", "label": "建议提醒学生修改或撤回敏感内容", "priority": "low"}
                    ],
                    "governance_flags": {
                        "block_recommended": False,
                        "freeze_recommended": False,
                        "admin_attention_required": False,
                        "ticket_recommended": False,
                    },
                }
            )

        return self._build_risk_result(risks, sender_role="student", scope="single_message")

    def _keyword_detect(self, message: str) -> List[RiskItem]:
        normalized = message.lower()
        results: List[RiskItem] = []

        for rule in self.RISK_RULES:
            matches = [keyword for keyword in rule["keywords"] if keyword in message or keyword.lower() in normalized]
            if not matches:
                continue

            results.append(
                {
                    "code": rule["code"],
                    "type": rule["type"],
                    "severity": rule["severity"],
                    "level": self.SEVERITY_LABELS[rule["severity"]],
                    "description": rule["description"],
                    "evidence": "、".join(matches[:3]),
                    "suggested_action": rule["student_action"],
                    "employer_guidance": rule["employer_action"],
                    "source": "rule",
                    "confidence": 0.9,
                    "platform_actions": list(rule["platform_actions"]),
                    "governance_flags": dict(rule["governance_flags"]),
                }
            )

        return results

    def _ai_detect_employer_risk(self, message: str) -> List[RiskItem]:
        try:
            response = _ai_service.chat(
                [
                    {"role": "system", "content": self.AI_DETECTION_PROMPT},
                    {"role": "user", "content": message},
                ],
                temperature=0.2,
            )
            payload = self._extract_json(response)
            if not payload.get("has_risk"):
                return []

            results: List[RiskItem] = []
            for item in payload.get("risks", []):
                severity = self._normalize_severity(item.get("severity"))
                results.append(
                    {
                        "code": self._normalize_risk_code(item.get("type", "ai_detected_risk")),
                        "type": item.get("type", "AI 识别风险"),
                        "severity": severity,
                        "level": self.SEVERITY_LABELS[severity],
                        "description": item.get("description", "AI 判断该内容存在潜在风险。"),
                        "evidence": item.get("evidence") or message[:60],
                        "suggested_action": item.get("suggested_action") or "建议继续人工核验后再发送。",
                        "employer_guidance": item.get("suggested_action") or "建议优化表达后再继续沟通。",
                        "source": "ai",
                        "confidence": 0.74,
                        "platform_actions": self._default_platform_actions(severity),
                        "governance_flags": self._default_governance_flags(severity),
                    }
                )
            return results
        except Exception as exc:  # pragma: no cover - defensive fallback
            print(f"[chat_warning] AI 风险增强失败，已回退到规则检测：{exc}")
            return []

    def _merge_risks(self, primary: List[RiskItem], secondary: List[RiskItem]) -> List[RiskItem]:
        merged: Dict[str, RiskItem] = {}

        for risk in [*primary, *secondary]:
            key = risk.get("code") or self._normalize_risk_code(risk.get("type", "unknown"))
            if key not in merged:
                merged[key] = dict(risk)
                continue

            current = merged[key]
            if self.SEVERITY_RANK[risk["severity"]] > self.SEVERITY_RANK[current["severity"]]:
                current["severity"] = risk["severity"]
                current["level"] = risk["level"]

            current["source"] = self._merge_sources(current.get("source"), risk.get("source"))
            current["confidence"] = max(current.get("confidence", 0), risk.get("confidence", 0))
            current["description"] = current.get("description") or risk.get("description")
            current["suggested_action"] = current.get("suggested_action") or risk.get("suggested_action")
            current["employer_guidance"] = current.get("employer_guidance") or risk.get("employer_guidance")
            current["evidence"] = self._join_evidence(current.get("evidence"), risk.get("evidence"))
            current["platform_actions"] = self._merge_platform_actions(
                current.get("platform_actions", []),
                risk.get("platform_actions", []),
            )
            current["governance_flags"] = self._merge_governance_flags(
                current.get("governance_flags", {}),
                risk.get("governance_flags", {}),
            )

        return sorted(merged.values(), key=lambda item: self.SEVERITY_RANK[item["severity"]], reverse=True)

    def _build_risk_result(self, risks: List[RiskItem], sender_role: str, scope: str) -> Dict[str, Any]:
        runtime = get_runtime_status()

        if not risks:
            payload: Dict[str, Any] = {
                "has_risk": False,
                "risk_level_code": None,
                "risk_level": "安全",
                "risk_level_label": "安全",
                "governance_decision": "allow",
                "governance_decision_label": self.DECISION_LABELS["allow"],
                "risks": [],
                "risk_summary": "当前内容未发现明显风险信号。",
                "recommended_actions": ["可以继续保持平台内沟通，并保留关键信息确认记录。"],
                "platform_actions": [
                    {"type": "allow", "label": "保持正常沟通并持续留痕", "priority": "low"}
                ],
                "admin_attention_required": False,
                "ticket_recommended": False,
                "block_recommended": False,
                "freeze_recommended": False,
                "confidence": 0.84,
                "runtime": runtime,
                "should_block": False,
            }
            if scope == "conversation":
                payload.update(
                    {
                        "overall_risk_code": None,
                        "overall_risk_level": "安全",
                        "overall_risk_label": "安全",
                        "conversation_score": 96,
                    }
                )
            return payload

        highest = risks[0]
        decision = self._decide_governance(risks)
        flags = self._merge_governance_flags(*[risk.get("governance_flags", {}) for risk in risks])
        recommended_actions = self._collect_recommended_actions(risks, sender_role)
        platform_actions = self._merge_platform_actions(*[risk.get("platform_actions", []) for risk in risks])
        confidence = round(sum(item.get("confidence", 0.75) for item in risks) / len(risks), 2)

        payload = {
            "has_risk": True,
            "risk_level_code": highest["severity"],
            "risk_level": highest["level"],
            "risk_level_label": highest["level"],
            "governance_decision": decision,
            "governance_decision_label": self.DECISION_LABELS[decision],
            "risks": risks,
            "risk_summary": self._generate_summary(risks),
            "recommended_actions": recommended_actions,
            "platform_actions": platform_actions,
            "admin_attention_required": flags["admin_attention_required"],
            "ticket_recommended": flags["ticket_recommended"],
            "block_recommended": flags["block_recommended"],
            "freeze_recommended": flags["freeze_recommended"],
            "confidence": confidence,
            "runtime": runtime,
            "should_block": flags["block_recommended"],
        }

        if scope == "conversation":
            payload.update(
                {
                    "overall_risk_code": highest["severity"],
                    "overall_risk_level": highest["level"],
                    "overall_risk_label": highest["level"],
                    "conversation_score": self._calculate_conversation_score(risks),
                }
            )

        return payload

    def _build_empty_result(self, sender_role: str) -> Dict[str, Any]:
        return self._build_risk_result([], sender_role=sender_role, scope="single_message")

    def _generate_summary(self, risks: List[RiskItem]) -> str:
        highest = risks[0]
        risk_types = "、".join(dict.fromkeys(risk["type"] for risk in risks))
        if highest["severity"] == "critical":
            return f"检测到高危风险，主要涉及 {risk_types}，建议暂停发送并转入人工复核。"
        if highest["severity"] == "high":
            return f"检测到较高风险信号，重点关注 {risk_types}，建议先修正文案后再继续沟通。"
        if highest["severity"] == "medium":
            return f"检测到中风险信号，主要集中在 {risk_types}，建议补充说明并保留留痕。"
        return f"检测到低风险提醒，涉及 {risk_types}，建议注意隐私与流程边界。"

    def _build_case_summary(self, risks: List[RiskItem]) -> str:
        if not risks:
            return "对话整体风险较低，暂未发现需要转人工的异常信号。"

        counter = Counter(risk["type"] for risk in risks)
        top_risks = "、".join(name for name, _ in counter.most_common(3))
        highest = risks[0]["level"]
        return f"整段对话以“{top_risks}”风险为主，当前综合判断为 {highest}，建议结合岗位和候选人记录决定是否人工介入。"

    def _collect_recommended_actions(self, risks: List[RiskItem], sender_role: str) -> List[str]:
        actions: List[str] = []
        for risk in risks:
            action = (
                risk.get("suggested_action")
                if sender_role == "student"
                else risk.get("employer_guidance") or risk.get("suggested_action")
            )
            if action and action not in actions:
                actions.append(action)

        decision = self._decide_governance(risks)
        if decision == "block_and_review":
            actions.append("建议把本次沟通记录同步给管理员，并暂停继续发送。")
        elif decision == "manual_review":
            actions.append("建议先进入人工复核，再决定是否继续推进招聘流程。")
        elif decision == "warn":
            actions.append("建议保留平台内书面确认，避免口头承诺或站外约定。")

        return actions

    def _decide_governance(self, risks: List[RiskItem]) -> str:
        highest = risks[0]["severity"]
        flags = self._merge_governance_flags(*[risk.get("governance_flags", {}) for risk in risks])

        if highest == "critical" or flags["block_recommended"]:
            return "block_and_review"
        if highest == "high" or flags["admin_attention_required"]:
            return "manual_review"
        if highest == "medium":
            return "warn"
        return "allow"

    def _calculate_conversation_score(self, risks: List[RiskItem]) -> int:
        score = 100
        for risk in risks:
            severity = risk["severity"]
            if severity == "critical":
                score -= 30
            elif severity == "high":
                score -= 20
            elif severity == "medium":
                score -= 10
            else:
                score -= 5
        return max(5, score)

    def _get_risk_group(self, severity: str) -> str:
        if severity in {"critical", "high"}:
            return "高危风险"
        if severity == "medium":
            return "中风险"
        return "低风险"

    def _normalize_severity(self, raw: Optional[str]) -> str:
        text = (raw or "").lower()
        if "critical" in text or "高危" in text:
            return "critical"
        if "high" in text or "较高" in text or "高风险" in text:
            return "high"
        if "medium" in text or "中风险" in text:
            return "medium"
        return "low"

    def _normalize_risk_code(self, value: str) -> str:
        normalized = re.sub(r"[^a-zA-Z0-9]+", "_", value.strip().lower())
        return normalized.strip("_") or "unknown_risk"

    def _extract_json(self, response: str) -> Dict[str, Any]:
        match = re.search(r"\{.*\}", response, re.DOTALL)
        if not match:
            return {"has_risk": False, "risks": []}
        return json.loads(match.group())

    def _merge_sources(self, current: Optional[str], incoming: Optional[str]) -> str:
        items = {item for item in [current, incoming] if item}
        return "+".join(sorted(items))

    def _join_evidence(self, current: Any, incoming: Any) -> str:
        items = {str(current or "").strip(), str(incoming or "").strip()}
        return "；".join(item for item in sorted(items) if item)

    def _merge_platform_actions(self, *groups: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        merged: Dict[str, Dict[str, Any]] = {}
        for group in groups:
            for action in group:
                key = f"{action.get('type')}::{action.get('label')}"
                if key not in merged:
                    merged[key] = dict(action)
                    continue

                current_priority = merged[key].get("priority", "low")
                incoming_priority = action.get("priority", "low")
                if self._priority_rank(incoming_priority) > self._priority_rank(current_priority):
                    merged[key]["priority"] = incoming_priority

        return sorted(
            merged.values(),
            key=lambda item: self._priority_rank(item.get("priority", "low")),
            reverse=True,
        )

    def _merge_governance_flags(self, *flags_list: Dict[str, Any]) -> Dict[str, bool]:
        result = {
            "block_recommended": False,
            "freeze_recommended": False,
            "admin_attention_required": False,
            "ticket_recommended": False,
        }
        for flags in flags_list:
            for key in result:
                result[key] = result[key] or bool(flags.get(key))
        return result

    def _priority_rank(self, priority: str) -> int:
        return {"high": 3, "medium": 2, "low": 1}.get(priority, 1)

    def _default_platform_actions(self, severity: str) -> List[Dict[str, Any]]:
        if severity == "critical":
            return [
                {"type": "block", "label": "建议拦截消息并人工复核", "priority": "high"},
                {"type": "ticket", "label": "建议同步创建风险工单", "priority": "high"},
            ]
        if severity == "high":
            return [{"type": "manual_review", "label": "建议管理员人工复核", "priority": "high"}]
        if severity == "medium":
            return [{"type": "warn", "label": "建议提醒并保留平台内留痕", "priority": "medium"}]
        return [{"type": "warn", "label": "建议提示用户注意信息边界", "priority": "low"}]

    def _default_governance_flags(self, severity: str) -> Dict[str, bool]:
        if severity == "critical":
            return {
                "block_recommended": True,
                "freeze_recommended": False,
                "admin_attention_required": True,
                "ticket_recommended": True,
            }
        if severity == "high":
            return {
                "block_recommended": False,
                "freeze_recommended": False,
                "admin_attention_required": True,
                "ticket_recommended": True,
            }
        return {
            "block_recommended": False,
            "freeze_recommended": False,
            "admin_attention_required": False,
            "ticket_recommended": False,
        }


chat_warning_service = ChatWarningService()
