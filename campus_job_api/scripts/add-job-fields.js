const { sequelize } = require('../config/database');

(async () => {
  try {
    const queryInterface = sequelize.getQueryInterface();

    // 添加 work_location 字段
    const columns = await queryInterface.describeTable('jobs');

    if (!columns.work_location) {
      await queryInterface.addColumn('jobs', 'work_location', {
        type: require('sequelize').DataTypes.ENUM('on_campus', 'remote', 'hybrid'),
        allowNull: true,
        defaultValue: 'on_campus',
        after: 'location'
      });
      console.log('✅ 已添加 work_location 字段');
    } else {
      console.log('⚠️ work_location 字段已存在');
    }

    if (!columns.category) {
      await queryInterface.addColumn('jobs', 'category', {
        type: require('sequelize').DataTypes.ENUM('技术类', '教学类', '配送类', '营销类', '其他'),
        allowNull: true,
        defaultValue: '其他',
        after: 'work_location'
      });
      console.log('✅ 已添加 category 字段');
    } else {
      console.log('⚠️ category 字段已存在');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 添加字段失败:', error.message);
    process.exit(1);
  }
})();
