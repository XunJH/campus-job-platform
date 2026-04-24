"""
Gemini API 服务 - 模拟版本（无API时使用）
当 .env 中设置 USE_MOCK=true 时，使用模拟数据
"""
import random
import json
from typing import Optional


class GeminiService:
    """
    模拟 Gemini API 的服务类
    当没有真实 API 密钥时，返回模拟但真实感的数据
    """

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

    def _configure(self):
        """配置服务"""
        print("[MOCK] Using mock Gemini service - no real API calls")
        print("[MOCK] To use real API, set USE_MOCK=false and add GEMINI_API_KEY")

    def generate_text(self, prompt: str, temperature: float = 0.7) -> str:
        """
        模拟生成文本
        根据 prompt 内容返回相关的模拟响应
        """
        # 根据提示词内容返回不同的模拟响应
        if "人格" in prompt or "personality" in prompt.lower():
            return self._mock_personality()
        elif "匹配" in prompt or "match" in prompt.lower():
            return self._mock_matching()
        elif "岗位" in prompt or "job" in prompt.lower():
            return self._mock_job_recommendation()
        elif "审核" in prompt or "verify" in prompt.lower():
            return self._mock_verification()
        elif "虚假" in prompt or "fake" in prompt.lower():
            return self._mock_fake_detection()
        elif "信用" in prompt or "credit" in prompt.lower():
            return self._mock_credit_score()
        else:
            return "这是模拟的 AI 回复。当配置真实的 GEMINI_API_KEY 后，将返回真实 AI 生成的内容。"

    def generate_structured_response(self, prompt: str, response_format: dict, temperature: float = 0.7) -> dict:
        """
        模拟生成结构化响应
        根据提示词返回符合格式要求的模拟数据
        """
        if "人格" in prompt or "personality" in prompt.lower():
            return self._mock_personality_json()
        elif "匹配" in prompt or "match" in prompt.lower():
            return self._mock_matching_json()
        elif "岗位" in prompt:
            return self._mock_job_recommendation_json()
        elif "审核" in prompt:
            return self._mock_verification_json()
        elif "虚假" in prompt:
            return self._mock_fake_detection_json()
        elif "信用" in prompt:
            return self._mock_credit_score_json()
        else:
            return {"result": "模拟响应"}

    def _mock_personality(self) -> str:
        """模拟人格分析文本"""
        personalities = [
            "根据您的回答，您展现出强烈的【社交型】人格特征。您喜欢与人互动，善于沟通表达，适合需要大量协作的工作环境。在团队中，您通常扮演协调者的角色，能够有效整合不同意见。",
            "根据您的回答，您属于【分析型】人格。您思维严谨，注重细节，善于处理复杂问题。面对挑战时，您倾向于逻辑思考而非冲动反应，这使您在技术类工作中表现出色。"
        ]
        return random.choice(personalities)

    def _mock_personality_json(self) -> dict:
        """模拟人格画像JSON"""
        types = [
            {
                "type": "社交型",
                "description": "喜欢与人互动，善于沟通表达，适合协作环境",
                "strengths": ["沟通能力", "团队协作", "情绪感知"],
                "suitable_jobs": ["客服", "销售", "活动策划", "人力资源"]
            },
            {
                "type": "分析型",
                "description": "思维严谨，注重细节，善于处理复杂问题",
                "strengths": ["逻辑思维", "问题解决", "专注力"],
                "suitable_jobs": ["数据分析", "编程开发", "研究助理", "文案编辑"]
            }
        ]
        result = random.choice(types)
        result["confidence"] = round(random.uniform(0.75, 0.92), 2)
        result["tags"] = random.sample(["细心", "耐心", "创新", "负责", "高效", "主动"], 4)
        return result

    def _mock_matching(self) -> str:
        """模拟匹配说明"""
        return "根据您的人格画像和工作偏好，我为您筛选出以下高度匹配的兼职岗位。这些岗位不仅符合您的工作时间要求，还能充分发挥您的个人优势。"

    def _mock_matching_json(self) -> dict:
        """模拟岗位匹配JSON"""
        return {
            "match_score": round(random.uniform(75, 95), 1),
            "top_matches": 3,
            "recommendation": "您的人格特质与这些岗位高度契合，建议优先考虑。"
        }

    def _mock_job_recommendation(self) -> str:
        """模拟岗位推荐"""
        return "为您推荐以下兼职岗位，匹配度均超过85%..."

    def _mock_job_recommendation_json(self) -> list:
        """模拟岗位推荐列表"""
        jobs = [
            {"job_id": "J001", "title": "校园大使", "company": "某知名互联网公司", "match_score": 92, "salary": "150-200元/天", "location": "校内"},
            {"job_id": "J002", "title": "数据标注员", "company": "AI数据公司", "match_score": 88, "salary": "100-150元/天", "location": "远程"},
            {"job_id": "J003", "title": "活动推广员", "company": "校园代理团队", "match_score": 85, "salary": "80-120元/天", "location": "校内"},
            {"job_id": "J004", "title": "家教", "company": "学而思教育", "match_score": 90, "salary": "100-200元/时", "location": "线上/线下"},
            {"job_id": "J005", "title": "餐厅服务员", "company": "麦当劳", "match_score": 78, "salary": "20-25元/时", "location": "商场内"}
        ]
        return random.sample(jobs, 3)

    def _mock_verification(self) -> str:
        """模拟认证审核"""
        return "正在分析认证材料，请稍候..."

    def _mock_verification_json(self) -> dict:
        """模拟认证审核结果"""
        return {
            "status": "approved",
            "confidence": round(random.uniform(0.85, 0.98), 2),
            "highlights": ["证件清晰可见", "信息一致", "照片与证件匹配"],
            "suggestion": "认证材料完整且真实，建议通过"
        }

    def _mock_fake_detection(self) -> str:
        """模拟虚假检测"""
        return "正在分析岗位信息，请稍候..."

    def _mock_fake_detection_json(self) -> dict:
        """模拟虚假岗位检测结果"""
        is_fake = random.random() < 0.2  # 20%概率是可疑岗位
        if is_fake:
            return {
                "is_fake": True,
                "risk_level": "high",
                "confidence": round(random.uniform(0.75, 0.90), 2),
                "warnings": ["薪资明显高于市场均价", "要求预付押金", "联系方式模糊"]
            }
        else:
            return {
                "is_fake": False,
                "risk_level": "low",
                "confidence": round(random.uniform(0.80, 0.95), 2),
                "warnings": []
            }

    def _mock_credit_score(self) -> str:
        """模拟信用评分"""
        return "正在计算用户信用分，请稍候..."

    def _mock_credit_score_json(self) -> dict:
        """模拟信用评分结果"""
        score = random.randint(650, 900)
        level = "优秀" if score >= 800 else "良好" if score >= 700 else "一般" if score >= 600 else "待提升"
        return {
            "score": score,
            "level": level,
            "factors": {
                "completion_rate": round(random.uniform(85, 99), 1),
                "rating": round(random.uniform(4.2, 5.0), 1),
                "response_rate": round(random.uniform(90, 100), 1),
                "history_months": random.randint(3, 24)
            }
        }


# 全局单例
gemini_service = GeminiService()
