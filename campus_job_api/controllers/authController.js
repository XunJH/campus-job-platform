const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, Verification } = require('../models');
const { sanitizeText } = require('../utils/sanitize');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

const generateToken = (user) => jwt.sign(
  {
    id: user.id,
    username: user.username,
    role: user.role
  },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRES_IN }
);

const buildValidationErrorResponse = (error, res) => res.status(400).json({
  success: false,
  message: '数据验证失败',
  errors: error.errors.map(err => ({
    field: err.path,
    message: err.message
  }))
});

const isValidationError = (error) => (
  error.name === 'SequelizeValidationError' ||
  error.name === 'SequelizeUniqueConstraintError'
);

const sanitizeProfileUpdate = (payload) => {
  const updateData = {};

  if (payload.username !== undefined && payload.username.trim()) {
    updateData.username = sanitizeText(payload.username.trim());
  }

  if (payload.email !== undefined) {
    updateData.email = sanitizeText(payload.email);
  }

  if (payload.phone !== undefined) {
    updateData.phone = payload.phone;
  }

  if (payload.bio !== undefined) {
    updateData.bio = payload.bio;
  }

  if (payload.avatar !== undefined) {
    updateData.avatar = payload.avatar;
  }

  if (payload.personalityProfile !== undefined) {
    updateData.personalityProfile = payload.personalityProfile;
  }

  return updateData;
};

const AI_INTERNAL_TOKEN = process.env.AI_INTERNAL_TOKEN || 'campus-job-ai-internal';

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => (typeof item === 'string' ? sanitizeText(item).trim() : ''))
    .filter(Boolean);
};

const normalizeDimensions = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((acc, [key, score]) => {
    const normalizedKey = typeof key === 'string' ? sanitizeText(key).trim() : '';
    const normalizedScore = Number(score);

    if (!normalizedKey || Number.isNaN(normalizedScore)) {
      return acc;
    }

    acc[normalizedKey] = normalizedScore;
    return acc;
  }, {});
};

const normalizeAiPersonalityProfile = (profile, userId, completedAt) => ({
  user_id: String(userId),
  dimensions: normalizeDimensions(profile?.dimensions),
  tags: normalizeStringArray(profile?.tags),
  summary: sanitizeText(profile?.summary || ''),
  strengths: normalizeStringArray(profile?.strengths),
  weaknesses: normalizeStringArray(profile?.weaknesses),
  suitable_jobs: normalizeStringArray(profile?.suitable_jobs),
  created_at: profile?.created_at || completedAt.toISOString()
});

const buildAiProfileResponse = (profile, userId, completedAt) => {
  const normalized = normalizeAiPersonalityProfile(profile, userId, completedAt || new Date());

  return {
    user_id: normalized.user_id,
    dimensions: normalized.dimensions,
    tags: normalized.tags,
    summary: normalized.summary,
    strengths: normalized.strengths,
    weaknesses: normalized.weaknesses,
    suitable_jobs: normalized.suitable_jobs,
    created_at: normalized.created_at
  };
};

const hasUsableAiProfile = (profile) => (
  Boolean(profile) &&
  (Array.isArray(profile.tags) && profile.tags.length > 0) &&
  (Array.isArray(profile.suitable_jobs) && profile.suitable_jobs.length > 0)
);

