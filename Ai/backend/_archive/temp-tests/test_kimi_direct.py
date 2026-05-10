from app.services.kimi_service import KimiService

ks = KimiService()
prompt = """你是一个专业的认证审核助手。请分析以下认证材料，判断其真实性和可信度。

【认证类型】
enterprise

【用户ID】
9999

【认证内容】
企业名称：测试公司
营业执照号：123456789

【审核要点】
1. 信息是否完整、清晰
2. 是否存在明显的伪造痕迹
3. 文字描述是否合理

请返回JSON格式的审核结果：
{
    "is_valid": true/false,
    "risk_level": "low/medium/high",
    "details": ["具体发现1", "具体发现2"],
    "suggestions": ["建议1", "建议2"]
}"""

try:
    r = ks.generate_text(prompt, temperature=0.3)
    print('RAW RESPONSE:')
    print(r)
except Exception as e:
    print('ERROR:', e)
