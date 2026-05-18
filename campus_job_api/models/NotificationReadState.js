const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NotificationReadState = sequelize.define('NotificationReadState', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  notificationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'notification_id'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'read_at'
  }
}, {
  tableName: 'notification_read_states',
  indexes: [
    {
      unique: true,
      fields: ['notification_id', 'user_id']
    },
    {
      fields: ['user_id', 'read_at']
    }
  ]
});

module.exports = NotificationReadState;
