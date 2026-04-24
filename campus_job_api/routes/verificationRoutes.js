const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken: auth } = require('../middlewares/auth');
const { roleGuard, adminGuard } = require('../middlewares/roleGuard');
const { handleValidationErrors } = require('../middlewares/validate');
const verificationController = require('../controllers/verificationController');

// 获取当前认证状态 - 所有登录用户均可访问
router.get('/status', auth, verificationController.getStatus);

// 提交认证申请 - 仅限企业角色访问
router.post('/apply', auth, roleGuard('employer'), [
  body('companyName').trim().notEmpty().withMessage('企业名称不能为空').isLength({ max: 100 }).withMessage('企业名称不能超过100字符'),
  body('licenseNumber').trim().notEmpty().withMessage('营业执照编号不能为空').isLength({ max: 50 }).withMessage('营业执照编号不能超过50字符'),
  body('contactName').trim().notEmpty().withMessage('联系人姓名不能为空').isLength({ max: 50 }).withMessage('联系人姓名不能超过50字符'),
  body('contactPhone').trim().notEmpty().matches(/^1[3-9]\d{9}$/).withMessage('联系人电话格式不正确'),
  body('licenseImage').trim().notEmpty().withMessage('营业执照图片不能为空').isURL().withMessage('营业执照图片必须是有效URL'),
  body('address').optional().trim().isLength({ max: 200 }).withMessage('地址不能超过200字符'),
  body('city').optional().trim().isLength({ max: 50 }).withMessage('城市不能超过50字符'),
  body('industry').optional().trim().isLength({ max: 50 }).withMessage('行业不能超过50字符'),
  body('scale').optional().trim().isLength({ max: 50 }).withMessage('规模不能超过50字符'),
  body('website').optional({ checkFalsy: true }).trim().isURL().withMessage('官网URL格式不正确'),
  body('otherQualifications').optional().trim().isLength({ max: 1000 }).withMessage('其他资质不能超过1000字符')
], handleValidationErrors, verificationController.applyVerification);

// ==================== 管理员接口 ====================
// 获取认证统计
router.get('/stats', auth, adminGuard, verificationController.getAdminStats);

// 获取待审核列表
router.get('/pending', auth, adminGuard, verificationController.getPendingList);

// 获取全部认证列表
router.get('/all', auth, adminGuard, verificationController.getAllVerifications);

// 获取认证详情
router.get('/:id', auth, adminGuard, verificationController.getVerificationById);

// 通过认证
router.post('/:id/approve', auth, adminGuard, verificationController.approveVerification);

// 拒绝认证
router.post('/:id/reject', auth, adminGuard, [
  body('reason').trim().notEmpty().withMessage('拒绝原因不能为空').isLength({ max: 500 }).withMessage('拒绝原因不能超过500字符')
], handleValidationErrors, verificationController.rejectVerification);

// 获取AI预审结果
router.get('/:id/ai-audit', auth, adminGuard, verificationController.getAiAudit);

module.exports = router;
