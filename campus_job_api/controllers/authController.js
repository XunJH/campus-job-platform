const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs/promises');
const { Op } = require('sequelize');
const path = require('path');
const {
  User,
  Verification,
  Application,
  Conversation
} = require('../models');
const { sanitizeText } = require('../utils/sanitize');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const AVATAR_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
const RESUME_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'resumes');
const IMAGE_DATA_URL_PATTERN = /^data:(image\/(png|jpeg|jpg|webp));base64,([a-z0-9+/=]+)$/i;
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const RESUME_MAX_BYTES = 4 * 1024 * 1024;
const AVATAR_DATA_URL_PATTERN = IMAGE_DATA_URL_PATTERN;

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

const getPublicServerOrigin = (req) => (
  process.env.PUBLIC_SERVER_ORIGIN ||
  `${req.protocol}://localhost:${process.env.PORT || 3001}`
).replace(/\/+$/, '');

const extractStoredAvatarPath = (avatarUrl) => {
  if (!avatarUrl || typeof avatarUrl !== 'string') {
    return null;
  }

  try {
    const pathname = avatarUrl.startsWith('/uploads/')
      ? avatarUrl
      : new URL(avatarUrl).pathname;

    if (!pathname.startsWith('/uploads/avatars/')) {
      return null;
    }

    const avatarRoot = path.resolve(AVATAR_UPLOAD_DIR);
    const filePath = path.resolve(path.join(__dirname, '..', pathname.replace(/^\/+/, '')));

    if (!filePath.startsWith(avatarRoot)) {
      return null;
    }

    return filePath;
  } catch (_error) {
    return null;
  }
};

const removeStoredAvatar = async (avatarUrl) => {
  const filePath = extractStoredAvatarPath(avatarUrl);
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('删除旧头像文件失败:', error);
    }
  }
};

const saveAvatarUpload = async (avatarUpload, userId, req) => {
  if (typeof avatarUpload !== 'string' || !avatarUpload.trim()) {
    return null;
  }

  const matches = avatarUpload.match(AVATAR_DATA_URL_PATTERN);
  if (!matches) {
    const error = new Error('头像文件仅支持 PNG、JPG、JPEG、WEBP 格式');
    error.statusCode = 400;
    throw error;
  }

  const mimeType = matches[1].toLowerCase();
  const base64Payload = matches[3];
  const buffer = Buffer.from(base64Payload, 'base64');

  if (!buffer.length) {
    const error = new Error('头像文件内容无效');
    error.statusCode = 400;
    throw error;
  }

  if (buffer.length > AVATAR_MAX_BYTES) {
    const error = new Error('头像文件不能超过 2MB');
    error.statusCode = 400;
    throw error;
  }

  const extension = mimeType === 'image/jpeg' || mimeType === 'image/jpg'
    ? 'jpg'
    : mimeType.split('/')[1];
  const filename = `user-${userId}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;

  await fs.mkdir(AVATAR_UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(AVATAR_UPLOAD_DIR, filename), buffer);

  return `${getPublicServerOrigin(req)}/uploads/avatars/${filename}`;
};

const saveResumeUpload = async (resumeUpload, userId, req) => {
  if (typeof resumeUpload !== 'string' || !resumeUpload.trim()) {
    return null;
  }

  const matches = resumeUpload.match(IMAGE_DATA_URL_PATTERN);
  if (!matches) {
    const error = new Error('简历图片仅支持 PNG、JPG、JPEG、WEBP 格式');
    error.statusCode = 400;
    throw error;
  }

  const mimeType = matches[1].toLowerCase();
  const base64Payload = matches[3];
  const buffer = Buffer.from(base64Payload, 'base64');

  if (!buffer.length) {
    const error = new Error('简历图片内容无效');
    error.statusCode = 400;
    throw error;
  }

  if (buffer.length > RESUME_MAX_BYTES) {
    const error = new Error('简历图片不能超过 4MB');
    error.statusCode = 400;
    throw error;
  }

  const extension = mimeType === 'image/jpeg' || mimeType === 'image/jpg'
    ? 'jpg'
    : mimeType.split('/')[1];
  const filename = `resume-${userId}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;

  await fs.mkdir(RESUME_UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(RESUME_UPLOAD_DIR, filename), buffer);

  return `${getPublicServerOrigin(req)}/uploads/resumes/${filename}`;
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
  technical_skills: normalizeStringArray(profile?.technical_skills || profile?.technicalSkills),
  tools: normalizeStringArray(profile?.tools),
  major: pickProfileText(profile, ['major', 'educationMajor', 'schoolMajor', 'specialty']),
  grade: pickProfileText(profile, ['grade', 'educationGrade', 'schoolGrade', 'year']),
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
    technical_skills: normalized.technical_skills,
    tools: normalized.tools,
    major: normalized.major,
    grade: normalized.grade,
    created_at: normalized.created_at
  };
};

