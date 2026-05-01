"""
FastAPI 主程序入口

整个后端服务的入口文件
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .api import personality, matching, chat, verification, interview, career, jd

# 创建FastAPI应用
app = FastAPI(
    title=settings.APP_NAME,
    description="校园智能兼职平台的AI招聘助手后端API",
    version="1.0.0"
)

# 配置CORS，允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(personality.router)
app.include_router(matching.router)
app.include_router(chat.router)
app.include_router(verification.router)
app.include_router(interview.router)
app.include_router(career.router)
app.include_router(jd.router)


@app.get("/")
async def root():
    """根路径：返回欢迎信息"""
    return {
        "message": f"欢迎使用 {settings.APP_NAME}",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """健康检查：用于监控服务状态"""
    return {"status": "ok"}


# 启动命令：
# uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
