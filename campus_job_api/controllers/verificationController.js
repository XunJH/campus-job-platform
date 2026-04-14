const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const Verification = require('../models/Verification')(sequelize, DataTypes);

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
      address
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
