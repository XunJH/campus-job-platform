# 校园智能兼职平台 · AI招聘助手后端

> 基于 **FastAPI + DeepSeek/Gemini** 的校园兼职平台后端服务  
> 负责人：郭振华（Zhehua Guo）· 模块 C — AI 功能模块

---

## 📌 项目简介

本项目是「校园智能兼职服务平台」的后端 AI 模块，提供 **7 项核心 AI 能力**：

| # | 功能 | 说明 |
|---|------|------|
| 1 | 🧠 AI 人格画像 | 10 题问卷 × 9 维度，量化用户性格特征 |
| 2 | 📋 人格报告生成 | AI 生成结构化报告（标签 / 优势 / 不足） |
| 3 | 🎯 智能岗位匹配 | 规则评分 + AI 推理，输出 Top-N 岗位推荐 |
| 4 | 💬 AI 对话助手 | 「小兼」多轮对话，支持意图识别与情绪分析 |
| 5 | ✅ 认证辅助审核 | AI 分析证件材料真实性，输出风险等级 |
| 6 | 🔍 虚假岗位检测 | 多维度识别可疑招聘信息，保护学生安全 |
| 7 | ⭐ 信用分计算 | 规则引擎 100 分制，支持等级评定与改进建议 |

另包含 **薪资托管模块**，实现资金冻结 → 发放 → 退款 → 申诉的完整资金流转。

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| Web 框架 | FastAPI |
| AI 接入 | DeepSeek V3 / Gemini（双模式切换） |
| 数据验证 | Pydantic v2 |
| 配置管理 | pydantic-settings + python-dotenv |
| API 文档 | Swagger UI（自动生成） |
| Python | 3.8+ |

---

## 🚀 快速启动

### 1. 克隆 & 安装依赖

```bash
git clone <your-repo-url>
cd backend
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
# 复制模板
copy .env.example .env

# 编辑 .env，填入你的 API Key
# 如果暂时没有 Key，保持 USE_MOCK=true 即可直接运行
```

### 3. 启动服务

```bash
# 方式一：直接启动
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 方式二：双击 启动服务.bat（Windows）
```

### 4. 访问 API 文档

```
http://localhost:8000/docs
```

---

## 📡 API 接口总览

### 人格画像 `/personality`
```
GET  /personality/questionnaire   获取 10 题性格测试问卷
POST /personality/analyze         提交答案，AI 生成人格画像
```

### 智能匹配 `/matching`
```
GET  /matching/jobs               获取全部可用岗位（10个）
POST /matching/recommend          根据人格画像推荐 Top-N 岗位
```

### AI 对话 `/chat`
```
POST /chat/send                   多轮对话，获取 AI 回复
POST /chat/intent                 意图识别（7种意图 + 情绪分析）
```

### 认证审核 `/verification`
```
POST /verification/verify         AI 辅助审核认证材料
POST /verification/fraud-check    虚假岗位检测
POST /verification/credit-score   信用分计算
```

### 薪资托管 `/salary`
```
POST /salary/audit                资金安全审核
POST /salary/escrow               创建托管记录
POST /salary/freeze               冻结资金（企业操作）
POST /salary/release              发放工资
POST /salary/dispute              发起申诉
GET  /salary/escrow/{id}          查询托管记录详情
GET  /salary/list/{user_id}       查询用户所有记录
GET  /salary/account/{user_id}    查询账户余额
```

---

## 📁 项目结构

```
backend/
├── .env.example          # 环境变量模板（.env 本身不上传）
├── .gitignore
├── requirements.txt
├── start.bat             # Windows 一键启动
└── app/
    ├── main.py           # FastAPI 应用入口，CORS 配置
    ├── core/
    │   └── config.py     # 全局配置（pydantic-settings）
    ├── api/              # 路由层（接收请求 → 调用服务）
    │   ├── personality.py
    │   ├── matching.py
    │   ├── chat.py
    │   ├── verification.py
    │   └── salary.py
    ├── models/           # 数据模型（Pydantic）
    │   ├── ai_models.py
    │   └── salary_models.py
    └── services/         # 业务逻辑层
        ├── deepseek_service.py   # DeepSeek API 封装（真实模式）
        ├── gemini_service.py     # Mock 服务（无 Key 时使用）
        ├── personality_service.py
        ├── matching_service.py
        ├── chat_assistant.py
        └── salary_service.py
```

---

## ⚙️ AI 模式说明

项目支持 **双模式切换**，方便在无 API Key 时本地开发：

```env
USE_MOCK=true   # Mock 模式：返回模拟数据，无需 Key
USE_MOCK=false  # 真实模式：调用 DeepSeek V3 API
```

---

## 🔗 对接说明（前端 / 队友参考）

- 所有接口统一返回 JSON，成功时含 `code: 200`
- AI 功能接口响应时间约 1~3s（真实模式），Mock 模式即时返回
- CORS 已配置，支持 `http://localhost:4200`（Angular 默认端口）
- 接口详细参数见：`http://localhost:8000/docs`

---

## 📝 开发备注

- 当前数据存储使用**内存字典**模拟（服务重启清空），正式版需接入数据库
- `salary` 模块预设了两个演示账户：`enterprise_001`（¥50000余额）和 `student_001`
- 人格画像维度共 9 个：外向性、尽责性、开放性、宜人性、情绪稳定性、时间管理、沟通能力、学习能力、专注力
