const { sequelize } = require('../config/database');

async function addColumns() {
  const queryInterface = sequelize.getQueryInterface();

  // Verifications 表添加 aiAuditResult (JSON)
  try {
    await queryInterface.addColumn('Verifications', 'ai_audit_result', {
      type: require('sequelize').DataTypes.JSON,
      allowNull: true,
      comment: 'AI预审结果'
    });
    console.log('Added ai_audit_result to Verifications');
  } catch (e) {
    if (e.message.includes('Duplicate')) {
      console.log('ai_audit_result already exists');
    } else {
      console.error('Error adding ai_audit_result:', e.message);
    }
  }

  // jobs 表添加 fraud_check_result (JSON)
  try {
    await queryInterface.addColumn('jobs', 'fraud_check_result', {
      type: require('sequelize').DataTypes.JSON,
      allowNull: true,
      comment: 'AI虚假岗位检测结果'
    });
    console.log('Added fraud_check_result to jobs');
  } catch (e) {
    if (e.message.includes('Duplicate')) {
      console.log('fraud_check_result already exists');
    } else {
      console.error('Error adding fraud_check_result:', e.message);
    }
  }

  await sequelize.close();
  console.log('Done');
}

addColumns();
