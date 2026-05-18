const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { sequelize } = require('../config/database');
const { Verification, User } = require('../models');
const { verifyIdentity } = require('../services/aiService');
const {
  createAdminOperationLog,
  createSystemNotification
} = require('../services/adminActivityService');
const { sanitizeFields, sanitizeText } = require('../utils/sanitize');

const LICENSE_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'verifications');
const LICENSE_IMAGE_DATA_URL_PATTERN = /^data:(image\/(png|jpeg|jpg|webp));base64,([a-z0-9+/=]+)$/i;
const LICENSE_IMAGE_MAX_BYTES = 4 * 1024 * 1024;

const getPublicServerOrigin = (req) => (
  process.env.PUBLIC_SERVER_ORIGIN ||
  `${req.protocol}://localhost:${process.env.PORT || 3001}`
).replace(/\/+$/, '');

const normalizeLicenseImageReference = (licenseImage, req) => {
  if (typeof licenseImage !== 'string' || !licenseImage.trim()) {
    return '';
  }

  const trimmed = licenseImage.trim();

  if (trimmed.startsWith('/uploads/')) {
    return `${getPublicServerOrigin(req)}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch (_error) {
    return '';
  }

  return '';
};

const isPlatformStoredLicenseImage = (licenseImage) => {
  if (typeof licenseImage !== 'string' || !licenseImage.trim()) {
    return false;
  }

  try {
    const pathname = licenseImage.startsWith('/uploads/')
      ? licenseImage
      : new URL(licenseImage).pathname;

    return pathname.startsWith('/uploads/');
  } catch (_error) {
    return false;
  }
};

const describeLicenseImageForAudit = (licenseImage) => {
  const normalized = typeof licenseImage === 'string' ? licenseImage.trim() : '';

  if (!normalized) {
    return '未提供';
  }

  if (isPlatformStoredLicenseImage(normalized)) {
    return `平台内部图片地址（已上传）：${normalized}`;
  }

  return `外部图片地址：${normalized}`;
};

const extractStoredLicenseImagePath = (licenseImage) => {
  if (typeof licenseImage !== 'string' || !licenseImage.trim()) {
    return null;
  }

  try {
    const pathname = licenseImage.startsWith('/uploads/')
      ? licenseImage
      : new URL(licenseImage).pathname;

    if (!pathname.startsWith('/uploads/verifications/')) {
      return null;
    }

    const uploadRoot = path.resolve(LICENSE_UPLOAD_DIR);
    const filePath = path.resolve(path.join(__dirname, '..', pathname.replace(/^\/+/, '')));

    if (!filePath.startsWith(uploadRoot)) {
      return null;
    }

    return filePath;
  } catch (_error) {
    return null;
  }
};

const removeStoredLicenseImage = async (licenseImage) => {
  const filePath = extractStoredLicenseImagePath(licenseImage);
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Remove stored license image failed:', error);
    }
  }
};

const saveLicenseImageUpload = async (licenseImageUpload, userId, req) => {
  if (typeof licenseImageUpload !== 'string' || !licenseImageUpload.trim()) {
    return null;
  }

  const matches = licenseImageUpload.match(LICENSE_IMAGE_DATA_URL_PATTERN);
  if (!matches) {
    const error = new Error('营业执照图片仅支持 PNG、JPG、JPEG、WEBP 格式');
    error.statusCode = 400;
    throw error;
  }

  const mimeType = matches[1].toLowerCase();
  const base64Payload = matches[3];
  const buffer = Buffer.from(base64Payload, 'base64');

  if (!buffer.length) {
    const error = new Error('营业执照图片内容无效');
    error.statusCode = 400;
    throw error;
  }

  if (buffer.length > LICENSE_IMAGE_MAX_BYTES) {
    const error = new Error('营业执照图片不能超过 4MB');
    error.statusCode = 400;
    throw error;
  }

  const extension = mimeType === 'image/jpeg' || mimeType === 'image/jpg'
    ? 'jpg'
    : mimeType.split('/')[1];
  const filename = `license-${userId}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;

  await fs.mkdir(LICENSE_UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(LICENSE_UPLOAD_DIR, filename), buffer);

  return `${getPublicServerOrigin(req)}/uploads/verifications/${filename}`;
};

const buildAuditContent = ({
  companyName,
  licenseNumber,
  contactName,
  contactPhone,
  address,
  industry,
  scale,
  website,
  otherQualifications,
  licenseImage
}) => [
  `企业名称：${companyName}`,
  `营业执照号：${licenseNumber}`,
  `联系人：${contactName}`,
  `联系电话：${contactPhone}`,
  `地址：${address || '未填写'}`,
  `行业：${industry || '未填写'}`,
  `规模：${scale || '未填写'}`,
  `官网：${website || '未填写'}`,
  `其他资质：${otherQualifications || '无'}`,
  `营业执照图片：${licenseImage}`
].join('\n');

const buildEnterpriseAuditContent = ({
  companyName,
  licenseNumber,
  contactName,
  contactPhone,
  address,
  industry,
  scale,
  website,
  otherQualifications,
  licenseImage
}) => [
  `企业名称：${companyName}`,
  `营业执照号：${licenseNumber}`,
  `联系人：${contactName}`,
  `联系电话：${contactPhone}`,
  `地址：${address || '未填写'}`,
  `行业：${industry || '未填写'}`,
  `规模：${scale || '未填写'}`,
  `官网：${website || '未填写'}`,
  `其他资质：${otherQualifications || '无'}`,
  `营业执照图片材料：${describeLicenseImageForAudit(licenseImage)}`
].join('\n');

const triggerAiAudit = (verification, userId, payload) => {
  const content = buildEnterpriseAuditContent(payload);
  verifyIdentity('enterprise', String(userId), content)
    .then(async (aiResult) => {
      if (aiResult) {
        await verification.update({ aiAuditResult: aiResult });
      }
    })
    .catch((error) => {
      console.error('AI verification pre-audit failed:', error);
    });
};

exports.getStatus = async (req, res) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const verification = await Verification.findOne({ where: { userId } });

    if (!verification) {
      return res.json({
        success: true,
        message: '尚未提交认证申请',
        data: {
          id: null,
          status: 'unsubmitted'
        }
      });
    }

    return res.json({
      success: true,
      message: '获取认证状态成功',
      data: {
        id: verification.id,
        status: verification.status,
        companyName: verification.companyName,
        licenseNumber: verification.licenseNumber,
        contactName: verification.contactName,
        contactPhone: verification.contactPhone,
        licenseImage: verification.licenseImage,
        address: verification.address,
        city: verification.city,
        industry: verification.industry,
        scale: verification.scale,
        website: verification.website,
        otherQualifications: verification.otherQualifications,
        rejectionReason: verification.rejectionReason,
        submittedAt: verification.submittedAt,
        reviewedAt: verification.reviewedAt,
        aiAuditResult: verification.aiAuditResult
      }
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    return res.status(500).json({
      success: false,
      message: '获取认证状态失败',
      data: null
    });
  }
};

exports.applyVerification = async (req, res) => {
  try {
    const userId = parseInt(req.user.id, 10);
    let {
      companyName,
      licenseNumber,
      contactName,
      contactPhone,
      licenseImage,
      address,
      city,
      industry,
      scale,
      website,
      otherQualifications
    } = req.body;

    ({
      companyName,
      licenseNumber,
      contactName,
      contactPhone,
      address,
      city,
      industry,
      scale,
      website,
      otherQualifications
    } = sanitizeFields(
      {
        companyName,
        licenseNumber,
        contactName,
        contactPhone,
        address,
        city,
        industry,
        scale,
        website,
        otherQualifications
      },
      [
        'companyName',
        'licenseNumber',
        'contactName',
        'contactPhone',
        'address',
        'city',
        'industry',
        'scale',
        'website',
        'otherQualifications'
      ]
    ));

    const existingVerification = await Verification.findOne({ where: { userId } });

    if (existingVerification?.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: '璁よ瘉姝ｅ湪瀹℃牳涓紝璇峰嬁閲嶅鎻愪氦',
        data: null
      });
    }

    if (existingVerification?.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: '褰撳墠璐﹀彿宸查€氳繃璁よ瘉',
        data: null
      });
    }

    const previousLicenseImage = existingVerification?.licenseImage || '';
    const incomingLicenseImageUpload = typeof req.body.licenseImageUpload === 'string'
      ? req.body.licenseImageUpload.trim()
      : '';

    if (incomingLicenseImageUpload) {
      licenseImage = await saveLicenseImageUpload(incomingLicenseImageUpload, userId, req);
      req.body.licenseImage = licenseImage;
    } else {
      licenseImage = normalizeLicenseImageReference(licenseImage, req);
      req.body.licenseImage = licenseImage;
    }

    if (!req.body.licenseImage) {
      return res.status(400).json({
        success: false,
        message: '营业执照图片不能为空，请上传图片后再提交',
        data: null
      });
    }

    const requiredFields = {
      companyName: '企业名称',
      licenseNumber: '营业执照号',
      contactName: '联系人姓名',
      contactPhone: '联系电话',
      licenseImage: '营业执照图片 URL'
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `${label}不能为空`,
          data: null
        });
      }
    }

    if (!/^https?:\/\//i.test(licenseImage)) {
      return res.status(400).json({
        success: false,
        message: '营业执照图片 URL 格式不正确，必须为 http 或 https 链接',
        data: null
      });
    }

    const payload = {
      companyName,
      licenseNumber,
      contactName,
      contactPhone,
      licenseImage,
      address,
      city,
      industry,
      scale,
      website,
      otherQualifications
    };

    if (existingVerification) {
      if (existingVerification.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: '认证正在审核中，请勿重复提交',
          data: null
        });
      }

      if (existingVerification.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: '当前账号已通过认证',
          data: null
        });
      }

      await existingVerification.update({
        ...payload,
        status: 'pending',
        rejectionReason: null,
        submittedAt: new Date(),
        aiAuditResult: null
      });

      if (incomingLicenseImageUpload && previousLicenseImage && previousLicenseImage !== licenseImage) {
        await removeStoredLicenseImage(previousLicenseImage);
      }

      await createSystemNotification({
        title: `新的企业认证申请：${companyName}`,
        content: `${companyName} 已重新提交企业认证申请，请管理员尽快审核。`,
        type: 'audit_result',
        targetRole: 'admin',
        relatedVerificationId: existingVerification.id,
        actionUrl: '/verification-review'
      });

      triggerAiAudit(existingVerification, userId, payload);

      return res.json({
        success: true,
        message: '认证申请已更新并重新提交',
        data: {
          id: existingVerification.id,
          status: 'pending'
        }
      });
    }

    const newVerification = await Verification.create({
      userId,
      ...payload,
      status: 'pending',
      submittedAt: new Date()
    });

    await createSystemNotification({
      title: `新的企业认证申请：${companyName}`,
      content: `${companyName} 提交了新的企业认证申请，请管理员尽快审核。`,
      type: 'audit_result',
      targetRole: 'admin',
      relatedVerificationId: newVerification.id,
      actionUrl: '/verification-review'
    });

    triggerAiAudit(newVerification, userId, payload);

    return res.json({
      success: true,
      message: '认证申请提交成功，请等待审核',
      data: {
        id: newVerification.id,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Apply verification error:', error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        data: null
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: '营业执照号已存在，请检查后重新提交',
        data: null
      });
    }

    return res.status(500).json({
      success: false,
      message: '提交认证申请失败',
      data: null
    });
  }
};

