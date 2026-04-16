const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middlewares/auth');
const { roleGuard, adminGuard } = require('../middlewares/roleGuard');
const verificationController = require('../controllers/verificationController');

// 获取当前认证状态 - 所有登录用户均可访问
router.get('/status', auth, verificationController.getStatus);

// 提交认证申请 - 仅限企业角色访问
router.post('/apply', auth, roleGuard('employer'), verificationController.applyVerification);

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
router.post('/:id/reject', auth, adminGuard, verificationController.rejectVerification);

module.exports = router;
