const {
  Application,
  Job,
  Settlement,
  Ticket,
  User,
  Verification
} = require('../models');
const { createAdminOperationLog } = require('../services/adminActivityService');

const REPORT_RESOURCES = new Set([
  'users',
  'jobs',
  'applications',
  'verifications',
  'settlements',
  'tickets'
]);

const buildDateBuckets = (days) => {
  const buckets = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = days - 1; index >= 0; index -= 1) {
    const bucketDate = new Date(today);
    bucketDate.setDate(today.getDate() - index);
    buckets.push({
      key: bucketDate.toISOString().slice(0, 10),
      label: `${bucketDate.getMonth() + 1}-${bucketDate.getDate()}`,
      count: 0
    });
  }

  return buckets;
};

const fillDateBuckets = (records, dateField, days) => {
  const buckets = buildDateBuckets(days);
  const lookup = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  records.forEach((record) => {
    const value = record?.[dateField];
    if (!value) {
      return;
    }

    const key = new Date(value).toISOString().slice(0, 10);
    const bucket = lookup.get(key);
    if (bucket) {
      bucket.count += 1;
    }
  });

  return buckets.map(({ key: _key, ...rest }) => rest);
};

const countBy = (records, accessor, order = []) => {
  const counter = new Map();
  records.forEach((record) => {
    const key = accessor(record) || 'unknown';
    counter.set(key, (counter.get(key) || 0) + 1);
  });

  const keys = order.length ? order : Array.from(counter.keys());
  return keys.map((key) => ({
    key,
    count: counter.get(key) || 0
  }));
};

const normalizeApplicationStage = (stage) => {
  switch (stage) {
    case 'interview':
      return 'interview_shortlist';
    case 'confirmed':
      return 'interview_confirmed';
    case 'rejected':
      return 'rejected_pool';
    default:
      return stage || 'new';
  }
};

const csvEscape = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  const normalized = typeof value === 'object'
    ? JSON.stringify(value)
    : String(value);

  const compact = normalized.replace(/\r?\n/g, ' ');
  if (/[",]/.test(compact)) {
    return `"${compact.replace(/"/g, '""')}"`;
  }

  return compact;
};

const sendCsv = (res, filename, headers, rows) => {
  const headLine = headers.map((header) => csvEscape(header.label)).join(',');
  const body = rows.map((row) => headers.map((header) => csvEscape(row[header.key])).join(',')).join('\n');
  const csv = `\uFEFF${headLine}\n${body}`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.status(200).send(csv);
};

const formatAmount = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
};

const getOverviewPayload = async () => {
  const [users, jobs, applications, verifications, settlements, tickets] = await Promise.all([
    User.findAll({
      attributes: ['id', 'username', 'role', 'status', 'createdAt']
    }),
    Job.findAll({
      attributes: ['id', 'title', 'status', 'auditStatus', 'applicationsCount', 'createdAt']
    }),
    Application.findAll({
      attributes: ['id', 'status', 'applicationStage', 'appliedAt']
    }),
    Verification.findAll({
      attributes: ['id', 'status', 'submittedAt']
    }),
    Settlement.findAll({
      attributes: ['id', 'amount', 'status', 'createdAt']
    }),
    Ticket.findAll({
      attributes: ['id', 'type', 'status', 'priority', 'createdAt']
    })
  ]);

  const totalSettlementAmount = settlements.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    summary: {
      totalUsers: users.length,
      totalEmployers: users.filter((item) => item.role === 'employer').length,
      totalStudents: users.filter((item) => item.role === 'student').length,
      activeJobs: jobs.filter((item) => item.status === 'active' && item.auditStatus === 'approved').length,
      pendingJobReviews: jobs.filter((item) => item.auditStatus === 'pending').length,
      totalApplications: applications.length,
      openTickets: tickets.filter((item) => ['open', 'in_progress'].includes(item.status)).length,
      disputedSettlements: settlements.filter((item) => item.status === 'disputed').length,
      totalSettlementAmount: totalSettlementAmount.toFixed(2)
    },
    distributions: {
      userRoles: countBy(users, (item) => item.role, ['student', 'employer', 'admin']),
      userStatuses: countBy(users, (item) => item.status, ['active', 'inactive', 'banned']),
      jobAuditStatuses: countBy(jobs, (item) => item.auditStatus, ['pending', 'approved', 'rejected']),
      applicationStages: countBy(
        applications,
        (item) => normalizeApplicationStage(item.applicationStage),
        ['new', 'screening', 'interview_shortlist', 'interview_confirmed', 'rejected_pool', 'archived']
      ),
      ticketStatuses: countBy(tickets, (item) => item.status, ['open', 'in_progress', 'resolved', 'rejected']),
      settlementStatuses: countBy(settlements, (item) => item.status, ['pending', 'paid', 'disputed']),
      verificationStatuses: countBy(verifications, (item) => item.status, ['pending', 'approved', 'rejected'])
    },
    trends: {
      userRegistrations: fillDateBuckets(users, 'createdAt', 7),
      jobPosts: fillDateBuckets(jobs, 'createdAt', 7),
      applications: fillDateBuckets(applications, 'appliedAt', 7),
      tickets: fillDateBuckets(tickets, 'createdAt', 7)
    }
  };
};

