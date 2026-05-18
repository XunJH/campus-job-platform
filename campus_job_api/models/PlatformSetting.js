const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PlatformSetting = sequelize.define('PlatformSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  scope: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true,
    defaultValue: 'default'
  },
  jobCategories: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    field: 'job_categories'
  },
  workLocationOptions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    field: 'work_location_options'
  },
  sensitiveWords: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    field: 'sensitive_words'
  },
  aiRiskThresholds: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
    field: 'ai_risk_thresholds'
  },
  featureToggles: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
    field: 'feature_toggles'
  },
  operationRules: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
    field: 'operation_rules'
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'updated_by'
  }
}, {
  tableName: 'platform_settings',
  indexes: [
    { unique: true, fields: ['scope'] },
    { fields: ['updated_by'] }
  ]
});

module.exports = PlatformSetting;