exports.getAdminStats = async (req, res) => {
  try {
    const counts = await Verification.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('status')), 'count']
      ],
      group: ['status']
    });

    const stats = { pending: 0, approved: 0, rejected: 0, total: 0 };
    counts.forEach((item) => {
      const status = item.get('status');
      const count = parseInt(item.get('count'), 10);
      stats[status] = count;
      stats.total += count;
    });

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get verification stats error:', error);
    return res.status(500).json({
      success: false,
      message: '获取认证统计失败'
    });
  }
};

exports.getPendingList = async (req, res) => {
  try {
    let { page = 1, limit = 100 } = req.query;
    limit = Math.min(parseInt(limit, 10) || 100, 100);
    page = parseInt(page, 10) || 1;
    const offset = (page - 1) * limit;

    const { rows, count } = await Verification.findAndCountAll({
      where: { status: 'pending' },
      offset,
      limit,
      order: [['submittedAt', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'phone']
      }]
    });

    return res.json({
      success: true,
      data: {
        list: rows,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit) || 1
        }
      }
    });
  } catch (error) {
    console.error('Get pending verifications error:', error);
    return res.status(500).json({
      success: false,
      message: '获取待审核认证列表失败'
    });
  }
};

exports.getAllVerifications = async (req, res) => {
  try {
    let { page = 1, limit = 10, status } = req.query;
    limit = Math.min(parseInt(limit, 10) || 10, 100);
    page = parseInt(page, 10) || 1;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) {
      where.status = status;
    }

    const { rows, count } = await Verification.findAndCountAll({
      where,
      offset,
      limit,
      order: [['submittedAt', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'phone']
      }]
    });

    return res.json({
      success: true,
      data: {
        list: rows,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit) || 1
        }
      }
    });
  } catch (error) {
    console.error('Get all verifications error:', error);
    return res.status(500).json({
      success: false,
      message: '获取认证列表失败'
    });
  }
};