const exportUsers = async () => {
  const users = await User.findAll({
    attributes: ['id', 'username', 'email', 'phone', 'role', 'status', 'creditScore', 'createdAt', 'lastLoginAt'],
    order: [['createdAt', 'DESC']]
  });

  return {
    filename: `users-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: [
      { key: 'id', label: '用户ID' },
      { key: 'username', label: '用户名' },
      { key: 'email', label: '邮箱' },
      { key: 'phone', label: '手机号' },
      { key: 'role', label: '角色' },
      { key: 'status', label: '状态' },
      { key: 'creditScore', label: '信用分' },
      { key: 'createdAt', label: '注册时间' },
      { key: 'lastLoginAt', label: '最近登录' }
    ],
    rows: users.map((user) => user.toJSON())
  };
};

const exportJobs = async () => {
  const jobs = await Job.findAll({
    attributes: [
      'id', 'title', 'category', 'jobType', 'workLocation', 'salary',
      'salaryType', 'status', 'auditStatus', 'applicationsCount', 'createdAt'
    ],
    include: [
      {
        model: User,
        as: 'employer',
        attributes: ['id', 'username', 'email']
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  return {
    filename: `jobs-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: [
      { key: 'id', label: '岗位ID' },
      { key: 'title', label: '岗位名称' },
      { key: 'employerName', label: '企业账号' },
      { key: 'category', label: '岗位类别' },
      { key: 'jobType', label: '工作类型' },
      { key: 'workLocation', label: '办公形式' },
      { key: 'salary', label: '薪资' },
      { key: 'salaryType', label: '薪资类型' },
      { key: 'status', label: '岗位状态' },
      { key: 'auditStatus', label: '审核状态' },
      { key: 'applicationsCount', label: '投递人数' },
      { key: 'createdAt', label: '发布时间' }
    ],
    rows: jobs.map((job) => ({
      ...job.toJSON(),
      employerName: job.employer?.username || ''
    }))
  };
};

const exportApplications = async () => {
  const applications = await Application.findAll({
    attributes: ['id', 'status', 'applicationStage', 'appliedAt', 'reviewedAt', 'notes'],
    include: [
      {
        model: User,
        as: 'student',
        attributes: ['id', 'username', 'email']
      },
      {
        model: Job,
        as: 'job',
        attributes: ['id', 'title']
      }
    ],
    order: [['appliedAt', 'DESC']]
  });

  return {
    filename: `applications-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: [
      { key: 'id', label: '投递ID' },
      { key: 'studentName', label: '学生账号' },
      { key: 'studentEmail', label: '学生邮箱' },
      { key: 'jobTitle', label: '岗位名称' },
      { key: 'status', label: '结果状态' },
      { key: 'applicationStage', label: '流程阶段' },
      { key: 'appliedAt', label: '投递时间' },
      { key: 'reviewedAt', label: '处理时间' },
      { key: 'notes', label: '备注' }
    ],
    rows: applications.map((application) => ({
      ...application.toJSON(),
      studentName: application.student?.username || '',
      studentEmail: application.student?.email || '',
      jobTitle: application.job?.title || ''
    }))
  };
};

const exportVerifications = async () => {
  const verifications = await Verification.findAll({
    attributes: ['id', 'companyName', 'licenseNumber', 'status', 'submittedAt', 'reviewedAt'],
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }
    ],
    order: [['submittedAt', 'DESC']]
  });

  return {
    filename: `verifications-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: [
      { key: 'id', label: '认证ID' },
      { key: 'companyName', label: '企业名称' },
      { key: 'licenseNumber', label: '营业执照号' },
      { key: 'userName', label: '企业账号' },
      { key: 'userEmail', label: '企业邮箱' },
      { key: 'status', label: '认证状态' },
      { key: 'submittedAt', label: '提交时间' },
      { key: 'reviewedAt', label: '审核时间' }
    ],
    rows: verifications.map((verification) => ({
      ...verification.toJSON(),
      userName: verification.user?.username || '',
      userEmail: verification.user?.email || ''
    }))
  };
};

