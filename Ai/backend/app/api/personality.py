"""Personality profile APIs."""

from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from ..services.personality_service import personality_service

router = APIRouter(prefix="/personality", tags=["人格画像"])


class GetQuestionnaireRequest(BaseModel):
    """Request payload for questionnaire size."""

    count: int = 10


class SubmitAnswerItem(BaseModel):
    """Single answer item from the personality questionnaire."""

    model_config = ConfigDict(populate_by_name=True)

    question_id: int = Field(validation_alias=AliasChoices("question_id", "questionId"))
    selected_option: int = Field(validation_alias=AliasChoices("selected_option", "selectedOption"))


class SubmitAnswersRequest(BaseModel):
    """Request payload for personality analysis."""

    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(validation_alias=AliasChoices("user_id", "userId"))
    answers: List[SubmitAnswerItem]


@router.get("/questionnaire")
async def get_questionnaire():
    """Return the personality questionnaire used by the frontend."""

    questions = personality_service.get_questionnaire()
    return {
        "code": 200,
        "message": "success",
        "data": {
            "total": len(questions),
            "questions": questions,
        },
    }


@router.post("/analyze")
async def analyze_personality(request: SubmitAnswersRequest):
    """Analyze questionnaire answers and generate a personality profile."""

    if not request.answers:
        raise HTTPException(status_code=400, detail="请至少提交一条测评答案。")

    normalized_answers = [
        {
            "question_id": int(item.question_id),
            "selected_option": int(item.selected_option),
        }
        for item in request.answers
    ]

    try:
        profile = personality_service.analyze_answers(
            user_id=str(request.user_id),
            answers=normalized_answers,
        )

        return {
            "code": 200,
            "message": "分析完成",
            "data": {
                "user_id": profile.user_id,
                "dimensions": profile.dimensions,
                "tags": profile.tags,
                "summary": profile.summary,
                "strengths": profile.strengths,
                "weaknesses": profile.weaknesses,
                "suitable_jobs": profile.suitable_jobs,
            },
        }
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
