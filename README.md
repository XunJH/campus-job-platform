# 校园智能招聘平台 (Campus Smart Job Platform)

一个面向高校学生与企业的校园招聘平台，覆盖学生求职、企业招聘、平台审核与 AI 辅助能力。当前版本已经完成基础招聘闭环，包含岗位浏览与投递、企业岗位管理、管理员审核、AI 推荐与风险辅助、结算记录等核心模块。

---

## 功能特性
### 学生端
- 岗位浏览与多维筛选，支持查看岗位详情、收藏岗位和投递岗位
- 我的投递、我的收藏、个人资料与钱包/收入记录页面
- AI 人格画像、岗位推荐、面试辅助等智能能力
- 企业认证与岗位审核后的真实投递状态跟踪
- 登录、注册、密码帮助等统一认证页面

### 企业雇主端
- 企业资料维护与认证申请
- 岗位发布、编辑、启停、删除与审核状态跟踪
- 申请管理：查看投递学生、通过/拒绝申请、处理状态流转
- AI 招聘助手：招聘问答、候选人推荐、风险辅助
- 结算管理与招聘工作台总览

### 管理后台
- 用户管理
- 企业认证审核
- 岗位审核与风险结果查看
- 结算记录管理
- 后台工作台与统计视图

### AI 能力
- 人格画像分析与岗位推荐
- 企业认证预审与岗位反诈风险辅助
- 招聘问答、候选人推荐、简历优化、面试辅助
- AI 服务通过独立 FastAPI 后端提供接口

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 主前端 | Angular 18 + Tailwind CSS + Angular Material |
| 管理后台 | Angular 16 + Tailwind CSS + Angular Material |
| 后端 API | Node.js + Express + Sequelize + MySQL |
| AI 服务 | Python + FastAPI + OpenAI / DeepSeek / Gemini / Kimi 兼容接入 |
| 认证 | JWT (Bearer Token) |
| 本地代理 | Angular DevServer Proxy -> `http://localhost:3001` |

---

## 项目结构

```text
campus-job-platform/
├── campus_job_api/          # Node.js 后端 API
│   ├── controllers/         # 业务控制器
│   ├── models/              # Sequelize 数据模型
│   ├── routes/              # Express 路由
│   ├── middlewares/         # 认证与权限中间件
│   ├── services/            # AI 接口服务、业务服务
│   ├── scripts/             # 数据库同步与迁移脚本
│   └── server.js            # 服务入口
├── frontend/                # 学生端 / 企业端前台
│   ├── src/app/features/student/
│   ├── src/app/features/employer/
│   ├── src/app/features/auth/
│   └── src/environments/
├── admin/                   # 管理后台
│   └── src/app/features/
├── Ai/
│   └── backend/             # FastAPI AI 服务
├── start.bat                # 一键启动前后端与 AI 服务
└── README.md
```

---

## 环境要求

- **Node.js** >= 18
- **MySQL** >= 8.0
- **Python** >= 3.10
- Windows 环境下可直接使用根目录 `start.bat` 一键启动

---

## 快速启动
### 1. 后端 API

```bash
cd campus_job_api
npm install
copy .env.example .env
# 按本地 MySQL 实际情况修改 .env
npm run dev
```

默认地址：`http://localhost:3001`

### 2. 主前端

```bash
cd frontend
npm install
npm start
```

默认地址：`http://localhost:4202`

### 3. 管理后台

```bash
cd admin
npm install
npm start
```

默认地址：`http://localhost:4201`

### 4. AI 服务（可选）

```bash
cd Ai/backend
copy .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

默认地址：`http://localhost:8000`

如果你已经配置好 MySQL、Node 和 Python，也可以直接双击根目录：

```bash
start.bat
```

它会自动拉起：
- 主 API：`3001`
- AI 服务：`8000`
- 前端：`4202`
- 管理后台：`4201`

---

## 默认端口

| 服务 | 端口 |
|------|------|
| 后端 API | 3001 |
| 主前端 | 4202 |
| 管理后台 | 4201 |
| AI 服务 | 8000 |

---

## 关键配置

### 前端代理 (`frontend/proxy.conf.json`)

```json
{
  "/api": {
    "target": "http://localhost:3001",
    "secure": false
  },
  "/ai": {
    "target": "http://localhost:8000",
    "secure": false,
    "pathRewrite": {
      "^/ai": ""
    }
  }
}
```

### 后端环境变量 (`campus_job_api/.env`)

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=campus_job_platform
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
PORT=3001
```

AI 服务需要单独配置：
- `Ai/backend/.env`
- 模型 API Key
- `CAMPUS_JOB_API_URL`
- `USE_MOCK`

---

## 数据库模型
核心表包括：
- `users`：学生、企业、管理员
- `jobs`：岗位信息、审核状态、AI 风险结果
- `applications`：岗位申请记录与处理状态
- `bookmarks`：学生收藏岗位
- `verifications`：企业认证记录
- `settlements`：结算与收入记录

---

## 开发注意事项
- 本地开发推荐优先启动 MySQL，再启动后端与前端
- `frontend` 使用 `4202`，`admin` 使用 `4201`，避免和默认 Angular 端口冲突
- AI 服务默认支持 mock 与真实模型配置两种模式

---

## License

MIT
