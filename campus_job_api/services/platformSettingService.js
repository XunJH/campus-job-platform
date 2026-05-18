const { PlatformSetting } = require('../models');

const DEFAULT_PLATFORM_SETTINGS = {
  jobCategories: ['技术类', '教学类', '运营类', '设计类', '市场类', '其他'],
  workLocationOptions: ['校内', '远程', '混合'],
  sensitiveWords: ['押金', '刷单', '银行卡', '代付', '内幕'],
  aiRiskThresholds: {
    verificationHighRisk: 80,
    jobHighRisk: 75,
    conversationWarningRisk: 70
  },
  featureToggles: {
    enableBatchApply: true,
    enableAiAssistant: true,
    enableAppeals: true,
    requireResumeImageBeforeApply: true,
    enableConversationReminder: true
  },
  operationRules: {
    batchApplyLimit: 100,
    reportWindowDays: 7,
    ticketResponseHours: 24
  }
};

const getOrCreatePlatformSettings = async () => {
  const [settings] = await PlatformSetting.findOrCreate({
    where: { scope: 'default' },
    defaults: {
      scope: 'default',
      ...DEFAULT_PLATFORM_SETTINGS
    }
  });

  return settings;
};

const buildPublicPlatformSettings = (settings) => ({
  jobCategories: settings.jobCategories || DEFAULT_PLATFORM_SETTINGS.jobCategories,
  workLocationOptions: settings.workLocationOptions || DEFAULT_PLATFORM_SETTINGS.workLocationOptions,
  featureToggles: {
    ...DEFAULT_PLATFORM_SETTINGS.featureToggles,
    ...(settings.featureToggles || {})
  },
  operationRules: {
    ...DEFAULT_PLATFORM_SETTINGS.operationRules,
    ...(settings.operationRules || {})
  }
});

const getPublicPlatformSettings = async () => {
  const settings = await getOrCreatePlatformSettings();
  return buildPublicPlatformSettings(settings);
};

module.exports = {
  DEFAULT_PLATFORM_SETTINGS,
  getOrCreatePlatformSettings,
  buildPublicPlatformSettings,
  getPublicPlatformSettings
};
