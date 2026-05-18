const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const User = require('./User');
const Job = require('./Job');
const Application = require('./Application');
const Bookmark = require('./Bookmark');
const Conversation = require('./Conversation');
const ConversationMessage = require('./ConversationMessage');
const ConversationParticipantState = require('./ConversationParticipantState');
const Settlement = require('./Settlement');
const Ticket = require('./Ticket');
const AdminOperationLog = require('./AdminOperationLog');
const SystemNotification = require('./SystemNotification');
const NotificationReadState = require('./NotificationReadState');
const PlatformSetting = require('./PlatformSetting');
const Verification = require('./Verification')(sequelize, DataTypes);

User.hasMany(Job, {
  foreignKey: 'employerId',
  as: 'jobs'
});
Job.belongsTo(User, {
  foreignKey: 'employerId',
  as: 'employer'
});

User.hasMany(Application, {
  foreignKey: 'studentId',
  as: 'applications'
});
Application.belongsTo(User, {
  foreignKey: 'studentId',
  as: 'student'
});

User.hasMany(Application, {
  foreignKey: 'reviewedBy',
  as: 'reviewedApplications'
});
Application.belongsTo(User, {
  foreignKey: 'reviewedBy',
  as: 'reviewer'
});

Job.hasMany(Application, {
  foreignKey: 'jobId',
  as: 'applications'
});
Application.belongsTo(Job, {
  foreignKey: 'jobId',
  as: 'job'
});

Application.hasOne(Conversation, {
  foreignKey: 'applicationId',
  as: 'conversation'
});
Conversation.belongsTo(Application, {
  foreignKey: 'applicationId',
  as: 'application'
});

Job.hasMany(Conversation, {
  foreignKey: 'jobId',
  as: 'conversations'
});
Conversation.belongsTo(Job, {
  foreignKey: 'jobId',
  as: 'job'
});

User.hasMany(Conversation, {
  foreignKey: 'studentId',
  as: 'studentConversations'
});
Conversation.belongsTo(User, {
  foreignKey: 'studentId',
  as: 'student'
});

User.hasMany(Conversation, {
  foreignKey: 'employerId',
  as: 'employerConversations'
});
Conversation.belongsTo(User, {
  foreignKey: 'employerId',
  as: 'employer'
});

Conversation.hasMany(ConversationMessage, {
  foreignKey: 'conversationId',
  as: 'messages'
});
ConversationMessage.belongsTo(Conversation, {
  foreignKey: 'conversationId',
  as: 'conversation'
});

User.hasMany(ConversationMessage, {
  foreignKey: 'senderId',
  as: 'sentConversationMessages'
});
ConversationMessage.belongsTo(User, {
  foreignKey: 'senderId',
  as: 'sender'
});

Conversation.hasMany(ConversationParticipantState, {
  foreignKey: 'conversationId',
  as: 'participantStates'
});
ConversationParticipantState.belongsTo(Conversation, {
  foreignKey: 'conversationId',
  as: 'conversation'
});

User.hasMany(ConversationParticipantState, {
  foreignKey: 'userId',
  as: 'conversationStates'
});
ConversationParticipantState.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(Bookmark, {
  foreignKey: 'studentId',
  as: 'bookmarks'
});
Bookmark.belongsTo(User, {
  foreignKey: 'studentId',
  as: 'student'
});

Job.hasMany(Bookmark, {
  foreignKey: 'jobId',
  as: 'bookmarks'
});
Bookmark.belongsTo(Job, {
  foreignKey: 'jobId',
  as: 'job'
});

Application.hasOne(Settlement, {
  foreignKey: 'applicationId',
  as: 'settlement'
});
Settlement.belongsTo(Application, {
  foreignKey: 'applicationId',
  as: 'application'
});

Job.hasMany(Settlement, {
  foreignKey: 'jobId',
  as: 'settlements'
});
Settlement.belongsTo(Job, {
  foreignKey: 'jobId',
  as: 'job'
});

User.hasMany(Settlement, {
  foreignKey: 'studentId',
  as: 'studentSettlements'
});
Settlement.belongsTo(User, {
  foreignKey: 'studentId',
  as: 'student'
});

User.hasMany(Settlement, {
  foreignKey: 'employerId',
  as: 'employerSettlements'
});
Settlement.belongsTo(User, {
  foreignKey: 'employerId',
  as: 'employer'
});

