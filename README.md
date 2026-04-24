# 校园智能招聘平台 (Campus Smart Job Platform)

一个专为高校学生打造的智能化校园招聘平台，集成 AI 人格画像分析、岗位智能匹配、虚假岗位检测等能力，连接学生、企业雇主与平台管理员三方角色。

---

## 功能特性

### 学生端
- 岗位浏览与多维筛选（岗位类型、工作地点、工作方式、薪资范围）
- 一键投递简历，实时查看申请状态
- AI 人格画像测试，获取职业洞察与岗位匹配推荐
- 个人资料页 / 在线简历编辑器（教育背景、工作经历、技能工具）
- 忘记密码自助重置

### 企业雇主端
- 企业资料管理与认证
- 岗位发布与编辑（支持岗位类别、工作地点类型）
- 岗位状态管理（招聘中 / 暂停 / 结束）
- 申请者查看与流程跟踪
- AI 虚假岗位检测辅助

### 管理后台
- 岗位审核（通过 / 拒绝）
- 企业认证审核
- 用户管理
- 数据统计与看板

### AI 能力
- 人格画像分析（基于 MBTI + 职业维度）
- 岗位智能匹配推荐
- 虚假岗位风险检测
- AI 聊天助手

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 主前端 | Angular 18 + Tailwind CSS + Material Symbols |
| 管理后台 | Angular 18 + Tailwind CSS |
| 后端 API | Node.js + Express + Sequelize + MySQL |
| AI 服务 | Python + FastAPI + DeepSeek / Gemini / Kimi |
| 认证 | JWT (Bearer Token) |
| 代理 | Angular DevServer Proxy → `http://localhost:3001` |

---

## 项目结构

```
campus-job-platform/
├── campus_job_api/          # Node.js 后端 API
│   ├── controllers/         # 业务控制器
│   ├── models/              # Sequelize 数据模型
│   ├── routes/              # Express 路由
│   ├── middlewares/         # 认证与权限中间件
│   ├── services/            # AI 检测服务
│   ├── scripts/             # 数据库同步与迁移脚本
│   └── server.js            # 服务入口
│
├── frontend/                # Angular 主前端（学生 + 雇主 + 认证）
│   ├── src/app/features/student/      # 学生端页面
│   ├── src/app/features/employer/     # 雇主端页面
│   ├── src/app/features/auth/         # 登录 / 注册 / 忘记密码
│   └── proxy.conf.json                # API 代理配置
│
├── admin/                   # Angular 管理后台
│   └── src/app/features/    # 仪表盘 / 岗位审核 / 用户管理 / 认证审核
│
├── Ai/
│   ├── backend/             # Python FastAPI AI 服务
│   └── frontend/            # AI 前端组件（聊天 / 画像 / 匹配）
│
├── UI/                      # UI 设计稿
└── stitch_campus_smart_job_platform/   # 设计规范与原型
```

---

## 环境要求

- **Node.js** >= 18
- **MySQL** >= 8.0
- **Python** >= 3.10（AI 服务，可选）

---

## 快速启动

### 1. 后端 API

```bash
cd campus_job_api
npm install

# 配置数据库
cp .env.example .env
# 编辑 .env，填写 MySQL 连接信息

# 同步数据库
node scripts/sync-database.js

# 启动服务
node server.js
# 或
npm start
```

后端默认运行在 `http://localhost:3001`

### 2. 主前端

```bash
cd frontend
npm install
npm start
```

前端默认运行在 `http://localhost:4202`，API 请求通过 proxy 自动转发到 `localhost:3001`

### 3. 管理后台

```bash
cd admin
npm install
ng serve --port 4204
```

### 4. AI 服务（可选）

```bash
cd Ai/backend
pip install -r requirements.txt
# 配置 .env 中的 AI API Keys
uvicorn app.main:app --reload --port 8000
```

---

## 默认端口

| 服务 | 端口 |
|------|------|
| 后端 API | 3001 |
| 主前端 | 4202 |
| 管理后台 | 4204 |
| AI 服务 | 8000 |

---

## 关键配置

### 前端代理 (`frontend/proxy.conf.json`)

```json
{
  "/api": {
    "target": "http://localhost:3001",
    "secure": false
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
```

---

## 数据库模型

核心表：
- `users` — 用户（学生 / 雇主 / 管理员）
- `jobs` — 岗位（含审核状态、AI 检测结果）
- `applications` — 岗位申请
- `bookmarks` — 收藏
- `verifications` — 企业认证记录

---

## 开发注意事项

- 前端 `styles.scss` 中已全局重置 `button { border: 0; cursor: pointer; }`，因为 Tailwind `preflight` 已关闭
- 学生简历数据存储在 `user.personalityProfile` JSON 字段中
- 岗位 `category` 与 `workLocation` 为新增筛选字段，旧数据默认值分别为 `"其他"` / `"on_campus"`
- AI 人格画像弹窗仅对学生角色 (`role === 'student'`) 显示

---

## License

MIT