exports.getVerificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const verification = await Verification.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'phone']
      }]
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: '认证记录不存在'
      });
    }

    return res.json({
      success: true,
      data: verification
    });
  } catch (error) {
    console.error('Get verification detail error:', error);
    return res.status(500).json({
      success: false,
      message: '获取认证详情失败'
    });
  }
};

exports.approveVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const verification = await Verification.findByPk(id);

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: '认证记录不存在'
      });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该认证当前状态不允许审核通过'
      });
    }

    await verification.update({
      status: 'approved',
      rejectionReason: null,
      reviewedAt: new Date()
    });

    await Promise.all([
      createAdminOperationLog({
        adminId: req.user.id,
        actionType: 'verification_approve',
        targetType: 'verification',
        targetId: verification.id,
        summary: `审核通过企业认证：${verification.companyName}`,
        detail: '企业认证已审核通过。',
        metadata: {
          verificationId: verification.id,
          userId: verification.userId,
          status: 'approved'
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }),
      createSystemNotification({
        title: `企业认证已通过：${verification.companyName}`,
        content: '你的企业认证已通过平台审核，现在可以继续发布岗位和处理学生投递。',
        type: 'audit_result',
        targetRole: 'employer',
        targetUserId: verification.userId,
        senderAdminId: req.user.id,
        relatedVerificationId: verification.id,
        actionUrl: '/employer/verification'
      })
    ]);

    return res.json({
      success: true,
      message: '认证已通过'
    });
  } catch (error) {
    console.error('Approve verification error:', error);
    return res.status(500).json({
      success: false,
      message: '审核通过认证失败'
    });
  }
};