User.hasMany(Settlement, {
  foreignKey: 'paidBy',
  as: 'processedSettlements'
});
Settlement.belongsTo(User, {
  foreignKey: 'paidBy',
  as: 'processor'
});

User.hasMany(Ticket, {
  foreignKey: 'userId',
  as: 'submittedTickets'
});
Ticket.belongsTo(User, {
  foreignKey: 'userId',
  as: 'submitter'
});

User.hasMany(Ticket, {
  foreignKey: 'assigneeId',
  as: 'assignedTickets'
});
Ticket.belongsTo(User, {
  foreignKey: 'assigneeId',
  as: 'assignee'
});

Job.hasMany(Ticket, {
  foreignKey: 'relatedJobId',
  as: 'tickets'
});
Ticket.belongsTo(Job, {
  foreignKey: 'relatedJobId',
  as: 'relatedJob'
});

Settlement.hasMany(Ticket, {
  foreignKey: 'relatedSettlementId',
  as: 'tickets'
});
Ticket.belongsTo(Settlement, {
  foreignKey: 'relatedSettlementId',
  as: 'relatedSettlement'
});

Verification.hasMany(Ticket, {
  foreignKey: 'relatedVerificationId',
  as: 'tickets'
});
Ticket.belongsTo(Verification, {
  foreignKey: 'relatedVerificationId',
  as: 'relatedVerification'
});

User.hasOne(Verification, {
  foreignKey: 'userId',
  as: 'verification'
});
Verification.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(AdminOperationLog, {
  foreignKey: 'adminId',
  as: 'adminLogs'
});
AdminOperationLog.belongsTo(User, {
  foreignKey: 'adminId',
  as: 'admin'
});

User.hasMany(SystemNotification, {
  foreignKey: 'senderAdminId',
  as: 'sentNotifications'
});
SystemNotification.belongsTo(User, {
  foreignKey: 'senderAdminId',
  as: 'senderAdmin'
});

User.hasMany(SystemNotification, {
  foreignKey: 'targetUserId',
  as: 'targetedNotifications'
});
SystemNotification.belongsTo(User, {
  foreignKey: 'targetUserId',
  as: 'targetUser'
});

User.hasMany(SystemNotification, {
  foreignKey: 'relatedUserId',
  as: 'relatedNotifications'
});
SystemNotification.belongsTo(User, {
  foreignKey: 'relatedUserId',
  as: 'relatedUser'
});

SystemNotification.hasMany(NotificationReadState, {
  foreignKey: 'notificationId',
  as: 'readStates'
});
NotificationReadState.belongsTo(SystemNotification, {
  foreignKey: 'notificationId',
  as: 'notification'
});

User.hasMany(NotificationReadState, {
  foreignKey: 'userId',
  as: 'notificationReadStates'
});
NotificationReadState.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(PlatformSetting, {
  foreignKey: 'updatedBy',
  as: 'updatedPlatformSettings'
});
PlatformSetting.belongsTo(User, {
  foreignKey: 'updatedBy',
  as: 'updatedByUser'
});

Ticket.hasMany(SystemNotification, {
  foreignKey: 'relatedTicketId',
  as: 'notifications'
});
SystemNotification.belongsTo(Ticket, {
  foreignKey: 'relatedTicketId',
  as: 'relatedTicket'
});

Job.hasMany(SystemNotification, {
  foreignKey: 'relatedJobId',
  as: 'notifications'
});
SystemNotification.belongsTo(Job, {
  foreignKey: 'relatedJobId',
  as: 'relatedJob'
});

Verification.hasMany(SystemNotification, {
  foreignKey: 'relatedVerificationId',
  as: 'notifications'
});
SystemNotification.belongsTo(Verification, {
  foreignKey: 'relatedVerificationId',
  as: 'relatedVerification'
});

Settlement.hasMany(SystemNotification, {
  foreignKey: 'relatedSettlementId',
  as: 'notifications'
});
SystemNotification.belongsTo(Settlement, {
  foreignKey: 'relatedSettlementId',
  as: 'relatedSettlement'
});

module.exports = {
  sequelize,
  User,
  Job,
  Application,
  Bookmark,
  Conversation,
  ConversationMessage,
  ConversationParticipantState,
  Settlement,
  Ticket,
  AdminOperationLog,
  SystemNotification,
  NotificationReadState,
  PlatformSetting,
  Verification
};
