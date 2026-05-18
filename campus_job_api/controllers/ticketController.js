const { Op } = require('sequelize');
const {
  Job,
  Settlement,
  Ticket,
  User,
  Verification
} = require('../models');
const {
  createAdminOperationLog,
  createSystemNotification,
  createTicketUpdateNotifications
} = require('../services/adminActivityService');
const { getPublicPlatformSettings } = require('../services/platformSettingService');
const { sanitizeText } = require('../utils/sanitize');

const TICKET_TYPES = new Set([
  'verification_appeal',
  'job_appeal',
  'settlement_dispute',
  'complaint_report',
  'manual_review'
]);
const TICKET_STATUSES = new Set(['open', 'in_progress', 'resolved', 'rejected']);
const TICKET_PRIORITIES = new Set(['high', 'medium', 'low']);

const buildTicketIncludes = () => ([
  {
    model: User,
    as: 'submitter',
    attributes: ['id', 'username', 'email', 'phone', 'role']
  },
  {
    model: User,
    as: 'assignee',
    attributes: ['id', 'username', 'email', 'role']
  },
  {
    model: Job,
    as: 'relatedJob',
    attributes: ['id', 'title', 'status', 'auditStatus', 'employerId']
  },
  {
    model: Verification,
    as: 'relatedVerification',
    attributes: ['id', 'companyName', 'status', 'submittedAt', 'reviewedAt', 'userId']
  },
  {
    model: Settlement,
    as: 'relatedSettlement',
    attributes: ['id', 'amount', 'salaryType', 'status', 'createdAt', 'updatedAt', 'studentId', 'employerId'],
    include: [
      { model: User, as: 'student', attributes: ['id', 'username'] },
      { model: User, as: 'employer', attributes: ['id', 'username'] },
      { model: Job, as: 'job', attributes: ['id', 'title'] }
    ]
  }
]);

const parsePositiveInt = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getTicketTypeLabel = (type) => {
  const map = {
    verification_appeal: '认证申诉',
    job_appeal: '岗位申诉',
    settlement_dispute: '结算争议',
    complaint_report: '投诉举报',
    manual_review: '人工复核'
  };

  return map[type] || type;
};

const getSettlementTicketTitle = (settlement) => {
  const jobTitle = settlement.job?.title || '岗位结算';
  return `结算争议：${jobTitle}`;
};

const getSettlementTicketDescription = (settlement) => {
  const studentName = settlement.student?.username || '学生';
  const employerName = settlement.employer?.username || '企业';
  const amount = Number(settlement.amount || 0).toFixed(2);
  const note = settlement.notes ? `当前备注：${settlement.notes}` : '当前没有补充备注。';
  return `系统检测到该结算记录进入争议状态。涉及学生：${studentName}，企业：${employerName}，争议金额：¥${amount}。${note}`;
};

const canUserViewTicket = (ticket, user) => {
  if (user.role === 'admin') {
    return true;
  }

  if (ticket.userId === user.id) {
    return true;
  }

  if (ticket.relatedSettlement) {
    return ticket.relatedSettlement.studentId === user.id || ticket.relatedSettlement.employerId === user.id;
  }

  if (ticket.relatedVerification) {
    return ticket.relatedVerification.userId === user.id;
  }

  if (ticket.relatedJob) {
    return ticket.relatedJob.employerId === user.id;
  }

  return false;
};

const findOpenDuplicateTicket = async ({
  type,
  relatedVerificationId,
  relatedJobId,
  relatedSettlementId,
  userId
}) => {
  const where = {
    type,
    status: { [Op.in]: ['open', 'in_progress'] }
  };

  if (relatedVerificationId) {
    where.relatedVerificationId = relatedVerificationId;
  } else if (relatedJobId) {
    where.relatedJobId = relatedJobId;
  } else if (relatedSettlementId) {
    where.relatedSettlementId = relatedSettlementId;
  } else {
    where.userId = userId;
  }

  return Ticket.findOne({
    where,
    include: buildTicketIncludes(),
    order: [['createdAt', 'DESC']]
  });
};