exports.rejectVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = sanitizeText(req.body.reason || '不符合认证要求');
    const verification = await Verification.findByPk(id);

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: '认证记录不存在'
      });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该认证当前状态不允许审核驳回'
      });
    }

    await verification.update({
      status: 'rejected',
      rejectionReason: reason,
      reviewedAt: new Date()
    });

    await Promise.all([
      createAdminOperationLog({
        adminId: req.user.id,
        actionType: 'verification_reject',
        targetType: 'verification',
        targetId: verification.id,
        summary: `驳回企业认证：${verification.companyName}`,
        detail: reason,
        metadata: {
          verificationId: verification.id,
          userId: verification.userId,
          status: 'rejected'
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }),
      createSystemNotification({
        title: `企业认证未通过：${verification.companyName}`,
        content: `你的企业认证未通过平台审核。原因：${reason}`,
        type: 'audit_result',
        targetRole: 'employer',
        targetUserId: verification.userId,
        senderAdminId: req.user.id,
        relatedVerificationId: verification.id,
        actionUrl: '/employer/verification'
      })
    ]);

    return res.json({
      success: true,
      message: '认证已驳回'
    });
  } catch (error) {
    console.error('Reject verification error:', error);
    return res.status(500).json({
      success: false,
      message: '驳回认证失败'
    });
  }
};

exports.getAiAudit = async (req, res) => {
  try {
    const { id } = req.params;
    const verification = await Verification.findByPk(id, {
      attributes: ['id', 'companyName', 'aiAuditResult', 'status', 'submittedAt']
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: '认证记录不存在'
      });
    }

    return res.json({
      success: true,
      data: {
        id: verification.id,
        companyName: verification.companyName,
        status: verification.status,
        submittedAt: verification.submittedAt,
        aiAuditResult: verification.aiAuditResult || null
      }
    });
  } catch (error) {
    console.error('Get verification AI audit error:', error);
    return res.status(500).json({
      success: false,
      message: '获取 AI 预审结果失败'
    });
  }
};
