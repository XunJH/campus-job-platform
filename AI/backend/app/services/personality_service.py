"""
AI人格画像服务

通过问卷 + AI分析，生成用户的人格画像
"""

import os
from typing import List, Dict, Any
from ..core.config import settings
from ..models.ai_models import (
    PersonalityQuestion,
    PersonalityAnswer,
    PersonalityProfile
)

USE_MOCK = os.getenv("USE_MOCK", str(settings.USE_MOCK)).lower() == "true"

if USE_MOCK:
    from ..services.gemini_service import GeminiService
    _ai_service = GeminiService()
else:
    from ..services.deepseek_service import DeepSeekService
    _ai_service = DeepSeekService()


class PersonalityService:
    """人格画像服务"""

    def __init__(self):
        self.question_pool = self._init_question_pool()

    def _init_question_pool(self) -> List[PersonalityQuestion]:
        """初始化问卷题库（10道核心题目，每题对应一个人格维度）"""
        questions = [
            PersonalityQuestion(
                id=1,
                question="周末你更喜欢：",
                options=[
                    {"text": "约朋友一起出去玩", "score": 5},
                    {"text": "参加聚会或社交活动", "score": 4},
                    {"text": "一个人安静地待着", "score": 2},
                    {"text": "在家看书或看电影", "score": 1}
                ],
                dimension="外向性"
            ),

            PersonalityQuestion(
                id=2,
                question="当老师/老板布置了一个任务，你会：",
                options=[
                    {"text": "提前完成，还主动优化", "score": 5},
                    {"text": "按时完成，保证质量", "score": 4},
                    {"text": "拖到最后一天才做", "score": 2},
                    {"text": "经常忘记或拖延", "score": 1}
                ],
                dimension="尽责性"
            ),

            PersonalityQuestion(
                id=3,
                question="面对一个新问题，你通常会：",
                options=[
                    {"text": "尝试完全不同的方法", "score": 5},
                    {"text": "参考别人做法再改进", "score": 4},
                    {"text": "用最常规的方法解决", "score": 2},
                    {"text": "等待别人来解决", "score": 1}
                ],
                dimension="开放性"
            ),

            PersonalityQuestion(
                id=4,
                question="当和同事/同学发生矛盾时，你会：",
                options=[
                    {"text": "主动沟通，寻求双赢", "score": 5},
                    {"text": "冷静分析后协商解决", "score": 4},
                    {"text": "尽量避免冲突", "score": 2},
                    {"text": "生气或冷战", "score": 1}
                ],
                dimension="宜人性"
            ),

            PersonalityQuestion(
                id=5,
                question="当deadline提前了一天，你会：",
                options=[
                    {"text": "冷静调整计划，高效完成", "score": 5},
                    {"text": "有点紧张但能应对", "score": 4},
                    {"text": "感到焦虑，手忙脚乱", "score": 2},
                    {"text": "崩溃，不知道怎么办", "score": 1}
                ],
                dimension="情绪稳定性"
            ),

            PersonalityQuestion(
                id=6,
                question="你平时如何安排兼职和学习的时间？",
                options=[
                    {"text": "提前规划，严格执行", "score": 5},
                    {"text": "有个大概计划，灵活调整", "score": 4},
                    {"text": "走一步看一步", "score": 2},
                    {"text": "经常顾此失彼", "score": 1}
                ],
                dimension="时间管理"
            ),

            PersonalityQuestion(
                id=7,
                question="和新认识的同事/同学交流，你感觉：",
                options=[
                    {"text": "很自然，很快就熟络", "score": 5},
                    {"text": "需要一点时间适应", "score": 4},
                    {"text": "有点紧张，不太主动", "score": 2},
                    {"text": "很不自在，尽量少说话", "score": 1}
                ],
                dimension="沟通能力"
            ),

            PersonalityQuestion(
                id=8,
                question="学习一项新技能时，你通常：",
                options=[
                    {"text": "主动研究，不懂就查资料", "score": 5},
                    {"text": "跟着教程一步步学", "score": 4},
                    {"text": "需要别人手把手教", "score": 2},
                    {"text": "学不会就放弃了", "score": 1}
                ],
                dimension="学习能力"
            ),

            PersonalityQuestion(
                id=9,
                question="你找兼职的主要目的是：",
                options=[
                    {"text": "积累经验，为未来打基础", "score": 5},
                    {"text": "赚零花钱，顺便学东西", "score": 4},
                    {"text": "主要为了赚钱", "score": 2},
                    {"text": "打发时间", "score": 1}
                ],
                dimension="职业动机"
            ),

            PersonalityQuestion(
                id=10,
                question="工作时手机来了消息，你会：",
                options=[
                    {"text": "先专注工作，稍后回复", "score": 5},
                    {"text": "看一眼，简单回复后继续工作", "score": 4},
                    {"text": "忍不住回复，导致工作拖沓", "score": 2},
                    {"text": "直接玩手机忘了工作", "score": 1}
                ],
                dimension="专注力"
            ),
        ]
        return questions

    def get_questionnaire(self, count: int = 10) -> List[Dict[str, Any]]:
        """获取指定数量的题目，不返回分值信息"""
        questions = self.question_pool[:count]
        return [
            {
                "id": q.id,
                "question": q.question,
                "options": [{"text": opt["text"]} for opt in q.options],
                "dimension": q.dimension
            }
            for q in questions
        ]

    def analyze_answers(
        self,
        user_id: str,
        answers: List[Dict[str, Any]]
    ) -> PersonalityProfile:
        """
        核心功能：分析用户答题结果，生成人格画像

        步骤：
        1. 计算各维度得分
        2. 调用AI生成分析报告
        3. 返回结构化的人格画像
        """
        # 统计各维度得分
        dimension_scores: Dict[str, List[int]] = {}

        for answer in answers:
            question_id = answer["question_id"]
            selected_index = answer["selected_option"]

            question = next(
                (q for q in self.question_pool if q.id == question_id),
                None
            )
            if not question:
                continue

            dimension = question.dimension
            score = question.options[selected_index]["score"]

            if dimension not in dimension_scores:
                dimension_scores[dimension] = []
            dimension_scores[dimension].append(score)

        # 各维度得分归一化到 0-1
        normalized_scores = {}
        for dim, scores in dimension_scores.items():
            avg_score = sum(scores) / len(scores)
            normalized_scores[dim] = round(avg_score / 5, 2)

        prompt = self._build_analysis_prompt(normalized_scores, dimension_scores)
        analysis = _ai_service.generate_text(prompt, temperature=0.7)
        profile = self._parse_ai_response(user_id, normalized_scores, analysis)

        return profile

    def _build_analysis_prompt(
        self,
        normalized_scores: Dict[str, float],
        raw_scores: Dict[str, List[int]]
    ) -> str:
        """构建人格分析提示词"""
        score_text = "\n".join([
            f"- {dim}: {', '.join(map(str, scores))} (平均: {sum(scores)/len(scores):.1f}/5分)"
            for dim, scores in raw_scores.items()
        ])

        prompt = f"""
你是一个专业的职业性格分析师。请分析以下校园兼职求职者的性格测试结果，生成一份专业的人格画像报告。

【测试结果】
{score_text}

【分析要求】
请从以下维度生成分析报告：

1. **性格标签**：根据测试结果，给出3-5个精准的性格标签（如：开朗外向、责任心强、善于沟通、细心认真等）

2. **优势分析**：列出该求职者最突出的2-3个优势

3. **不足之处**：客观指出需要注意的1-2个不足（语气要委婉）

4. **适合的岗位类型**：根据性格特点，推荐3-5种适合的兼职岗位类型

5. **一句话总结**：用一段话（50字以内）总结该求职者的整体特点

请用JSON格式输出，结构如下：
{{
    "tags": ["标签1", "标签2", "标签3"],
    "strengths": ["优势1", "优势2"],
    "weaknesses": ["不足1", "不足2"],
    "suitable_jobs": ["岗位类型1", "岗位类型2"],
    "summary": "一句话总结"
}}
"""
        return prompt

    def _parse_ai_response(
        self,
        user_id: str,
        normalized_scores: Dict[str, float],
        raw_response: str
    ) -> PersonalityProfile:
        """解析AI返回的JSON，构建人格画像对象"""
        import json
        import re

        json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group())
            except json.JSONDecodeError:
                data = {}
        else:
            data = {}

        # 合并规则生成的标签和AI补充的标签（去重，最多5个）
        auto_tags = self._generate_tags_from_scores(normalized_scores)
        gemini_tags = data.get("tags", [])
        all_tags = list(dict.fromkeys(auto_tags + gemini_tags))[:5]

        profile = PersonalityProfile(
            user_id=user_id,
            dimensions=normalized_scores,
            tags=all_tags,
            summary=data.get("summary", "性格特点待分析"),
            strengths=data.get("strengths", []),
            weaknesses=data.get("weaknesses", []),
            suitable_jobs=data.get("suitable_jobs", [])
        )

        return profile

    def _generate_tags_from_scores(self, scores: Dict[str, float]) -> List[str]:
        """根据各维度得分，通过阈值规则自动生成性格标签"""
        tags = []
        thresholds = {
            "外向性": (0.7, "开朗健谈"),
            "尽责性": (0.7, "认真负责"),
            "开放性": (0.7, "富有创意"),
            "宜人性": (0.7, "善于合作"),
            "情绪稳定性": (0.6, "心态稳健"),
            "时间管理": (0.7, "善于规划"),
            "沟通能力": (0.7, "表达流畅"),
            "学习能力": (0.7, "学习力强"),
            "专注力": (0.7, "专注度高")
        }

        for dimension, (threshold, tag) in thresholds.items():
            if scores.get(dimension, 0) >= threshold:
                tags.append(tag)

        return tags


# 创建全局实例
personality_service = PersonalityService()
