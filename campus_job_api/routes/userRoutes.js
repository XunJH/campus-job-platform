const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middlewares/auth');
const { adminGuard } = require('../middlewares/roleGuard');
const { handleValidationErrors } = require('../middlewares/validate');

// 获取用户列表 - 仅限 admin 角色
router.get('/', authenticateToken, adminGuard, userController.getUsers);

// 获取用户详情 - 仅限 admin 角色
router.get('/:id', authenticateToken, adminGuard, userController.getUserById);

// 更新用户状态 - 仅限 admin 角色
router.patch('/:id/status',
  authenticateToken,
  adminGuard,
  body('status')
    .notEmpty()
    .isIn(['active', 'inactive', 'banned'])
    .withMessage('用户状态必须是 active、inactive 或 banned'),
  handleValidationErrors,
  userController.updateUserStatus
);

// 删除用户 - 仅限 admin 角色
router.delete('/:id', authenticateToken, adminGuard, userController.deleteUser);

module.exports = router;
