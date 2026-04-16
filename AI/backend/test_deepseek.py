"""
单独测试 DeepSeek API 是否正常工作
"""
from openai import OpenAI
import os
from pathlib import Path

# 读取 .env 文件
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f.read().splitlines():
            if line.strip() and not line.startswith("#"):
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()

api_key = os.getenv("DEEPSEEK_API_KEY", "")

print(f"API Key: {api_key[:10]}..." if api_key else "No API Key found")

if not api_key or api_key == "sk-your-api-key-here":
    print("❌ 请先配置正确的 API Key")
    exit(1)

try:
    client = OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com"
    )

    print("正在测试 DeepSeek API...")

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "user", "content": "你好，请回复'API连接成功'"}
        ],
        max_tokens=100,
    )

    print(f"✅ API 正常！")
    print(f"回复: {response.choices[0].message.content}")

except Exception as e:
    print(f"❌ API 调用失败: {e}")
    print("\n可能的原因:")
    print("1. API Key 无效或已过期")
    print("2. 网络无法连接到 DeepSeek")
    print("3. 账户余额不足")