const ensureSettlementDisputeTickets = async () => {
  const disputedSettlements = await Settlement.findAll({
    where: { status: 'disputed' },
    include: [
      { model: Job, as: 'job', attributes: ['id', 'title'] },
      { model: User, as: 'student', attributes: ['id', 'username'] },
      { model: User, as: 'employer', attributes: ['id', 'username'] }
    ],
    order: [['updatedAt', 'DESC']]
  });

  const activeSettlementIds = disputedSettlements.map((item) => item.id);
  const existingTickets = await Ticket.findAll({
    where: { type: 'settlement_dispute' },
    attributes: ['id', 'relatedSettlementId', 'status', 'resolutionNote']
  });

  const existingMap = new Map(
    existingTickets
      .filter((item) => item.relatedSettlementId)
      .map((item) => [item.relatedSettlementId, item])
  );

  for (const settlement of disputedSettlements) {
    if (existingMap.has(settlement.id)) {
      continue;
    }

    await Ticket.create({
      title: getSettlementTicketTitle(settlement),
      description: getSettlementTicketDescription(settlement),
      type: 'settlement_dispute',
      sourceRole: 'system',
      status: 'open',
      priority: 'high',
      userId: settlement.studentId || settlement.employerId || null,
      relatedJobId: settlement.jobId,
      relatedSettlementId: settlement.id
    });
  }

  const staleTickets = existingTickets.filter(
    (item) => item.relatedSettlementId && !activeSettlementIds.includes(item.relatedSettlementId) && item.status !== 'resolved'
  );

  for (const ticket of staleTickets) {
    await ticket.update({
      status: 'resolved',
      resolutionNote: ticket.resolutionNote || '关联结算争议已关闭，系统自动结案。',
      resolvedAt: new Date()
    });
  }
};

const buildSummary = async () => {
  const tickets = await Ticket.findAll({
    attributes: ['status', 'priority', 'type']
  });

  const summary = {
    total: tickets.length,
    open: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
    highPriority: 0,
    disputes: 0
  };

  tickets.forEach((ticket) => {
    if (ticket.status === 'open') summary.open += 1;
    if (ticket.status === 'in_progress') summary.inProgress += 1;
    if (ticket.status === 'resolved') summary.resolved += 1;
    if (ticket.status === 'rejected') summary.rejected += 1;
    if (ticket.priority === 'high') summary.highPriority += 1;
    if (ticket.type === 'settlement_dispute') summary.disputes += 1;
  });

  return summary;
};

