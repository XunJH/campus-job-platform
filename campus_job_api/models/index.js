const { sequelize } = require('../config/database');
const User = require('./User');
const Job = require('./Job');
const Application = require('./Application');
const Bookmark = require('./Bookmark');

// 定义模型关联关系

// User 和 Job 的关系：一个User可以发布多个Job
User.hasMany(Job, {
  foreignKey: 'employerId',
  as: 'jobs'
});
Job.belongsTo(User, {
  foreignKey: 'employerId',
  as: 'employer'
});

// User 和 Application 的关系：一个学生可以提交多个申请
User.hasMany(Application, {
  foreignKey: 'studentId',
  as: 'applications'
});
Application.belongsTo(User, {
  foreignKey: 'studentId',
  as: 'student'
});

// User 和 Review 的关系：一个用户可以审核多个申请（雇主）
User.hasMany(Application, {
  foreignKey: 'reviewedBy',
  as: 'reviewedApplications'
});
Application.belongsTo(User, {
  foreignKey: 'reviewedBy',
  as: 'reviewer'
});

// Job 和 Application 的关系：一个岗位可以有多个申请
Job.hasMany(Application, {
  foreignKey: 'jobId',
  as: 'applications'
});
Application.belongsTo(Job, {
  foreignKey: 'jobId',
  as: 'job'
});

// User 和 Bookmark 的关系：一个学生可以收藏多个岗位
User.hasMany(Bookmark, {
  foreignKey: 'studentId',
  as: 'bookmarks'
});
Bookmark.belongsTo(User, {
  foreignKey: 'studentId',
  as: 'student'
});

// Job 和 Bookmark 的关系：一个岗位可以被多个学生收藏
Job.hasMany(Bookmark, {
  foreignKey: 'jobId',
  as: 'bookmarks'
});
Bookmark.belongsTo(Job, {
  foreignKey: 'jobId',
  as: 'job'
});

// 导出所有模型和数据库连接
module.exports = {
  sequelize,
  User,
  Job,
  Application,
  Bookmark
};