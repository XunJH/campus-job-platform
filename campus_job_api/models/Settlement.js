const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Settlement = sequelize.define('Settlement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '结算记录ID'
  },
  applicationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    comment: '关联申请记录ID'
  },
  jobId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联岗位ID'
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '学生ID'
  },
  employerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '企业ID'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: '结算金额'
  },
  salaryType: {
    type: DataTypes.ENUM('hourly', 'daily', 'weekly', 'monthly'),
    allowNull: false,
    defaultValue: 'monthly',
    comment: '薪资类型'
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'disputed'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '结算状态'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '结算备注'
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '完成结算时间'
  },
  paidBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '操作结算的用户ID'
  }
}, {
  tableName: 'settlements',
  comment: '薪酬结算记录表'
});

module.exports = Settlement;
