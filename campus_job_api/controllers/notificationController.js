const { Op } = require('sequelize');
const {
  NotificationReadState,
  SystemNotification,
  User
} = require('../models');
const {
  createAdminOperationLog,
  createSystemNotification,
  markNotificationsAsRead
} = require('../services/adminActivityService');

const NOTIFICATION_TYPES = new Set(['system', 'audit_result', 'ticket_update', 'settlement', 'announcement']);
const TARGET_ROLES = new Set(['all', 'student', 'employer', 'admin']);

const buildNotificationInclude = (userId) => ([
  {
    model: User,
    as: 'senderAdmin',
    attributes: ['id', 'username', 'email']
  },
  {
    model: NotificationReadState,
    as: 'readStates',
    required: false,
    where: userId ? { userId } : undefined,
    attributes: ['id', 'userId', 'readAt']
  }
]);

const buildNotificationWhere = (user) => ({
  [Op.or]: [
    { targetRole: 'all' },
    { targetRole: user.role },
    { targetUserId: user.id }
  ]
});

exports.getAdminNotifications = async (req, res) => {
  try {
    let { page = 1, limit = 10, type, targetRole, search } = req.query;
    page = parseInt(page, 10) || 1;
    limit = Math.min(parseInt(limit, 10) || 10, 100);
    const offset = (page - 1) * limit;

    const where = {};

    if (type && NOTIFICATION_TYPES.has(type)) {
      where.type = type;
    }

    if (targetRole && TARGET_ROLES.has(targetRole)) {
      where.targetRole = targetRole;
    }

    if (search && search.trim()) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search.trim()}%` } },
        { content: { [Op.like]: `%${search.trim()}%` } }
      ];
    }

    const { rows, count } = await SystemNotification.findAndCountAll({
      where,
      include: buildNotificationInclude(),
      order: [['isPinned', 'DESC'], ['createdAt', 'DESC']],
      offset,
      limit
    });

    const totalVisible = await SystemNotification.count({
      where: buildNotificationWhere(req.user)
    });
    const readCount = await NotificationReadState.count({
      where: { userId: req.user.id }
    });

    return res.json({
      success: true,
      data: {
        notifications: rows,
        meta: {
          unreadCount: Math.max(totalVisible - readCount, 0),
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit) || 1
        }
      }
    });
  } catch (error) {
    console.error('Get admin notifications error:', error);
    return res.status(500).json({
      success: false,
      message: '获取系统通知失败'
    });
  }
};

exports.createAdminNotification = async (req, res) => {
  try {
    const {
      title,
      content,
      type = 'announcement',
      targetRole = 'all',
      targetUserId = null,
      actionUrl = null,
      isPinned = false
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: '通知标题不能为空'
      });
    }

    if (!content || !String(content).trim()) {
      return res.status(400).json({
        success: false,
        message: '通知内容不能为空'
      });
    }

    const notification = await createSystemNotification({
      title: String(title).trim(),
      content: String(content).trim(),
      type: NOTIFICATION_TYPES.has(type) ? type : 'announcement',
      targetRole: TARGET_ROLES.has(targetRole) ? targetRole : 'all',
      targetUserId: targetUserId ? parseInt(targetUserId, 10) : null,
      senderAdminId: req.user.id,
      actionUrl,
      isPinned
    });

    await createAdminOperationLog({
      adminId: req.user.id,
      actionType: 'notification_create',
      targetType: 'notification',
      targetId: notification.id,
      summary: `创建系统通知：${notification.title}`,
      detail: notification.content,
      metadata: {
        type: notification.type,
        targetRole: notification.targetRole,
        targetUserId: notification.targetUserId,
        actionUrl: notification.actionUrl,
        isPinned: notification.isPinned
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(201).json({
      success: true,
      message: '系统通知已创建',
      data: notification
    });
  } catch (error) {
    console.error('Create admin notification error:', error);
    return res.status(500).json({
      success: false,
      message: '创建系统通知失败'
    });
  }
};

exports.getMyNotifications = async (req, res) => {
  try {
    let { type, onlyUnread } = req.query;
    const where = buildNotificationWhere(req.user);

    if (type && NOTIFICATION_TYPES.has(type)) {
      where.type = type;
    }

    const notifications = await SystemNotification.findAll({
      where,
      include: buildNotificationInclude(req.user.id),
      order: [['isPinned', 'DESC'], ['createdAt', 'DESC']]
    });

    const payload = notifications.map((notification) => {
      const plain = notification.toJSON();
      const isRead = Array.isArray(plain.readStates) && plain.readStates.length > 0;
      return { ...plain, isRead };
    });

    const filtered = onlyUnread === 'true'
      ? payload.filter((item) => !item.isRead)
      : payload;

    return res.json({
      success: true,
      data: {
        notifications: filtered,
        unreadCount: payload.filter((item) => !item.isRead).length
      }
    });
  } catch (error) {
    console.error('Get my notifications error:', error);
    return res.status(500).json({
      success: false,
      message: '获取我的通知失败'
    });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    const notificationIds = Array.isArray(req.body.notificationIds) ? req.body.notificationIds : [];
    await markNotificationsAsRead(notificationIds, req.user.id);

    return res.json({
      success: true,
      message: '通知已标记为已读'
    });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    return res.status(500).json({
      success: false,
      message: '标记通知失败'
    });
  }
};
