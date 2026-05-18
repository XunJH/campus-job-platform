const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AdminOperationLog = sequelize.define('AdminOperationLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'admin_id'
  },
  actionType: {
    type: DataTypes.STRING(64),
    allowNull: false,
    field: 'action_type'
  },
  targetType: {
    type: DataTypes.STRING(64),
    allowNull: false,
    field: 'target_type'
  },
  targetId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'target_id'
  },
  summary: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  detail: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'user_agent'
  }
}, {
  tableName: 'admin_operation_logs',
  indexes: [
    { fields: ['admin_id', 'created_at'] },
    { fields: ['action_type', 'created_at'] },
    { fields: ['target_type', 'target_id'] }
  ]
});

module.exports = AdminOperationLog;
