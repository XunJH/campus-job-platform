const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemNotification = sequelize.define('SystemNotification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(160),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('system', 'audit_result', 'ticket_update', 'settlement', 'announcement'),
    allowNull: false,
    defaultValue: 'system'
  },
  targetRole: {
    type: DataTypes.ENUM('all', 'student', 'employer', 'admin'),
    allowNull: false,
    defaultValue: 'all',
    field: 'target_role'
  },
  targetUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'target_user_id'
  },
  senderAdminId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'sender_admin_id'
  },
  relatedTicketId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'related_ticket_id'
  },
  relatedJobId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'related_job_id'
  },
  relatedVerificationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'related_verification_id'
  },
  relatedSettlementId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'related_settlement_id'
  },
  relatedUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'related_user_id'
  },
  actionUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'action_url'
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_pinned'
  }
}, {
  tableName: 'system_notifications',
  indexes: [
    { fields: ['target_role', 'created_at'] },
    { fields: ['target_user_id', 'created_at'] },
    { fields: ['type', 'created_at'] }
  ]
});

module.exports = SystemNotification;
