const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ConversationMessage = sequelize.define('ConversationMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  conversationId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  senderRole: {
    type: DataTypes.ENUM('student', 'employer', 'admin'),
    allowNull: false
  },
  messageType: {
    type: DataTypes.ENUM('text', 'resume', 'system'),
    allowNull: false,
    defaultValue: 'text'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attachmentUrl: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'conversation_messages'
});

module.exports = ConversationMessage;
