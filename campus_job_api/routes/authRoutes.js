const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');
const { roleGuard } = require('../middlewares/roleGuard');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *           enum: [student, employer, admin]
 *         status:
 *           type: string
 *           enum: [active, inactive, banned]
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *             user:
 *               $ref: '#/components/schemas/User'
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 用户注册
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - email
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: 密码
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 邮箱
 *               role:
 *                 type: string
 *                 enum: [student, employer, admin]
 *                 default: student
 *                 description: 用户角色
 *     responses:
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 */
router.post('/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('用户名长度必须在3-50个字符之间')
      .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
      .withMessage('用户名只能包含字母、数字、下划线和中文'),

    body('password')
      .isLength({ min: 6 })
      .withMessage('密码至少需要6个字符')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('密码必须包含大小写字母和数字'),

    body('email')
      .isEmail()
      .withMessage('请输入有效的邮箱地址'),

    body('role')
      .optional()
      .isIn(['student', 'employer', 'admin'])
      .withMessage('角色必须是student、employer或admin')
  ],
  authController.register
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名或邮箱
 *               password:
 *                 type: string
 *                 description: 密码
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/LoginResponse'
 */
router.post('/login',
  [
    body('username')
      .notEmpty()
      .withMessage('用户名或邮箱不能为空'),

    body('password')
      .notEmpty()
      .withMessage('密码不能为空')
  ],
  authController.login
);

/**
 * @swagger
 * /api/auth/admin-login:
 *   post:
 *     summary: 管理员登录
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 管理员用户名
 *               password:
 *                 type: string
 *                 description: 管理员密码
 *     responses:
 *       200:
 *         description: 管理员登录成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: 认证失败
 *       403:
 *         description: 非管理员账号
 */
router.post('/admin-login',
  [
    body('username')
      .notEmpty()
      .withMessage('管理员用户名不能为空'),

    body('password')
      .notEmpty()
      .withMessage('管理员密码不能为空')
  ],
  authController.adminLogin
);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: 获取当前用户信息
 *     tags: [认证]
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
 *                 data:
 *                   $ref: '#/components/schemas/User'
 */
router.get('/profile',
  authenticateToken,
  authController.getCurrentUser
);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: 更新用户信息
 *     tags: [认证]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 pattern: /^1[3-9]\d{9}$/
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *               avatar:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/profile',
  authenticateToken,
  [
    body('email')
      .optional()
      .isEmail()
      .withMessage('请输入有效的邮箱地址'),

    body('phone')
      .optional()
      .matches(/^1[3-9]\d{9}$/)
      .withMessage('请输入有效的手机号码'),

    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('个人简介最多500个字符')
  ],
  authController.updateUser
);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: 修改密码
 *     tags: [认证]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: 当前密码
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: 新密码
 *     responses:
 *       200:
 *         description: 修改成功
 */
router.put('/change-password',
  authenticateToken,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('当前密码不能为空'),

    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('新密码至少需要6个字符')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('新密码必须包含大小写字母和数字')
  ],
  authController.changePassword
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 用户登出
 *     tags: [认证]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 */
router.post('/logout',
  authenticateToken,
  authController.logout
);

/**
 * @swagger
 * /api/auth/create-admin:
 *   post:
 *     summary: 创建管理员账号（首次使用）
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - email
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 description: 管理员用户名
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: 管理员密码
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 管理员邮箱
 *     responses:
 *       201:
 *         description: 管理员账号创建成功
 *       400:
 *         description: 请求参数错误或管理员已存在
 */
router.post('/create-admin',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('管理员用户名长度必须在3-50个字符之间'),

    body('password')
      .isLength({ min: 6 })
      .withMessage('密码至少需要6个字符'),

    body('email')
      .isEmail()
      .withMessage('请输入有效的邮箱地址')
  ],
  authController.createAdmin
);

module.exports = router;