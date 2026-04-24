@echo off
chcp 65001 >nul
title 校园智能兼职平台 - AI招聘助手

echo ========================================
echo   校园智能兼职平台 - AI招聘助手
echo ========================================
echo.

:: 检查是否配置了API密钥
if not exist ".env" (
    echo [提示] 未找到 .env 配置文件
    echo 请创建 .env 文件，写入以下内容：
    echo   GEMINI_API_KEY=你的Gemini密钥
    echo.
    echo 如果还没有密钥，请访问：
    echo   https://makersuite.google.com/app/apikey
    echo.
    pause
    exit /b 1
)

:: 检查 .env 中是否有有效的 API 密钥
findstr /C:"GEMINI_API_KEY=your-api-key" .env >nul
if %errorlevel%==0 (
    echo [错误] 请先配置有效的 Gemini API 密钥！
    echo.
    echo 1. 访问 https://makersuite.google.com/app/apikey 获取密钥
    echo 2. 编辑 .env 文件，将 your-api-key-here 替换为你的密钥
    echo.
    pause
    exit /b 1
)

echo [配置检查] API密钥已配置
echo.

:: 检查网络连接（可选）
echo [提示] 如果在中国大陆，可能需要设置代理
echo 如果无法连接Google服务器，请设置环境变量：
echo   set HTTP_PROXY=http://127.0.0.1:7890
echo   set HTTPS_PROXY=http://127.0.0.1:7890
echo.

:: 启动服务
echo 正在启动服务...
echo 访问地址：http://localhost:8000/docs
echo 按 Ctrl+C 停止服务
echo.

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
