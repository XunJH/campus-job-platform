const { sequelize } = require('../config/database');

const syncDatabase = async () => {
  try {
    console.log('开始同步数据库模型...');

    // 同步所有模型
    await sequelize.sync({ force: false, alter: true });

    console.log('数据库模型同步完成！');
    console.log('所有表都已创建/更新');

    process.exit(0);
  } catch (error) {
    console.error('数据库同步失败:', error);
    process.exit(1);
  }
};

syncDatabase();