const { sequelize } = require('../config/database');

async function fix() {
  try {
    await sequelize.query("ALTER TABLE jobs CHANGE auditStatus audit_status ENUM('pending', 'approved', 'rejected') COMMENT '审核状态'");
    await sequelize.query("ALTER TABLE jobs CHANGE rejectionReason rejection_reason VARCHAR(255) COMMENT '审核拒绝原因'");
    console.log('✅ 列名修复完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    process.exit(1);
  }
}

fix();
