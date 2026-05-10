"""
聊天风险预警服务

在学生-企业聊天过程中实时检测风险信号，
覆盖：金钱诈骗、隐私窃取、站外引流、虚假薪资、心理施压、过度收集、规避监管
支持 DeepSeek / Gemini / Mock 三种模式。
"""

from typing import List, Dict, Any, Optional
from ..services.ai_provider import _ai_service


class ChatWarningService:
    """聊天风险预警服务"""

    # ================================================================
    # 一、风险检测规则 —— 用于前端关键词快速检测 + AI深度判断
    # ================================================================
    RISK_PATTERNS = {
        "🔴高危": {
            "金钱诈骗": {
                "keywords": ["押金", "保证金", "培训费", "报名费", "服装费", "体检费", "工本费", "激活费", "预支工资", "先交", "转账", "扫码支付"],
                "description": "要求提前支付任何费用，是诈骗的典型特征",
                "action": "立即警告学生，建议停止沟通并举报该商家"
            },
            "隐私窃取": {
                "keywords": ["身份证号", "身份证照片", "银行卡号", "家庭住址", "父母电话", "户口本", "人脸信息", "验证码"],
                "description": "非正常兼职所需隐私信息收集",
                "action": "警告学生不要提供敏感信息，正规兼职不需要这些"
            },
            "站外引流": {
                "keywords": ["加微信", "加QQ", "私聊", "线下见面", "不用平台", "直接联系", "微信是", "QQ号", "微信号"],
                "description": "诱导脱离平台监管，后续诈骗难以追责",
                "action": "提醒学生所有沟通应在平台内完成，保护自身权益"
            }
        },
        "🟡中危": {
            "虚假薪资": {
                "keywords": ["日赚", "月入过万", "躺赚", "保底", "无责任底薪", "轻松过万"],
                "description": "薪资描述明显超出校园兼职合理范围",
                "action": "提醒学生理性判断，过高薪资承诺需谨慎核实"
            },
            "心理施压": {
                "keywords": ["名额有限", "今天截止", "不交就没了", "最后一天", "马上决定", "错过不再"],
                "description": "利用紧迫感迫使快速决策，是高压销售/诈骗常用手法",
                "action": "提醒学生不要被紧迫感影响，正规招聘不会催促立即决定"
            }
        },
        "🔵低危": {
            "过度收集": {
                "keywords": ["生活照", "个人照片", "兴趣爱好", "感情状况", "家庭情况"],
                "description": "收集与工作岗位无关的个人隐私信息",
                "action": "建议学生只提供与岗位直接相关的基本信息"
            },
            "规避监管": {
                "keywords": ["不用签合同", "口头约定", "不用走平台", "私下交易", "现金结算"],
                "description": "规避平台监管和劳动法律保护",
                "action": "提醒学生务必通过平台完成签约和结算，保障合法权益"
            }
        }
    }

    # ================================================================
    # 二、AI 检测提示词
    # ================================================================
    AI_DETECTION_PROMPT = """你是一位专业的校园兼职平台安全审核员，负责保护大学生在求职聊天中的安全。

【检测任务】
分析以下「商家发给学生」的消息，判断是否存在风险。

【风险类型定义】
🔴 高危（必须立即警告）：
  - 金钱诈骗：要求交押金/培训费/任何前期费用
  - 隐私窃取：索要身份证号/银行卡号/家庭住址等敏感信息
  - 站外引流：诱导加微信/QQ/线下见面，脱离平台监管

🟡 中危（需要提醒）：
  - 虚假薪资：薪资承诺明显超出合理范围（如日赚1000+、月入过万）
  - 心理施压：用"名额有限""今天截止"等话术制造紧迫感

🔵 低危（建议注意）：
  - 过度收集：索要与岗位无关的个人隐私（生活照、感情状况等）
  - 规避监管：建议不签合同、私下交易、现金结算

【输出格式】
如果没有风险，返回：
{"has_risk": false, "risks": []}

如果检测到风险，返回 JSON 数组：
{"has_risk": true, "risks": [
  {
    "level": "🔴高危 | 🟡中危 | 🔵低危",
    "type": "风险类型名称",
    "description": "具体描述，引用原文中的关键内容",
    "suggested_action": "给学生的具体建议",
    "original_text": "触发风险的原文片段"
  }
]}

【重要】
- 只分析商家发给学生消息中的风险，不分析学生的回复
- 如果没有风险，risks 必须是空数组 []
- 如果消息内容本身是正常的招聘沟通，不要过度解读
- 用户输入被包裹在 <<<MESSAGE>>> 标签中

现在请分析："""

    # ================================================================
    # 三、Mock 检测（无 AI 服务时降级使用）
    # ================================================================
    MOCK_RISK_DB = [
        # (触发关键词, 风险结果)
        ("押金", {"level": "🔴高危", "type": "金钱诈骗", "description": "商家要求缴纳押金，这是典型的兼职诈骗信号",
                   "suggested_action": "正规兼职不会要求提前交费，请立即停止沟通并举报。",
                   "original_text": "需要交押金"}),
        ("培训费", {"level": "🔴高危", "type": "金钱诈骗", "description": "以培训名义收取费用，属于常见诈骗手法",
                     "suggested_action": "拒绝支付，正规岗前培训由企业承担费用。",
                     "original_text": "需要交培训费"}),
        ("身份证号", {"level": "🔴高危", "type": "隐私窃取", "description": "在非必要情况下索要身份证号，存在信息泄露风险",
                       "suggested_action": "正规兼职无需提供身份证号，请勿轻易透露。",
                       "original_text": "需要提供身份证号"}),
        ("加微信", {"level": "🔴高危", "type": "站外引流", "description": "诱导脱离平台监管，后续维权困难",
                     "suggested_action": "所有沟通请在平台内完成，保护自身权益。",
                     "original_text": "加我微信详聊"}),
        ("日赚", {"level": "🟡中危", "type": "虚假薪资", "description": "薪资承诺远高于市场水平，存在虚假宣传可能",
                   "suggested_action": "理性判断，过高薪资承诺需谨慎核实。",
                   "original_text": "日赚上千"}),
        ("名额有限", {"level": "🟡中危", "type": "心理施压", "description": "利用紧迫感迫使快速决策",
                       "suggested_action": "不要被紧迫感影响，正规招聘不会催促立即决定。",
                       "original_text": "名额有限，先到先得"}),
        ("生活照", {"level": "🔵低危", "type": "过度收集", "description": "收集与工作岗位无关的隐私信息",
                     "suggested_action": "建议只提供与岗位直接相关的基本信息。",
                     "original_text": "发一张生活照"}),
        ("不用签合同", {"level": "🔵低危", "type": "规避监管", "description": "规避劳动法律保护，权益无保障",
                         "suggested_action": "务必通过平台完成签约，保障合法权益。",
                         "original_text": "不用签合同"}),
    ]

    def __init__(self):
        pass

    def detect_risks(
        self,
        message: str,
        sender_role: str = "employer",  # "employer" | "student"
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        检测单条消息的风险

        Args:
            message: 待检测的消息内容
            sender_role: 发送者角色（'employer' 或 'student'）
            conversation_history: 对话历史（可选，用于上下文判断）

        Returns:
            {
                "has_risk": bool,
                "risks": [...],
                "risk_summary": "一句话总结"
            }
        """
        # 如果是学生发的消息，降低检测敏感度（主要检测商家）
        if sender_role == "student":
            return self._detect_student_risk(message)
        else:
            return self._detect_employer_risk(message, conversation_history)

    def _detect_employer_risk(
        self,
        message: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """检测商家消息风险（完整 AI 检测）"""
        try:
            # 尝试用 AI 检测
            user_content = f"<<<MESSAGE>>>\n{message}\n<<</MESSAGE>>>"
            response = _ai_service.chat([
                {"role": "system", "content": self.AI_DETECTION_PROMPT},
                {"role": "user", "content": user_content}
            ], temperature=0.3)

            import re, json
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                risks = result.get("risks", [])
                has_risk = result.get("has_risk", len(risks) > 0)
                return {
                    "has_risk": has_risk,
                    "risks": risks,
                    "risk_summary": self._generate_summary(risks) if has_risk else None
                }
        except Exception as e:
            print(f"[chat_warning] AI检测失败，降级到关键词检测: {e}")

        # 降级：关键词检测
        return self._keyword_detect(message)

    def _detect_student_risk(self, message: str) -> Dict[str, Any]:
        """检测学生消息风险（简化版，主要防止学生被骗）"""
        # 学生发消息时，主要检测是否泄露隐私
        privacy_keywords = ["我的身份证", "我家住", "我银行卡", "我手机号是"]
        risks = []
        for keyword in privacy_keywords:
            if keyword in message:
                risks.append({
                    "level": "🔵低危",
                    "type": "隐私泄露",
                    "description": "你的消息中可能包含敏感个人信息",
                    "suggested_action": "请注意保护个人隐私，不要轻易透露身份证号、住址、银行卡等信息。",
                    "original_text": keyword
                })
        return {
            "has_risk": len(risks) > 0,
            "risks": risks,
            "risk_summary": "注意保护个人隐私" if risks else None
        }

    def _keyword_detect(self, message: str) -> Dict[str, Any]:
        """关键词降级检测"""
        risks = []
        message_lower = message.lower()

        for level, categories in self.RISK_PATTERNS.items():
            for risk_type, info in categories.items():
                for keyword in info["keywords"]:
                    if keyword in message or keyword in message_lower:
                        risks.append({
                            "level": level,
                            "type": risk_type,
                            "description": info["description"],
                            "suggested_action": info["action"],
                            "original_text": keyword
                        })
                        break  # 同一风险类型只触发一次

        return {
            "has_risk": len(risks) > 0,
            "risks": risks,
            "risk_summary": self._generate_summary(risks) if risks else None
        }

    def _generate_summary(self, risks: List[Dict]) -> str:
        """生成风险总结"""
        if not risks:
            return None
        high_count = sum(1 for r in risks if "🔴" in r.get("level", ""))
        if high_count > 0:
            return f"检测到 {high_count} 个高危风险，请立即停止沟通！"
        return f"检测到 {len(risks)} 个风险信号，请注意保护自身权益。"

    def analyze_conversation(
        self,
        conversation: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        分析整段对话，给出综合风险报告

        Args:
            conversation: [{"role": "employer"|"student", "content": "..."}]

        Returns:
            {
                "overall_risk_level": "🔴高危 | 🟡中危 | 🔵低危 | ✅安全",
                "risk_summary": "...",
                "detected_risks": [...],  # 所有检测到的风险
                "suggestions": [...],      # 给学生的建议
                "conversation_score": 30   # 对话安全评分 0-100
            }
        """
        all_risks = []
        employer_messages = []

        for msg in conversation:
            if msg.get("role") == "employer":
                employer_messages.append(msg.get("content", ""))
                result = self.detect_risks(msg.get("content", ""), sender_role="employer")
                if result["has_risk"]:
                    all_risks.extend(result["risks"])

        # 去重（相同 type 的风险合并）
        seen_types = set()
        unique_risks = []
        for risk in all_risks:
            if risk["type"] not in seen_types:
                seen_types.add(risk["type"])
                unique_risks.append(risk)

        # 计算综合风险等级
        has_high = any("🔴" in r["level"] for r in unique_risks)
        has_medium = any("🟡" in r["level"] for r in unique_risks)
        has_low = any("🔵" in r["level"] for r in unique_risks)

        if has_high:
            overall_level = "🔴高危"
            score = max(0, 30 - len([r for r in unique_risks if "🔴" in r["level"]]) * 15)
        elif has_medium:
            overall_level = "🟡中危"
            score = max(30, 60 - len([r for r in unique_risks if "🟡" in r["level"]]) * 10)
        elif has_low:
            overall_level = "🔵低危"
            score = max(60, 80 - len([r for r in unique_risks if "🔵" in r["level"]]) * 5)
        else:
            overall_level = "✅安全"
            score = 95

        # 生成建议
        suggestions = []
        if has_high:
            suggestions.append("🚨 立即停止与对方的沟通，不要继续提供任何信息")
            suggestions.append("📱 点击右上角「举报」按钮，提交聊天记录")
            suggestions.append("🔒 如果已经转账，立即报警并联系平台客服")
        if has_medium:
            suggestions.append("⚠️ 对过高薪资承诺保持理性，多方核实")
            suggestions.append("📝 所有约定事项（薪资、工时、地点）要求对方在平台内书面确认")
        if has_low:
            suggestions.append("🛡️ 注意保护个人隐私，只提供与岗位必要的信息")
            suggestions.append("📄 务必通过平台完成合同签署，不要接受口头约定")

        if not suggestions:
            suggestions.append("✅ 当前对话暂无风险，但仍请注意保护个人隐私")

        return {
            "overall_risk_level": overall_level,
            "risk_summary": self._generate_summary(unique_risks) if unique_risks else "对话安全，暂无风险信号",
            "detected_risks": unique_risks,
            "suggestions": suggestions,
            "conversation_score": score,
            "total_messages_analyzed": len(employer_messages)
        }


# 创建全局实例
chat_warning_service = ChatWarningService()
