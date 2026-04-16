const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '用户ID'
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '用户名'
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '密码（加密存储）'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: {
        msg: '请输入有效的邮箱地址'
      }
    },
    comment: '邮箱'
  },
  role: {
    type: DataTypes.ENUM('student', 'employer', 'admin'),
    allowNull: false,
    defaultValue: 'student',
    comment: '用户角色'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'banned'),
    allowNull: false,
    defaultValue: 'active',
    comment: '用户状态'
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '头像URL'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: '手机号'
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '个人简介'
  },
  creditScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    comment: '信用评分'
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后登录时间'
  }
}, {
  tableName: 'users',
  comment: '用户表'
});

// 添加实例方法
User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  // 删除敏感字段
  delete values.password;
  return values;
};

module.exports = User;