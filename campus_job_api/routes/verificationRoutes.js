const express = require('express');
const router = express.Router();
const { auth, roleGuard } = require('../middleware/auth');
const verificationController = require('../controllers/verificationController');

// 获取当前认证状态 - 所有登录用户均可访问
router.get('/status', auth, verificationController.getStatus);

// 提交认证申请 - 仅限企业角色访问
router.post('/apply', auth, roleGuard('employer'), verificationController.applyVerification);

module.exports = router;