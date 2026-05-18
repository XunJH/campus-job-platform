"""FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import (
    career,
    chat,
    chat_warning,
    employer,
    interview,
    jd,
    matching,
    personality,
    resume,
    review,
    verification,
)
from .core.config import settings
from .services.ai_provider import get_runtime_status

app = FastAPI(
    title=settings.APP_NAME,
    description="校园智能招聘平台 AI 服务接口",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(personality.router)
app.include_router(matching.router)
app.include_router(chat.router)
app.include_router(verification.router)
app.include_router(resume.router)
app.include_router(employer.router)
app.include_router(career.router)
app.include_router(interview.router)
app.include_router(jd.router)
app.include_router(review.router)
app.include_router(chat_warning.router)


@app.get("/")
async def root():
    return {
        "message": f"欢迎使用 {settings.APP_NAME}",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/runtime-status")
async def runtime_status():
    if not settings.EXPOSE_RUNTIME_METADATA:
        return {
            "code": 404,
            "message": "运行态信息未开放",
            "data": None,
        }

    return {
        "code": 200,
        "message": "获取成功",
        "data": get_runtime_status(),
    }
