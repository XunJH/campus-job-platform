const {
  AdminOperationLog,
  NotificationReadState,
  Settlement,
  SystemNotification,
  User
} = require('../models');

const SYSTEM_NOTIFICATION_TYPES = new Set([
  'system',
  'audit_result',
  'ticket_update',
  'settlement',
  'announcement'
]);
const TARGET_ROLES = new Set(['all', 'student', 'employer', 'admin']);

const normalizeText = (value, fallback = '') => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
};

const normalizeTicketStatusLabel = (status) => {
  const map = {
    open: '待受理',
    in_progress: '处理中',
    resolved: '已解决',
    rejected: '已驳回'
  };

  return map[status] || status;
};

const createAdminOperationLog = async ({
  adminId,
  actionType,
  targetType,
  targetId = null,
  summary,
  detail = null,
  metadata = null,
  ipAddress = null,
  userAgent = null
}) => {
  if (!adminId || !actionType || !targetType || !summary) {
    return null;
  }

  return AdminOperationLog.create({
    adminId,
    actionType,
    targetType,
    targetId,
    summary: normalizeText(summary, '管理员执行了一项操作'),
    detail: detail ? normalizeText(detail) : null,
    metadata,
    ipAddress,
    userAgent
  });
};

const createSystemNotification = async ({
  title,
  content,
  type = 'system',
  targetRole = 'all',
  targetUserId = null,
  senderAdminId = null,
  relatedTicketId = null,
  relatedJobId = null,
  relatedVerificationId = null,
  relatedSettlementId = null,
  relatedUserId = null,
  actionUrl = null,
  isPinned = false
}) => {
  if (!title || !content) {
    return null;
  }

  return SystemNotification.create({
    title: normalizeText(title, '系统通知'),
    content: normalizeText(content, '请查看通知详情。'),
    type: SYSTEM_NOTIFICATION_TYPES.has(type) ? type : 'system',
    targetRole: TARGET_ROLES.has(targetRole) ? targetRole : 'all',
    targetUserId,
    senderAdminId,
    relatedTicketId,
    relatedJobId,
    relatedVerificationId,
    relatedSettlementId,
    relatedUserId,
    actionUrl,
    isPinned: Boolean(isPinned)
  });
};

const loadSettlementParticipants = async (ticket) => {
  if (!ticket?.relatedSettlementId) {
    return [];
  }

  let settlement = ticket.relatedSettlement;

  if (!settlement) {
    settlement = await Settlement.findByPk(ticket.relatedSettlementId, {
      attributes: ['id', 'studentId', 'employerId']
    });
  }

  if (!settlement) {
    return [];
  }

  return User.findAll({
    where: { id: [settlement.studentId, settlement.employerId].filter(Boolean) },
    attributes: ['id', 'role']
  });
};

const createTicketUpdateNotifications = async (ticket, assigneeName = '') => {
  if (!ticket) {
    return [];
  }

  const statusLabel = normalizeTicketStatusLabel(ticket.status);
  const resolutionSuffix = ticket.resolutionNote
    ? ` 处理说明：${ticket.resolutionNote}`
    : '';
  const assigneeSuffix = assigneeName ? ` 当前处理人：${assigneeName}` : '';
  const content = `你的工单状态已更新为“${statusLabel}”。${resolutionSuffix}${assigneeSuffix}`.trim();

  const notifications = [];
  const baseActionUrl = ticket.sourceRole === 'employer' ? '/employer/tickets' : '/student/tickets';

  if (ticket.userId) {
    notifications.push(
      createSystemNotification({
        title: `工单进度更新：${ticket.title}`,
        content,
        type: 'ticket_update',
        targetRole: ticket.sourceRole === 'employer' ? 'employer' : 'student',
        targetUserId: ticket.userId,
        relatedTicketId: ticket.id,
        relatedJobId: ticket.relatedJobId,
        relatedVerificationId: ticket.relatedVerificationId,
        relatedSettlementId: ticket.relatedSettlementId,
        actionUrl: baseActionUrl
      })
    );
  }

  const participantUsers = await loadSettlementParticipants(ticket);
  for (const user of participantUsers) {
    if (user.id === ticket.userId) {
      continue;
    }

    notifications.push(
      createSystemNotification({
        title: `结算争议进度更新：${ticket.title}`,
        content,
        type: 'ticket_update',
        targetRole: user.role,
        targetUserId: user.id,
        relatedTicketId: ticket.id,
        relatedSettlementId: ticket.relatedSettlementId,
        relatedJobId: ticket.relatedJobId,
        actionUrl: user.role === 'employer' ? '/employer/tickets' : '/student/tickets'
      })
    );
  }

  return Promise.all(notifications);
};

const markNotificationAsRead = async (notificationId, userId) => {
  if (!notificationId || !userId) {
    return null;
  }

  const [record] = await NotificationReadState.findOrCreate({
    where: { notificationId, userId },
    defaults: {
      notificationId,
      userId,
      readAt: new Date()
    }
  });

  if (!record.readAt) {
    await record.update({ readAt: new Date() });
  }

  return record;
};

const markNotificationsAsRead = async (notificationIds, userId) => {
  if (!Array.isArray(notificationIds) || !notificationIds.length || !userId) {
    return [];
  }

  const validIds = notificationIds
    .map((item) => parseInt(item, 10))
    .filter((item) => Number.isInteger(item) && item > 0);

  return Promise.all(validIds.map((notificationId) => markNotificationAsRead(notificationId, userId)));
};

module.exports = {
  createAdminOperationLog,
  createSystemNotification,
  createTicketUpdateNotifications,
  markNotificationAsRead,
  markNotificationsAsRead
};
