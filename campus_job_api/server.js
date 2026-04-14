const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// 数据库配置
const { sequelize, testConnection } = require('./config/database');

// 路由导入
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');

// 创建Express应用
const app = express();

// Swagger 配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '校园兼职平台 API',
      version: '1.0.0',
      description: '校园智能兼职服务平台后端 API 文档'
    },
    servers: [
      {
        url: 'http://localhost:3001/api/v1',
        description: '本地开发服务器'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/*.js', './controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS配置
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:4200'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));

// 解析URL编码的请求体
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 压缩响应
app.use(compression());

// 请求日志
app.use(morgan('combined', {
  skip: (req, res) => process.env.NODE_ENV === 'test'
}));

// 健康检查路由
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API路由版本前缀
const apiVersion = 'v1';
const apiPrefix = `/api/${apiVersion}`;

// Swagger 文档路由
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 注册路由
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/jobs`, jobRoutes);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `路由 ${req.originalUrl} 不存在`
  });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // 模型验证错误
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors: err.errors ? err.errors.map(e => ({
        field: e.path,
        message: e.message
      })) : []
    });
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '无效的认证令牌'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '认证令牌已过期'
    });
  }

  // Sequelize错误
  if (err.name.includes('Sequelize')) {
    return res.status(500).json({
      success: false,
      message: '数据库操作错误',
      error: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
    });
  }

  // 其他错误
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { error: err.stack })
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // 测试数据库连接
    await testConnection();

    // 同步数据库模型（仅开发环境）
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ force: false, alter: true });
      console.log('数据库模型同步完成');
    }

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`🚀 服务器启动成功！`);
      console.log(`📡 服务地址: http://localhost:${PORT}`);
      console.log(`📖 API文档: http://localhost:${PORT}/api-docs`);
      console.log(`💚 健康检查: http://localhost:${PORT}/health`);
      console.log(`⚙️ 环境配置: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 数据库: ${process.env.DB_NAME || 'campus_job_platform'}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('接收到SIGTERM信号，准备关闭服务器...');
  sequelize.close().then(() => {
    console.log('数据库连接已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('接收到SIGINT信号，准备关闭服务器...');
  sequelize.close().then(() => {
    console.log('数据库连接已关闭');
    process.exit(0);
  });
});

// 启动服务器
startServer();

module.exports = app;
