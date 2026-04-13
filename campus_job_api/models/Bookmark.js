const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Bookmark = sequelize.define('Bookmark', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '收藏记录ID'
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '收藏者ID（学生ID）（外键）'
  },
  jobId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '收藏的岗位ID（外键）'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '收藏时间'
  }
}, {
  tableName: 'bookmarks',
  comment: '收藏记录表',
  // 联合主键，确保同一学生不能重复收藏同一岗位
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'job_id']
    }
  ]
});

module.exports = Bookmark;