const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '岗位ID'
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '岗位标题'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '岗位描述'
  },
  requirements: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '岗位要求'
  },
  salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: '薪资（元/月）'
  },
  salaryType: {
    type: DataTypes.ENUM('hourly', 'daily', 'weekly', 'monthly'),
    allowNull: false,
    defaultValue: 'monthly',
    comment: '薪资类型'
  },
  location: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '工作地点'
  },
  jobType: {
    type: DataTypes.ENUM('part_time', 'full_time', 'internship', 'temporary'),
    allowNull: false,
    comment: '工作类型'
  },
  workingHours: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '工作时间'
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '申请截止时间'
  },
  employerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '发布者ID（外键）'
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'closed', 'cancelled'),
    allowNull: false,
    defaultValue: 'draft',
    comment: '岗位状态'
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '浏览次数'
  },
  applicationsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '申请人数'
  }
}, {
  tableName: 'jobs',
  comment: '岗位表'
});

module.exports = Job;