const exportSettlements = async () => {
  const settlements = await Settlement.findAll({
    attributes: ['id', 'amount', 'salaryType', 'status', 'notes', 'createdAt', 'paidAt'],
    include: [
      {
        model: Job,
        as: 'job',
        attributes: ['id', 'title']
      },
      {
        model: User,
        as: 'student',
        attributes: ['id', 'username']
      },
      {
        model: User,
        as: 'employer',
        attributes: ['id', 'username']
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  return {
    filename: `settlements-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: [
      { key: 'id', label: '结算ID' },
      { key: 'jobTitle', label: '岗位名称' },
      { key: 'studentName', label: '学生账号' },
      { key: 'employerName', label: '企业账号' },
      { key: 'amount', label: '金额' },
      { key: 'salaryType', label: '薪资类型' },
      { key: 'status', label: '结算状态' },
      { key: 'notes', label: '备注' },
      { key: 'createdAt', label: '创建时间' },
      { key: 'paidAt', label: '完成时间' }
    ],
    rows: settlements.map((settlement) => ({
      ...settlement.toJSON(),
      amount: formatAmount(settlement.amount),
      jobTitle: settlement.job?.title || '',
      studentName: settlement.student?.username || '',
      employerName: settlement.employer?.username || ''
    }))
  };
};

const exportTickets = async () => {
  const tickets = await Ticket.findAll({
    attributes: ['id', 'title', 'type', 'priority', 'status', 'sourceRole', 'createdAt', 'resolvedAt'],
    include: [
      {
        model: User,
        as: 'submitter',
        attributes: ['id', 'username']
      },
      {
        model: User,
        as: 'assignee',
        attributes: ['id', 'username']
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  return {
    filename: `tickets-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: [
      { key: 'id', label: '工单ID' },
      { key: 'title', label: '标题' },
      { key: 'type', label: '工单类型' },
      { key: 'priority', label: '优先级' },
      { key: 'status', label: '状态' },
      { key: 'sourceRole', label: '来源角色' },
      { key: 'submitterName', label: '提交人' },
      { key: 'assigneeName', label: '处理人' },
      { key: 'createdAt', label: '提交时间' },
      { key: 'resolvedAt', label: '处理时间' }
    ],
    rows: tickets.map((ticket) => ({
      ...ticket.toJSON(),
      submitterName: ticket.submitter?.username || '',
      assigneeName: ticket.assignee?.username || ''
    }))
  };
};

const exportHandlers = {
  users: exportUsers,
  jobs: exportJobs,
  applications: exportApplications,
  verifications: exportVerifications,
  settlements: exportSettlements,
  tickets: exportTickets
};

exports.getOverview = async (_req, res) => {
  try {
    const data = await getOverviewPayload();

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get admin report overview error:', error);
    return res.status(500).json({
      success: false,
      message: '获取运营报表失败'
    });
  }
};

exports.exportResource = async (req, res) => {
  try {
    const resource = String(req.query.resource || '').trim();

    if (!REPORT_RESOURCES.has(resource)) {
      return res.status(400).json({
        success: false,
        message: '不支持的导出资源类型'
      });
    }

    const exporter = exportHandlers[resource];
    const result = await exporter();

    await createAdminOperationLog({
      adminId: req.user.id,
      actionType: 'report_export',
      targetType: 'report',
      summary: `导出数据：${resource}`,
      detail: `管理员导出了 ${resource} 数据报表。`,
      metadata: { resource },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return sendCsv(res, result.filename, result.headers, result.rows);
  } catch (error) {
    console.error('Export admin report error:', error);
    return res.status(500).json({
      success: false,
      message: '导出报表失败'
    });
  }
};
