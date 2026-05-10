"""
FastAPI 主程序入口

整个后端服务的入口文件
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .api import personality, matching, chat, verification, resume, employer, career, review, interview, jd, chat_warning

# 创建FastAPI应用
app = FastAPI(
    title=settings.APP_NAME,
    description="校园智能兼职平台的AI招聘助手后端API",
    version="1.0.0"
)

# 配置CORS，允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(personality.router)   # 人格画像
app.include_router(matching.router)       # AI匹配
app.include_router(chat.router)           # AI聊天助手
app.include_router(verification.router)   # 风险审核
app.include_router(resume.router)        # 简历 AI（优化/拒信分析/动态更新）
app.include_router(employer.router)      # 企业端 AI（JD优化）
app.include_router(career.router)        # 职业辅助 AI（合同审核）
app.include_router(interview.router)      # 模拟面试
app.include_router(jd.router)            # JD 分析
app.include_router(review.router)         # 互评 AI（学生评企业/企业评学生/口碑摘要）
app.include_router(chat_warning.router)   # 聊天风险预警


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
