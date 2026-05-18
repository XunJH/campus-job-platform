const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken } = require('../middlewares/auth');
const { adminGuard, anyRoleGuard } = require('../middlewares/roleGuard');
const { handleValidationErrors } = require('../middlewares/validate');
const notificationController = require('../controllers/notificationController');

router.get('/admin', authenticateToken, adminGuard, notificationController.getAdminNotifications);
router.post(
  '/admin',
  authenticateToken,
  adminGuard,
  [
    body('title').trim().notEmpty().withMessage('通知标题不能为空'),
    body('content').trim().notEmpty().withMessage('通知内容不能为空'),
    body('type').optional().isIn(['system', 'audit_result', 'ticket_update', 'settlement', 'announcement']),
    body('targetRole').optional().isIn(['all', 'student', 'employer', 'admin'])
  ],
  handleValidationErrors,
  notificationController.createAdminNotification
);

router.get('/my', authenticateToken, anyRoleGuard, notificationController.getMyNotifications);
router.post(
  '/read',
  authenticateToken,
  anyRoleGuard,
  body('notificationIds').isArray({ min: 1 }).withMessage('notificationIds 不能为空'),
  handleValidationErrors,
  notificationController.markNotificationsRead
);

module.exports = router;
