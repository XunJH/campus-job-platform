const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ConversationParticipantState = sequelize.define('ConversationParticipantState', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  conversationId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('student', 'employer'),
    allowNull: false
  },
  unreadCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  lastReadAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'conversation_participant_states',
  indexes: [
    {
      unique: true,
      fields: ['conversation_id', 'user_id']
    }
  ]
});

module.exports = ConversationParticipantState;