exports.register = async (req, res) => {
  try {
    let { username, password, email, role = 'student' } = req.body;

    if (role === 'admin') {
      role = 'student';
    }

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名或邮箱已被注册，请更换后重试'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      username: sanitizeText(username),
      password: hashedPassword,
      email: sanitizeText(email),
      role,
      status: 'active'
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: user.toJSON()
      }
    });
  } catch (error) {
    console.error('注册错误:', error);

    if (isValidationError(error)) {
      return buildValidationErrorResponse(error, res);
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email: username }]
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: '账号已被禁用，请联系管理员'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    await user.update({ lastLoginAt: new Date() });
    const token = generateToken(user);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: user.toJSON()
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email: username }]
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '管理员用户名或密码错误'
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '非管理员账号，无权访问'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: '管理员账号已被禁用'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '管理员用户名或密码错误'
      });
    }

    await user.update({ lastLoginAt: new Date() });
    const token = generateToken(user);

    res.json({
      success: true,
      message: '管理员登录成功',
      data: {
        token,
        user: user.toJSON()
      }
    });
  } catch (error) {
    console.error('管理员登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = sanitizeProfileUpdate(req.body);
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findOne({ where: { email: updateData.email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '邮箱已被使用'
        });
      }
    }

    if (updateData.avatar && !/^https?:\/\//i.test(updateData.avatar)) {
      return res.status(400).json({
        success: false,
        message: '头像 URL 格式不正确'
      });
    }

    await user.update(updateData);

    if (updateData.username && user.role === 'employer') {
      await Verification.update(
        { companyName: updateData.username },
        { where: { userId } }
      );
    }

    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      message: '信息更新成功',
      data: updatedUser
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);

    if (isValidationError(error)) {
      return buildValidationErrorResponse(error, res);
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: '当前密码错误'
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码至少需要 6 个字符'
      });
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: '新密码必须包含大小写字母和数字'
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: '新密码不能与旧密码相同'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await user.update({ password: hashedPassword });

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.getPersonalityProfileStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'personalityProfileCompletedAt', 'personalityProfile']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        completed: Boolean(user.personalityProfileCompletedAt),
        completedAt: user.personalityProfileCompletedAt,
        profile: user.personalityProfile
      }
    });
  } catch (error) {
    console.error('获取人格画像状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.getInternalPersonalityProfile = async (req, res) => {
  try {
    const token = req.headers['x-ai-service-token'];

    if (!token || token !== AI_INTERNAL_TOKEN) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden'
      });
    }

    const userId = parseInt(req.params.userId, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id'
      });
    }

    const user = await User.findByPk(userId, {
      attributes: ['id', 'personalityProfileCompletedAt', 'personalityProfile']
    });

    if (!user || !hasUsableAiProfile(user.personalityProfile)) {
      return res.status(404).json({
        success: false,
        message: 'Personality profile not found'
      });
    }

    return res.json({
      success: true,
      data: {
        userId: String(user.id),
        profile: buildAiProfileResponse(
          user.personalityProfile,
          user.id,
          user.personalityProfileCompletedAt || new Date()
        )
      }
    });
  } catch (error) {
    console.error('Internal personality profile error:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.submitPersonalityProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const completedAt = new Date();
    const normalizedProfile = normalizeAiPersonalityProfile(req.body, req.user.id, completedAt);
    const mergedProfile = {
      ...(user.personalityProfile || {}),
      ...normalizedProfile
    };

    await user.update({
      personalityProfile: mergedProfile,
      personalityProfileCompletedAt: completedAt
    });

    res.json({
      success: true,
      message: '人格画像提交成功',
      data: {
        completed: true,
        completedAt,
        profile: mergedProfile
      }
    });
  } catch (error) {
    console.error('提交人格画像错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.forgotPassword = async (_req, res) => {
  res.status(503).json({
    success: false,
    message: '当前版本未开放在线找回密码，请联系管理员处理或在登录后使用修改密码功能。'
  });
};

exports.logout = async (_req, res) => {
  try {
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const adminCount = await User.count({ where: { role: 'admin' } });

    if (adminCount > 0) {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '仅管理员可创建新的管理员账号'
        });
      }
    }

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名或邮箱已存在'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = await User.create({
      username: sanitizeText(username),
      password: hashedPassword,
      email: sanitizeText(email),
      role: 'admin',
      status: 'active'
    });

    const token = generateToken(admin);

    res.status(201).json({
      success: true,
      message: adminCount === 0 ? '首个管理员账号创建成功' : '管理员账号创建成功',
      data: {
        token,
        user: admin.toJSON()
      }
    });
  } catch (error) {
    console.error('创建管理员账号错误:', error);

    if (isValidationError(error)) {
      return buildValidationErrorResponse(error, res);
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
