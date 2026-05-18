const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const { DataTypes } = require('sequelize');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const adminOperationLogRoutes = require('./routes/adminOperationLogRoutes');
const adminReportRoutes = require('./routes/adminReportRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const jobRoutes = require('./routes/jobRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const platformSettingRoutes = require('./routes/platformSettingRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const userRoutes = require('./routes/userRoutes');
const verificationRoutes = require('./routes/verificationRoutes');

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const apiVersion = 'v1';
const apiPrefix = `/api/${apiVersion}`;
let server;

const splitCsv = (value) => value
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? splitCsv(process.env.ALLOWED_ORIGINS)
  : [
      'http://localhost:3000',
      'http://localhost:4200',
      'http://localhost:4201',
      'http://localhost:4202',
      'http://localhost:4204'
    ];

const publicServerOrigin = (
  process.env.PUBLIC_SERVER_ORIGIN ||
  `http://localhost:${PORT}`
).replace(/\/+$/, '');
const publicApiBaseUrl = `${publicServerOrigin}${apiPrefix}`;

const ensureApplicationWorkflowColumns = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable('applications');

  if (!columns.application_stage) {
    await queryInterface.addColumn('applications', 'application_stage', {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'new'
    });
  }

  if (!columns.stage_updated_at) {
    await queryInterface.addColumn('applications', 'stage_updated_at', {
      type: DataTypes.DATE,
      allowNull: true
    });
  }

  await sequelize.query(`
    UPDATE applications
    SET
      application_stage = COALESCE(application_stage, 'new'),
      stage_updated_at = COALESCE(stage_updated_at, applied_at, updated_at, NOW())
  `);
};

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: '校园招聘平台 API',
      version: '1.0.0',
      description: '校园智能招聘平台后端 API 文档'
    },
    servers: [
      {
        url: publicApiBaseUrl,
        description: '当前 API 服务地址'
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
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(compression());
app.use(morgan('combined', {
  skip: () => process.env.NODE_ENV === 'test'
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: '校园招聘平台 API 服务',
    version: '1.0.0',
    docs: `${publicServerOrigin}/api-docs`,
    health: `${publicServerOrigin}/health`,
    api: publicApiBaseUrl
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/admin-operation-logs`, adminOperationLogRoutes);
app.use(`${apiPrefix}/admin-reports`, adminReportRoutes);
app.use(`${apiPrefix}/conversations`, conversationRoutes);
app.use(`${apiPrefix}/jobs`, jobRoutes);
app.use(`${apiPrefix}/notifications`, notificationRoutes);
app.use(`${apiPrefix}/platform-settings`, platformSettingRoutes);
app.use(`${apiPrefix}/tickets`, ticketRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/verification`, verificationRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `路由 ${req.originalUrl} 不存在`
  });
});

app.use((err, _req, res, _next) => {
  console.error('Error:', err);

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: '数据校验失败',
      errors: err.errors ? err.errors.map((item) => ({
        field: item.path,
        message: item.message
      })) : []
    });
  }

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

  if (typeof err.name === 'string' && err.name.includes('Sequelize')) {
    return res.status(500).json({
      success: false,
      message: '数据库操作错误',
      error: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { error: err.stack })
  });
});

const startServer = async () => {
  try {
    await testConnection();

    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ force: false, alter: false });
      console.log('数据库模型同步完成');
    }

    await ensureApplicationWorkflowColumns();

    server = app.listen(PORT, () => {
      console.log('服务启动成功');
      console.log(`服务地址: ${publicServerOrigin}`);
      console.log(`API 文档: ${publicServerOrigin}/api-docs`);
      console.log(`健康检查: ${publicServerOrigin}/health`);
      console.log(`环境配置: ${process.env.NODE_ENV || 'development'}`);
      console.log(`数据库: ${process.env.DB_NAME || 'campus_job_platform'}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

const closeServer = (signal) => {
  console.log(`接收到 ${signal} 信号，准备关闭服务...`);

  const closeDatabase = () => sequelize.close().then(() => {
    console.log('数据库连接已关闭');
    process.exit(0);
  });

  if (server) {
    server.close(() => {
      closeDatabase();
    });
    return;
  }

  closeDatabase();
};

process.on('SIGTERM', () => closeServer('SIGTERM'));
process.on('SIGINT', () => closeServer('SIGINT'));

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
