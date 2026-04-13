const { Sequelize } = require('sequelize');
require('dotenv').config();

// 从环境变量中获取数据库配置
const sequelize = new Sequelize(
  process.env.DB_NAME || 'campus_job_platform',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'l13930084448',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,              // 自动添加 createdAt 和 updatedAt 字段
      underscored: true,            // 使用下划线命名风格
      freezeTableName: true,         // 不自动复数表名
    }
  }
);

// 测试数据库连接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功！');
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  testConnection
};