const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const { Verification, User } = require('../models');

/**
 * @swagger
 * /api/v1/verification/status:
 *   get:
 *     summary: 获取当前认证状态
 *     tags: [认证管理]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "获取认证状态成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [unsubmitted, pending, approved, rejected]
 *                       example: "unsubmitted"
 *                     companyName:
 *                       type: string
 *                       example: "示例科技有限公司"
 *                     rejectionReason:
 *                       type: string
 *                       example: "营业执照信息有误"
 *                     submittedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-01T00:00:00.000Z"
 *                     reviewedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-02T00:00:00.000Z"
 */
exports.getStatus = async (req, res) => {
  try {
    const userId = parseInt(req.user.id, 10);

    const verification = await Verification.findOne({
      where: { userId }
    });

    if (!verification) {
      return res.json({
        success: true,
        message: '未提交认证申请',
        data: {
          status: 'unsubmitted'
        }
      });
    }

    return res.json({
      success: true,
      message: '获取认证状态成功',
      data: {
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
        reviewedAt: verification.reviewedAt
      }
    });
  } catch (error) {
    console.error('获取认证状态失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取认证状态失败',
      data: null
    });
  }
};

/**
 * @swagger
 * /api/v1/verification/apply:
 *   post:
 *     summary: 提交企业认证申请
 *     tags: [认证管理]
 *     security:
 *       - BearerAuth: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: 企业认证信息
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - companyName
 *             - licenseNumber
 *             - contactName
 *             - contactPhone
 *             - licenseImage
 *           properties:
 *             companyName:
 *               type: string
 *               example: "示例科技有限公司"
 *             licenseNumber:
 *               type: string
 *               example: "123456789012345"
 *             contactName:
 *               type: string
 *               example: "张三"
 *             contactPhone:
 *               type: string
 *               example: "13800138000"
 *             licenseImage:
 *               type: string
 *               example: "https://example.com/license.jpg"
 *             address:
 *               type: string
 *               example: "北京市朝阳区某某街道123号"
 *     responses:
 *       200:
 *         description: 提交成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "认证申请提交成功，请等待审核"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     status:
 *                       type: string
 *                       enum: [pending]
 *                       example: "pending"
 *       400:
 *         description: 请求错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "正在审核中，请勿重复提交"
 */
exports.applyVerification = async (req, res) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const {
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

    // 校验必填字段
    const requiredFields = {
      companyName: '企业名称',
      licenseNumber: '营业执照号',
      contactName: '联系人姓名',
      contactPhone: '联系人电话',
      licenseImage: '营业执照图片URL'
    };

    for (const [field, fieldName] of Object.entries(requiredFields)) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `${fieldName}不能为空`,
          data: null
        });
      }
    }

    // 校验营业执照图片URL格式
    if (!/^https?:\/\//i.test(licenseImage)) {
      return res.status(400).json({
        success: false,
        message: '营业执照图片URL格式不正确，必须是 http 或 https 链接',
        data: null
      });
    }

    // 检查是否已提交过申请
    const existingVerification = await Verification.findOne({
      where: { userId }
    });

    if (existingVerification) {
      const { status } = existingVerification;

      if (status === 'pending') {
        return res.status(400).json({
          success: false,
          message: '正在审核中，请勿重复提交',
          data: null
        });
      }

      if (status === 'approved') {
        return res.status(400).json({
          success: false,
          message: '已通过认证',
          data: null
        });
      }

      if (status === 'rejected') {
        // 更新已拒绝的申请
        await existingVerification.update({
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
          otherQualifications,
          status: 'pending',
          rejectionReason: null,
          submittedAt: new Date()
        });

        return res.json({
          success: true,
          message: '认证申请已更新并重新提交',
          data: {
            id: existingVerification.id,
            status: 'pending'
          }
        });
      }
    }

    // 首次提交，创建新记录
    const newVerification = await Verification.create({
      userId,
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
      otherQualifications,
      status: 'pending',
      submittedAt: new Date()
    });

    return res.json({
      success: true,
      message: '认证申请提交成功，请等待审核',
      data: {
        id: newVerification.id,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('提交认证申请失败:', error);

    // 处理唯一约束冲突（例如营业执照号重复）
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


// ==================== 管理员接口 ====================

// 获取认证统计
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
    counts.forEach(item => {
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
    console.error('获取认证统计失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取认证统计失败'
    });
  }
};

// 获取待审核列表
exports.getPendingList = async (req, res) => {
  try {
    let { page = 1, limit = 100 } = req.query;
    limit = Math.min(parseInt(limit) || 100, 100);
    page = parseInt(page) || 1;
    const offset = (page - 1) * limit;

    const { rows: list, count } = await Verification.findAndCountAll({
      where: { status: 'pending' },
      offset,
      limit: parseInt(limit),
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
        list,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取待审核列表失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取待审核列表失败'
    });
  }
};

// 获取全部认证列表（支持分页、状态筛选）
exports.getAllVerifications = async (req, res) => {
  try {
    let { page = 1, limit = 10, status } = req.query;
    limit = Math.min(parseInt(limit) || 10, 100);
    page = parseInt(page) || 1;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) {
      where.status = status;
    }

    const { rows: list, count } = await Verification.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit),
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
        list,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取认证列表失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取认证列表失败'
    });
  }
};

// 获取认证详情
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
    console.error('获取认证详情失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取认证详情失败'
    });
  }
};

// 通过认证
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

    if (verification.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: '该认证已通过，请勿重复操作'
      });
    }

    await verification.update({
      status: 'approved',
      rejectionReason: null,
      reviewedAt: new Date()
    });

    return res.json({
      success: true,
      message: '认证已通过'
    });
  } catch (error) {
    console.error('通过认证失败:', error);
    return res.status(500).json({
      success: false,
      message: '通过认证失败'
    });
  }
};

// 拒绝认证
exports.rejectVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const verification = await Verification.findByPk(id);

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: '认证记录不存在'
      });
    }

    if (verification.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: '该认证已拒绝，请勿重复操作'
      });
    }

    await verification.update({
      status: 'rejected',
      rejectionReason: reason || '不符合认证要求',
      reviewedAt: new Date()
    });

    return res.json({
      success: true,
      message: '认证已拒绝'
    });
  } catch (error) {
    console.error('拒绝认证失败:', error);
    return res.status(500).json({
      success: false,
      message: '拒绝认证失败'
    });
  }
};
