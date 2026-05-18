"""Personality profile service."""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List

from ..models.ai_models import PersonalityProfile, PersonalityQuestion
from ..services.ai_provider import _ai_service


class PersonalityService:
    """Generate a structured personality profile from questionnaire answers."""

    def __init__(self) -> None:
        self.question_pool = self._init_question_pool()

    def _init_question_pool(self) -> List[PersonalityQuestion]:
        return [
            PersonalityQuestion(
                id=1,
                question="周末你更喜欢哪种安排？",
                options=[
                    {"text": "和朋友一起外出活动", "score": 5},
                    {"text": "参加聚会或社交活动", "score": 4},
                    {"text": "一个人安静休息", "score": 2},
                    {"text": "在家看书或看电影", "score": 1},
                ],
                dimension="外向性",
            ),
            PersonalityQuestion(
                id=2,
                question="接到任务后，你通常会怎么做？",
                options=[
                    {"text": "提前完成并主动优化", "score": 5},
                    {"text": "按时完成并保证质量", "score": 4},
                    {"text": "拖到最后再处理", "score": 2},
                    {"text": "经常忘记或拖延", "score": 1},
                ],
                dimension="尽责性",
            ),
            PersonalityQuestion(
                id=3,
                question="面对新问题时，你通常会？",
                options=[
                    {"text": "主动尝试不同方法", "score": 5},
                    {"text": "参考别人的做法后改进", "score": 4},
                    {"text": "用最常规的方法解决", "score": 2},
                    {"text": "等别人来处理", "score": 1},
                ],
                dimension="开放性",
            ),
            PersonalityQuestion(
                id=4,
                question="和同学或同事有分歧时，你更倾向于？",
                options=[
                    {"text": "主动沟通，争取双赢", "score": 5},
                    {"text": "冷静分析后协商", "score": 4},
                    {"text": "尽量避免冲突", "score": 2},
                    {"text": "情绪化处理或回避", "score": 1},
                ],
                dimension="宜人性",
            ),
            PersonalityQuestion(
                id=5,
                question="截止时间突然提前时，你会？",
                options=[
                    {"text": "迅速调整计划并高效推进", "score": 5},
                    {"text": "会紧张，但能应对", "score": 4},
                    {"text": "容易焦虑，手忙脚乱", "score": 2},
                    {"text": "不知道该怎么处理", "score": 1},
                ],
                dimension="情绪稳定性",
            ),
            PersonalityQuestion(
                id=6,
                question="你如何安排兼职与学习时间？",
                options=[
                    {"text": "提前规划并严格执行", "score": 5},
                    {"text": "有大致计划，灵活调整", "score": 4},
                    {"text": "走一步看一步", "score": 2},
                    {"text": "经常顾此失彼", "score": 1},
                ],
                dimension="时间管理",
            ),
            PersonalityQuestion(
                id=7,
                question="和新认识的人交流时，你的感受更像？",
                options=[
                    {"text": "很自然，很快熟悉", "score": 5},
                    {"text": "需要一点时间适应", "score": 4},
                    {"text": "有点紧张，不太主动", "score": 2},
                    {"text": "很不自在，尽量少说话", "score": 1},
                ],
                dimension="沟通能力",
            ),
            PersonalityQuestion(
                id=8,
                question="学习一项新技能时，你通常？",
                options=[
                    {"text": "主动研究，不懂就查资料", "score": 5},
                    {"text": "跟着教程一步步学", "score": 4},
                    {"text": "需要别人手把手带", "score": 2},
                    {"text": "学不会就容易放弃", "score": 1},
                ],
                dimension="学习能力",
            ),
            PersonalityQuestion(
                id=9,
                question="你找兼职的主要目标是？",
                options=[
                    {"text": "积累经验，为未来铺路", "score": 5},
                    {"text": "赚零花钱，同时学点东西", "score": 4},
                    {"text": "主要为了赚钱", "score": 2},
                    {"text": "打发时间", "score": 1},
                ],
                dimension="职业动机",
            ),
            PersonalityQuestion(
                id=10,
                question="工作时手机来了消息，你会？",
                options=[
                    {"text": "先专注工作，稍后回复", "score": 5},
                    {"text": "看一眼，简单回复后继续工作", "score": 4},
                    {"text": "忍不住频繁回复，影响工作", "score": 2},
                    {"text": "直接玩手机忘了工作", "score": 1},
                ],
                dimension="专注力",
            ),
        ]

    def get_questionnaire(self, count: int = 10) -> List[Dict[str, Any]]:
        questions = self.question_pool[:count]
        return [
            {
                "id": question.id,
                "question": question.question,
                "options": [{"text": option["text"]} for option in question.options],
                "dimension": question.dimension,
            }
            for question in questions
        ]

    def analyze_answers(self, user_id: str, answers: List[Dict[str, Any]]) -> PersonalityProfile:
        dimension_scores: Dict[str, List[int]] = {}

        for answer in answers:
            question_id = int(answer["question_id"])
            selected_index = int(answer["selected_option"])

            question = next((item for item in self.question_pool if item.id == question_id), None)
            if not question:
                raise ValueError(f"未找到编号为 {question_id} 的测评题目。")

            if selected_index < 0 or selected_index >= len(question.options):
                raise ValueError(f"第 {question_id} 题的选项索引无效。")

            dimension_scores.setdefault(question.dimension, []).append(
                int(question.options[selected_index]["score"])
            )

        if not dimension_scores:
            raise ValueError("没有可用于分析的测评答案。")

        normalized_scores = {
            dimension: round(sum(scores) / len(scores) / 5, 2)
            for dimension, scores in dimension_scores.items()
        }

        prompt = self._build_analysis_prompt(normalized_scores, dimension_scores)
        analysis = _ai_service.generate_text(prompt, temperature=0.7)
        return self._parse_ai_response(user_id, normalized_scores, analysis)

    def _build_analysis_prompt(
        self,
        normalized_scores: Dict[str, float],
        raw_scores: Dict[str, List[int]],
    ) -> str:
        score_text = "\n".join(
            [
                f"- {dimension}: {', '.join(map(str, scores))}（平均 {sum(scores) / len(scores):.1f}/5）"
                for dimension, scores in raw_scores.items()
            ]
        )

        return f"""
你是一名专业的校园求职顾问。请根据以下人格测评结果，输出一份适合大学生兼职与实习场景的画像摘要。

【测评结果】
{score_text}

【输出要求】
1. 给出 3 到 5 个清晰、积极、可用于招聘匹配的人格标签。
2. 给出 2 到 3 条核心优势，强调与工作相关的表现。
3. 给出 1 到 2 条需要注意的不足，语气客观且建设性。
4. 推荐 3 到 5 类适合的岗位方向。
5. 给出一段 60 字以内的整体总结。

请只输出 JSON，格式如下：
{{
  "tags": ["标签1", "标签2", "标签3"],
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["不足1", "不足2"],
  "suitable_jobs": ["岗位方向1", "岗位方向2"],
  "summary": "一句话总结"
}}
"""

    def _parse_ai_response(
        self,
        user_id: str,
        normalized_scores: Dict[str, float],
        raw_response: str,
    ) -> PersonalityProfile:
        data: Dict[str, Any] = {}
        json_match = re.search(r"\{.*\}", raw_response, re.DOTALL)

        if json_match:
            try:
                data = json.loads(json_match.group())
            except json.JSONDecodeError:
                data = {}

        auto_tags = self._generate_tags_from_scores(normalized_scores)
        ai_tags = [str(item).strip() for item in data.get("tags", []) if str(item).strip()]
        all_tags = list(dict.fromkeys(auto_tags + ai_tags))[:5]

        strengths = [str(item).strip() for item in data.get("strengths", []) if str(item).strip()]
        weaknesses = [str(item).strip() for item in data.get("weaknesses", []) if str(item).strip()]
        suitable_jobs = [str(item).strip() for item in data.get("suitable_jobs", []) if str(item).strip()]
        summary = (
            str(data.get("summary", "")).strip()
            or "这位同学整体表现较稳，适合继续结合具体岗位场景做进一步评估。"
        )

        return PersonalityProfile(
            user_id=user_id,
            dimensions=normalized_scores,
            tags=all_tags or ["踏实稳健", "具备成长潜力"],
            summary=summary,
            strengths=strengths or ["执行节奏较稳定", "具备持续提升空间"],
            weaknesses=weaknesses or ["建议结合真实工作场景继续验证个人优势"],
            suitable_jobs=suitable_jobs or ["校园运营", "助理支持", "内容整理"],
        )

    def _generate_tags_from_scores(self, scores: Dict[str, float]) -> List[str]:
        tags: List[str] = []
        thresholds = {
            "外向性": (0.7, "开朗健谈"),
            "尽责性": (0.7, "认真负责"),
            "开放性": (0.7, "富有创意"),
            "宜人性": (0.7, "善于合作"),
            "情绪稳定性": (0.6, "心态稳定"),
            "时间管理": (0.7, "善于规划"),
            "沟通能力": (0.7, "表达流畅"),
            "学习能力": (0.7, "学习力强"),
            "职业动机": (0.7, "目标明确"),
            "专注力": (0.7, "专注度高"),
        }

        for dimension, (threshold, tag) in thresholds.items():
            if scores.get(dimension, 0) >= threshold:
                tags.append(tag)

        return tags


personality_service = PersonalityService()
