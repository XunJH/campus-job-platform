# 校园智能兼职服务平台

基于 Node.js、Express 和 MySQL 的校园兼职服务平台后端 API。

## 技术栈

- **框架**: Express.js
- **ORM**: Sequelize
- **数据库**: MySQL
- **认证**: JWT + bcryptjs
- **安全**: Helmet + CORS
- **文档**: OpenAPI/Swagger
- **开发工具**: Nodemon

## 项目结构

```
campus-job-platform/
├── src/
│   ├── config/
│   │   └── database.js          # 数据库配置
│   ├── controllers/
│   │   └── authController.js     # 认证控制器
│   ├── middleware/
│   │   ├── auth.js               # 认证中间件
│   │   └── roleGuard.js         # 角色拦截中间件
│   ├── models/
│   │   ├── index.js              # 模型关联
│   │   ├── User.js              # 用户模型
│   │   ├── Job.js               # 岗位模型
│   │   ├── Application.js       # 申请模型
│   │   └── Bookmark.js          # 收藏模型
│   └── routes/
│       └── authRoutes.js        # 认证路由
├── scripts/
│   ├── sync-database.js         # 同步数据库
│   └── drop-database.js         # 删除数据库
├── server.js                    # 服务器入口
├── package.json
├── .env.example
└── .gitignore
```

## 安装与运行

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，填入数据库连接信息
```

### 3. 启动数据库
确保 MySQL 服务正在运行，并创建数据库：
```sql
CREATE DATABASE campus_job_platform;
```

### 4. 同步数据库模型
```bash
npm run db:sync
```

### 5. 启动服务

**开发模式**：
```bash
npm run dev
```

**生产模式**：
```bash
npm start
```

## API 文档

服务启动后，可以通过以下地址访问：

- **服务地址**: http://localhost:3000
- **健康检查**: http://localhost:3000/health
- **API 路径**: http://localhost:3000/api/v1

### 认证 API

#### 注册用户
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "test_user",
  "password": "Password123",
  "email": "test@example.com",
  "role": "student"
}
```

#### 用户登录
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "test_user",
  "password": "Password123"
}
```

#### 获取用户信息
```http
GET /api/v1/auth/profile
Authorization: Bearer <token>
```

#### 修改密码
```http
PUT /api/v1/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "Password123",
  "newPassword": "NewPassword456"
}
```

## 数据模型

### User（用户表）
- id: 用户ID
- username: 用户名
- password: 密码（加密）
- email: 邮箱
- role: 角色（student/employer/admin）
- status: 状态（active/inactive/banned）

### Job（岗位表）
- id: 岗位ID
- title: 标题
- description: 描述
- salary: 薪资
- employerId: 发布者ID
- status: 状态

### Application（申请表）
- id: 申请ID
- studentId: 学生ID
- jobId: 岗位ID
- status: 状态（pending/approved/rejected）

### Bookmark（收藏表）
- id: 收藏ID
- studentId: 学生ID
- jobId: 岗位ID

## 常用命令

```bash
# 开发模式启动
npm run dev

# 同步数据库
npm run db:sync

# 删除所有表（谨慎使用）
npm run db:drop

# 运行测试
npm test

# 查看测试覆盖率
npm run test:coverage

# 代码检查
npm run lint
```

## 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| DB_HOST | 数据库主机 | localhost |
| DB_PORT | 数据库端口 | 3306 |
| DB_NAME | 数据库名称 | campus_job_platform |
| DB_USER | 数据库用户名 | root |
| DB_PASSWORD | 数据库密码 | - |
| JWT_SECRET | JWT密钥 | - |
| JWT_EXPIRES_IN | Token过期时间 | 24h |
| PORT | 服务端口 | 3000 |
| NODE_ENV | 运行环境 | development |
| CORS_ORIGIN | CORS允许的源 | http://localhost:3000 |

## 开发说明

1. 所有路由都有版本前缀 `/api/v1`
2. API 响应格式统一为：
   ```json
   {
     "success": true,
     "message": "操作成功",
     "data": {}
   }
   ```
3. 错误响应格式：
   ```json
   {
     "success": false,
     "message": "错误信息"
   }
   ```
4. 使用 Helmet 和 CORS 增强安全性
5. 所有密码都使用 bcryptjs 加密存储