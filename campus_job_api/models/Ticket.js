const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '工单 ID'
  },
  title: {
    type: DataTypes.STRING(150),
    allowNull: false,
    comment: '工单标题'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '工单描述'
  },
  type: {
    type: DataTypes.ENUM(
      'verification_appeal',
      'job_appeal',
      'settlement_dispute',
      'complaint_report',
      'manual_review'
    ),
    allowNull: false,
    defaultValue: 'manual_review',
    comment: '工单类型'
  },
  sourceRole: {
    type: DataTypes.ENUM('student', 'employer', 'admin', 'system'),
    allowNull: false,
    defaultValue: 'system',
    field: 'source_role',
    comment: '提交角色'
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'rejected'),
    allowNull: false,
    defaultValue: 'open',
    comment: '工单状态'
  },
  priority: {
    type: DataTypes.ENUM('high', 'medium', 'low'),
    allowNull: false,
    defaultValue: 'medium',
    comment: '优先级'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id',
    comment: '提交人 ID'
  },
  assigneeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'assignee_id',
    comment: '处理管理员 ID'
  },
  relatedVerificationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'related_verification_id',
    comment: '关联认证记录 ID'
  },
  relatedJobId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'related_job_id',
    comment: '关联岗位 ID'
  },
  relatedSettlementId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'related_settlement_id',
    comment: '关联结算记录 ID'
  },
  resolutionNote: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'resolution_note',
    comment: '处理说明'
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'resolved_at',
    comment: '处理完成时间'
  }
}, {
  tableName: 'tickets',
  comment: '申诉工单表',
  indexes: [
    {
      fields: ['status', 'priority', 'type']
    },
    {
      fields: ['type', 'related_settlement_id']
    }
  ]
});

module.exports = Ticket;