const hasUsableAiProfile = (profile) => (
  Boolean(profile) &&
  (Array.isArray(profile.tags) && profile.tags.length > 0) &&
  (Array.isArray(profile.suitable_jobs) && profile.suitable_jobs.length > 0)
);

const pickProfileText = (profile, keys) => {
  for (const key of keys) {
    const value = profile?.[key];
    if (typeof value === 'string' && value.trim()) {
      return sanitizeText(value.trim());
    }
  }

  return '';
};

const getStagePriority = (stage, status) => {
  if (status === 'approved') return 100;
  if (stage === 'interview_confirmed') return 95;
  if (stage === 'interview_shortlist') return 75;
  if (stage === 'screening') return 55;
  if (stage === 'new') return 35;
  if (stage === 'archived') return 5;
  return 0;
};

const getRecruitmentAction = (application, conversation) => {
  if (!application) {
    if (conversation?.lastMessageAt) {
      return '建议查看历史沟通并决定是否转入正式筛选';
    }
    return '建议发起沟通并确认核心要求';
  }

  if (application.status === 'withdrawn') {
    return '学生已撤回申请，暂不继续推进';
  }

  if (application.status === 'rejected' || application.applicationStage === 'rejected_pool') {
    return '该候选人已淘汰，无需重复推进';
  }

  if (application.status === 'approved' || application.applicationStage === 'interview_confirmed') {
    return '已确认面试，建议直接进入沟通与安排环节';
  }

  if (application.applicationStage === 'interview_shortlist') {
    return '建议优先安排面试并确认时间';
  }

  if (application.applicationStage === 'screening') {
    return '建议先完成初筛沟通，再决定是否进入面试';
  }

  return '建议尽快查看申请并进入筛选流程';
};

const buildRecruitmentContext = (application, conversation) => {
  const stage = application?.applicationStage || null;
  const status = application?.status || null;
  const blocked = status === 'withdrawn' || status === 'rejected' || stage === 'rejected_pool' || stage === 'archived';

  return {
    application_id: application?.id || null,
    application_status: status,
    application_stage: stage,
    applied_at: application?.appliedAt || null,
    stage_updated_at: application?.stageUpdatedAt || null,
    has_conversation: Boolean(conversation),
    conversation_status: conversation?.status || null,
    last_message_at: conversation?.lastMessageAt || null,
    in_pipeline: Boolean(application) && !blocked,
    pipeline_priority: getStagePriority(stage, status),
    next_action: getRecruitmentAction(application, conversation)
  };
};

