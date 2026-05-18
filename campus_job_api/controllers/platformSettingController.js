const { createAdminOperationLog } = require('../services/adminActivityService');
const {
  DEFAULT_PLATFORM_SETTINGS,
  buildPublicPlatformSettings,
  getOrCreatePlatformSettings
} = require('../services/platformSettingService');

const normalizeStringArray = (value, fallback) => {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[\n,，]/)
    : fallback;

  return [...new Set(
    source
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
  )];
};

const normalizeNumber = (value, fallback, min = 0, max = 1000) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
};

const normalizeBooleanMap = (value, fallback) => {
  const result = { ...fallback };

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return result;
  }

  Object.keys(result).forEach((key) => {
    if (typeof value[key] === 'boolean') {
      result[key] = value[key];
    }
  });

  return result;
};

const normalizeObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const buildSettingsPayload = (input = {}) => {
  const thresholds = normalizeObject(input.aiRiskThresholds);
  const operationRules = normalizeObject(input.operationRules);

  return {
    jobCategories: normalizeStringArray(input.jobCategories, DEFAULT_PLATFORM_SETTINGS.jobCategories),
    workLocationOptions: normalizeStringArray(input.workLocationOptions, DEFAULT_PLATFORM_SETTINGS.workLocationOptions),
    sensitiveWords: normalizeStringArray(input.sensitiveWords, DEFAULT_PLATFORM_SETTINGS.sensitiveWords),
    aiRiskThresholds: {
      verificationHighRisk: normalizeNumber(
        thresholds.verificationHighRisk,
        DEFAULT_PLATFORM_SETTINGS.aiRiskThresholds.verificationHighRisk,
        0,
        100
      ),
      jobHighRisk: normalizeNumber(
        thresholds.jobHighRisk,
        DEFAULT_PLATFORM_SETTINGS.aiRiskThresholds.jobHighRisk,
        0,
        100
      ),
      conversationWarningRisk: normalizeNumber(
        thresholds.conversationWarningRisk,
        DEFAULT_PLATFORM_SETTINGS.aiRiskThresholds.conversationWarningRisk,
        0,
        100
      )
    },
    featureToggles: normalizeBooleanMap(input.featureToggles, DEFAULT_PLATFORM_SETTINGS.featureToggles),
    operationRules: {
      batchApplyLimit: normalizeNumber(operationRules.batchApplyLimit, DEFAULT_PLATFORM_SETTINGS.operationRules.batchApplyLimit, 1, 500),
      reportWindowDays: normalizeNumber(operationRules.reportWindowDays, DEFAULT_PLATFORM_SETTINGS.operationRules.reportWindowDays, 1, 90),
      ticketResponseHours: normalizeNumber(operationRules.ticketResponseHours, DEFAULT_PLATFORM_SETTINGS.operationRules.ticketResponseHours, 1, 168)
    }
  };
};

exports.getPlatformSettings = async (_req, res) => {
  try {
    const settings = await getOrCreatePlatformSettings();

    return res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get platform settings error:', error);
    return res.status(500).json({
      success: false,
      message: '获取平台配置失败'
    });
  }
};

exports.getPublicPlatformSettings = async (_req, res) => {
  try {
    const settings = await getOrCreatePlatformSettings();

    return res.json({
      success: true,
      data: buildPublicPlatformSettings(settings)
    });
  } catch (error) {
    console.error('Get public platform settings error:', error);
    return res.status(500).json({
      success: false,
      message: '获取平台公共配置失败'
    });
  }
};

exports.updatePlatformSettings = async (req, res) => {
  try {
    const settings = await getOrCreatePlatformSettings();
    const payload = buildSettingsPayload(req.body || {});

    await settings.update({
      ...payload,
      updatedBy: req.user.id
    });

    await createAdminOperationLog({
      adminId: req.user.id,
      actionType: 'platform_settings_update',
      targetType: 'platform_setting',
      targetId: settings.id,
      summary: '更新平台配置中心设置',
      detail: '管理员更新了岗位标签、风控阈值、功能开关和运营规则。',
      metadata: payload,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.json({
      success: true,
      message: '平台配置已保存',
      data: settings
    });
  } catch (error) {
    console.error('Update platform settings error:', error);
    return res.status(500).json({
      success: false,
      message: '保存平台配置失败'
    });
  }
};
