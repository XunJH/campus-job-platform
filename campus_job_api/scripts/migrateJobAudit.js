const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();
  try {
    // 添加 auditStatus 列（先允许 null，避免旧数据冲突）
    await queryInterface.addColumn('jobs', 'auditStatus', {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: true,
      comment: '审核状态'
    });

    // 添加 rejectionReason 列
    await queryInterface.addColumn('jobs', 'rejectionReason', {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '审核拒绝原因'
    });

    // 将已有岗位的审核状态设为已通过（避免旧数据无法展示）
    await sequelize.query("UPDATE jobs SET auditStatus = 'approved' WHERE auditStatus IS NULL");

    console.log('✅ 岗位审核字段迁移完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  }
}

migrate();