const buildInternalCandidateProfile = (user, recruitmentContext = null) => {
  const completedAt = user.personalityProfileCompletedAt || new Date();
  const normalizedProfile = normalizeAiPersonalityProfile(user.personalityProfile || {}, user.id, completedAt);
  const resumeImage = typeof user.personalityProfile?.resumeImage === 'string'
    ? user.personalityProfile.resumeImage
    : '';

  return {
    student_id: String(user.id),
    name: user.username,
    major: pickProfileText(user.personalityProfile, ['major', 'educationMajor', 'schoolMajor', 'specialty']),
    grade: pickProfileText(user.personalityProfile, ['grade', 'educationGrade', 'schoolGrade', 'year']),
    bio: sanitizeText(user.bio || ''),
    tags: normalizedProfile.tags,
    strengths: normalizedProfile.strengths,
    suitable_jobs: normalizedProfile.suitable_jobs,
    dimensions: normalizedProfile.dimensions,
    summary: normalizedProfile.summary,
    credit_score: user.creditScore,
    resume_image: resumeImage,
    has_resume_image: Boolean(resumeImage),
    completed_at: user.personalityProfileCompletedAt,
    created_at: normalizedProfile.created_at,
    recruitment_context: recruitmentContext
  };
};

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

    const previousAvatar = user.avatar || '';
    const previousProfile = user.personalityProfile || {};
    if (req.body.avatarUpload) {
      updateData.avatar = await saveAvatarUpload(req.body.avatarUpload, userId, req);
    }

    if (updateData.avatar && !/^https?:\/\//i.test(updateData.avatar)) {
      return res.status(400).json({
        success: false,
        message: '头像 URL 格式不正确'
      });
    }

    const nextProfile = {
      ...previousProfile,
      ...(updateData.personalityProfile || {})
    };

    if (req.body.resumeImageUpload) {
      nextProfile.resumeImage = await saveResumeUpload(req.body.resumeImageUpload, userId, req);
    } else if (req.body.resumeImageRemoved) {
      nextProfile.resumeImage = '';
    }

    if (nextProfile.resumeImage && !/^https?:\/\//i.test(nextProfile.resumeImage)) {
      return res.status(400).json({
        success: false,
        message: '简历图片地址格式不正确'
      });
    }

    if (updateData.personalityProfile !== undefined || req.body.resumeImageUpload || req.body.resumeImageRemoved) {
      updateData.personalityProfile = nextProfile;
    }

    await user.update(updateData);

    if (updateData.avatar !== undefined && previousAvatar && previousAvatar !== updateData.avatar) {
      await removeStoredAvatar(previousAvatar);
    }

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

exports.getInternalCandidateProfiles = async (req, res) => {
  try {
    const token = req.headers['x-ai-service-token'];

    if (!token || token !== AI_INTERNAL_TOKEN) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden'
      });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 500);
    const jobId = parseInt(req.query.jobId, 10);
    const selectedJobId = Number.isNaN(jobId) ? null : jobId;

    const students = await User.findAll({
      where: {
        role: 'student',
        status: 'active'
      },
      attributes: [
        'id',
        'username',
        'bio',
        'creditScore',
        'personalityProfileCompletedAt',
        'personalityProfile'
      ],
      order: [
        ['personalityProfileCompletedAt', 'DESC'],
        ['updatedAt', 'DESC']
      ],
      limit
    });

    const validStudents = students.filter((student) => hasUsableAiProfile(student.personalityProfile));
    const studentIds = validStudents.map((student) => student.id);

    let applicationsByStudent = new Map();
    let conversationsByStudent = new Map();

    if (studentIds.length) {
      const applicationWhere = {
        studentId: {
          [Op.in]: studentIds
        }
      };
      const conversationWhere = {
        studentId: {
          [Op.in]: studentIds
        }
      };

      if (selectedJobId) {
        applicationWhere.jobId = selectedJobId;
        conversationWhere.jobId = selectedJobId;
      }

      const [applications, conversations] = await Promise.all([
        Application.findAll({
          where: applicationWhere,
          order: [
            ['stageUpdatedAt', 'DESC'],
            ['updatedAt', 'DESC']
          ]
        }),
        Conversation.findAll({
          where: conversationWhere,
          order: [
            ['lastMessageAt', 'DESC'],
            ['updatedAt', 'DESC']
          ]
        })
      ]);

      applicationsByStudent = applications.reduce((map, application) => {
        if (!map.has(application.studentId)) {
          map.set(application.studentId, application);
        }
        return map;
      }, new Map());

      conversationsByStudent = conversations.reduce((map, conversation) => {
        if (!map.has(conversation.studentId)) {
          map.set(conversation.studentId, conversation);
        }
        return map;
      }, new Map());
    }

    const candidates = validStudents.map((student) => {
      const recruitmentContext = buildRecruitmentContext(
        applicationsByStudent.get(student.id) || null,
        conversationsByStudent.get(student.id) || null
      );

      return buildInternalCandidateProfile(student, recruitmentContext);
    });

    return res.json({
      success: true,
      data: {
        total: candidates.length,
        candidates
      }
    });
  } catch (error) {
    console.error('Internal candidate profiles error:', error);
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