exports.getAdminTickets = async (req, res) => {
  try {
    await ensureSettlementDisputeTickets();

    let { page = 1, limit = 10, status, type, priority, search } = req.query;
    page = parseInt(page, 10) || 1;
    limit = Math.min(parseInt(limit, 10) || 10, 100);
    const offset = (page - 1) * limit;

    const where = {};
    if (status && TICKET_STATUSES.has(status)) {
      where.status = status;
    }
    if (type && TICKET_TYPES.has(type)) {
      where.type = type;
    }
    if (priority && TICKET_PRIORITIES.has(priority)) {
      where.priority = priority;
    }
    if (search && search.trim()) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search.trim()}%` } },
        { description: { [Op.like]: `%${search.trim()}%` } },
        { resolutionNote: { [Op.like]: `%${search.trim()}%` } }
      ];
    }

    const { rows, count } = await Ticket.findAndCountAll({
      where,
      include: buildTicketIncludes(),
      order: [['priority', 'ASC'], ['createdAt', 'DESC']],
      offset,
      limit
    });

    return res.json({
      success: true,
      data: {
        tickets: rows,
        summary: await buildSummary(),
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit) || 1
        }
      }
    });
  } catch (error) {
    console.error('Get admin tickets error:', error);
    return res.status(500).json({
      success: false,
      message: '获取工单列表失败'
    });
  }
};

exports.getMyTickets = async (req, res) => {
  try {
    await ensureSettlementDisputeTickets();

    const { status, type } = req.query;
    const tickets = await Ticket.findAll({
      include: buildTicketIncludes(),
      order: [['status', 'ASC'], ['createdAt', 'DESC']]
    });

    return res.json({
      success: true,
      data: tickets.filter((ticket) => {
        if (!canUserViewTicket(ticket, req.user)) {
          return false;
        }

        if (status && TICKET_STATUSES.has(status) && ticket.status !== status) {
          return false;
        }

        if (type && TICKET_TYPES.has(type) && ticket.type !== type) {
          return false;
        }

        return true;
      })
    });
  } catch (error) {
    console.error('Get my tickets error:', error);
    return res.status(500).json({
      success: false,
      message: '获取我的工单失败'
    });
  }
};

exports.createTicket = async (req, res) => {
  try {
    const platformSettings = await getPublicPlatformSettings();
    if (platformSettings.featureToggles?.enableAppeals === false) {
      return res.status(403).json({
        success: false,
        message: '平台暂时关闭了申诉工单入口'
      });
    }

    const {
      title,
      description,
      type = 'manual_review',
      priority = 'medium',
      relatedVerificationId,
      relatedJobId,
      relatedSettlementId
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: '工单标题不能为空'
      });
    }

    if (!description || !String(description).trim()) {
      return res.status(400).json({
        success: false,
        message: '工单说明不能为空'
      });
    }

    if (!TICKET_TYPES.has(type)) {
      return res.status(400).json({
        success: false,
        message: '无效的工单类型'
      });
    }

    if (!TICKET_PRIORITIES.has(priority)) {
      return res.status(400).json({
        success: false,
        message: '无效的优先级'
      });
    }

    const normalizedVerificationId = parsePositiveInt(relatedVerificationId);
    const normalizedJobId = parsePositiveInt(relatedJobId);
    const normalizedSettlementId = parsePositiveInt(relatedSettlementId);

    const duplicate = await findOpenDuplicateTicket({
      type,
      relatedVerificationId: normalizedVerificationId,
      relatedJobId: normalizedJobId,
      relatedSettlementId: normalizedSettlementId,
      userId: req.user.id
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: '该事项已有待处理工单，请先查看当前处理进度。',
        data: duplicate
      });
    }

    const ticket = await Ticket.create({
      title: sanitizeText(String(title).trim()),
      description: sanitizeText(String(description).trim()),
      type,
      priority,
      sourceRole: req.user.role === 'admin' ? 'admin' : req.user.role,
      status: 'open',
      userId: req.user.id,
      relatedVerificationId: normalizedVerificationId,
      relatedJobId: normalizedJobId,
      relatedSettlementId: normalizedSettlementId
    });

    const detail = await Ticket.findByPk(ticket.id, {
      include: buildTicketIncludes()
    });

    const actionUrl = req.user.role === 'employer' ? '/employer/tickets' : '/student/tickets';
    await createSystemNotification({
      title: `新的${getTicketTypeLabel(type)}工单`,
      content: `${req.user.username || '有用户'} 提交了新的工单《${ticket.title}》，请尽快处理。`,
      type: 'ticket_update',
      targetRole: 'admin',
      targetUserId: null,
      relatedTicketId: ticket.id,
      relatedJobId: normalizedJobId,
      relatedVerificationId: normalizedVerificationId,
      relatedSettlementId: normalizedSettlementId,
      actionUrl: '/tickets',
      isPinned: priority === 'high'
    });

    if (req.user.role === 'admin') {
      await createAdminOperationLog({
        adminId: req.user.id,
        actionType: 'ticket_create',
        targetType: 'ticket',
        targetId: ticket.id,
        summary: `创建工单：${ticket.title}`,
        detail: ticket.description,
        metadata: {
          type,
          priority,
          actionUrl
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    }

    return res.status(201).json({
      success: true,
      message: '工单已创建',
      data: detail
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    return res.status(500).json({
      success: false,
      message: '创建工单失败'
    });
  }
};

exports.updateTicketStatus = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: buildTicketIncludes()
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: '工单不存在'
      });
    }

    const { status, resolutionNote } = req.body;

    if (!status || !TICKET_STATUSES.has(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的工单状态'
      });
    }

    const updatePayload = {
      status,
      assigneeId: req.user.id
    };

    if (typeof resolutionNote === 'string') {
      updatePayload.resolutionNote = sanitizeText(resolutionNote.trim());
    }

    updatePayload.resolvedAt = status === 'resolved' || status === 'rejected'
      ? new Date()
      : null;

    await ticket.update(updatePayload);

    const detail = await Ticket.findByPk(ticket.id, {
      include: buildTicketIncludes()
    });

    await Promise.all([
      createAdminOperationLog({
        adminId: req.user.id,
        actionType: 'ticket_status_update',
        targetType: 'ticket',
        targetId: ticket.id,
        summary: `更新工单状态：${ticket.title}`,
        detail: updatePayload.resolutionNote || `状态更新为 ${status}`,
        metadata: {
          status,
          type: ticket.type,
          priority: ticket.priority,
          submitterId: ticket.userId
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }),
      createTicketUpdateNotifications(detail, req.user.username || '管理员')
    ]);

    return res.json({
      success: true,
      message: '工单状态已更新',
      data: detail
    });
  } catch (error) {
    console.error('Update ticket status error:', error);
    return res.status(500).json({
      success: false,
      message: '更新工单状态失败'
    });
  }
};
