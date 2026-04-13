const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Application = sequelize.define('Application', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '申请记录ID'
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '申请者ID（学生ID）（外键）'
  },
  jobId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '申请的岗位ID（外键）'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'withdrawn'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '申请状态'
  },
  coverLetter: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '求职信'
  },
  resume: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '简历文件路径'
  },
  appliedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '申请时间'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '审核时间'
  },
  reviewedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '审核者ID'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注'
  }
}, {
  tableName: 'applications',
  comment: '申请记录表'
});

module.exports = Application;