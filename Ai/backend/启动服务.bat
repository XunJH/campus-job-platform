@echo off
title 校园兼职平台后端服务
cd /d "%~dp0"
echo ==========================================
echo   校园智能兼职平台 - AI招聘助手
echo ==========================================
echo.
echo [MOCK] 正在启动模拟服务...
echo.
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
