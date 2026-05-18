const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticateToken, optionalAuth } = require('../middlewares/auth');
const { handleValidationErrors } = require('../middlewares/validate');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ success: false, message: '请求过于频繁，请稍后再试' });
  }
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ success: false, message: '登录尝试次数过多，请15分钟后再试' });
  }
});

router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('用户名长度必须在 3 到 50 个字符之间')
      .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
      .withMessage('用户名只能包含字母、数字、下划线和中文'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('密码至少需要 6 个字符')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('密码必须包含大小写字母和数字'),
    body('email')
      .isEmail()
      .withMessage('请输入有效的邮箱地址'),
    body('role')
      .optional()
      .isIn(['student', 'employer'])
      .withMessage('角色必须是 student 或 employer')
  ],
  handleValidationErrors,
  authController.register
);

router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('用户名或邮箱不能为空'),
    body('password').notEmpty().withMessage('密码不能为空')
  ],
  handleValidationErrors,
  authLimiter,
  authController.login
);

router.post(
  '/admin-login',
  [
    body('username').notEmpty().withMessage('管理员用户名不能为空'),
    body('password').notEmpty().withMessage('管理员密码不能为空')
  ],
  handleValidationErrors,
  adminLoginLimiter,
  authController.adminLogin
);

router.get('/profile', authenticateToken, authController.getCurrentUser);

router.put(
  '/profile',
  authenticateToken,
  [
    body('email')
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage('请输入有效的邮箱地址'),
    body('phone')
      .optional({ checkFalsy: true })
      .matches(/^1[3-9]\d{9}$/)
      .withMessage('请输入有效的手机号'),
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('个人简介最多 500 个字符')
  ],
  handleValidationErrors,
  authController.updateUser
);

router.put(
  '/change-password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('当前密码不能为空'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('新密码至少需要 6 个字符')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('新密码必须包含大小写字母和数字')
  ],
  handleValidationErrors,
  authController.changePassword
);

router.post(
  '/forgot-password',
  [body('username').notEmpty().withMessage('用户名或邮箱不能为空')],
  handleValidationErrors,
  authController.forgotPassword
);

router.post('/logout', authenticateToken, authController.logout);

router.get(
  '/personality-profile/status',
  authenticateToken,
  authController.getPersonalityProfileStatus
);

router.get(
  '/internal/personality-profile/:userId',
  authController.getInternalPersonalityProfile
);

router.get(
  '/internal/candidate-profiles',
  authController.getInternalCandidateProfiles
);

router.post(
  '/personality-profile',
  authenticateToken,
  authController.submitPersonalityProfile
);

router.post(
  '/create-admin',
  optionalAuth,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('管理员用户名长度必须在 3 到 50 个字符之间')
      .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
      .withMessage('管理员用户名只能包含字母、数字、下划线和中文'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('密码至少需要 6 个字符')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('密码必须包含大小写字母和数字'),
    body('email')
      .isEmail()
      .withMessage('请输入有效的邮箱地址')
  ],
  handleValidationErrors,
  authController.createAdmin
);

module.exports = router;
