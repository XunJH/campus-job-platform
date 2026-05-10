const { Op } = require('sequelize');
const Job = require('../models/Job');
const User = require('../models/User');
const { sequelize, Verification, Application, Bookmark, Conversation, ConversationMessage, ConversationParticipantState, Settlement } = require('../models');
const { checkFraud } = require('../services/aiService');
const { sanitizeFields, sanitizeText } = require('../utils/sanitize');

const VALID_SALARY_TYPES = ['hourly', 'daily', 'weekly', 'monthly'];
const VALID_WORK_LOCATIONS = ['on_campus', 'remote', 'hybrid'];
const VALID_CATEGORIES = ['技术类', '教学类', '配送类', '营销类', '其他'];
const VALID_APPLICATION_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'];
const VALID_SETTLEMENT_STATUSES = ['pending', 'paid', 'disputed'];

const ADMIN_STATUS_TRANSITIONS = {
  draft: ['active', 'closed'],
  active: ['closed'],
  closed: ['active'],
  cancelled: []
};

const EMPLOYER_STATUS_TRANSITIONS = {
  draft: [],
  active: ['closed'],
  closed: ['active'],
  cancelled: []
};

const parsePagination = (pageValue, limitValue, maxLimit = 100) => {
  const page = Math.max(parseInt(pageValue, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(limitValue, 10) || 10, 1), maxLimit);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit)
});

const validateSalary = (salary) => {
  const numericSalary = parseFloat(salary);
  if (Number.isNaN(numericSalary) || numericSalary < 0 || numericSalary > 10000000) {
    return null;
  }
  return numericSalary;
};

const sanitizeJobTextFields = (fields) => sanitizeFields(
  fields,
  ['title', 'description', 'requirements', 'location', 'workingHours']
);

const canViewUnapprovedJob = (user, job) => Boolean(
  user && (user.role === 'admin' || user.id === job.employerId)
);

const serializeRequirements = (requirements) => {
  if (Array.isArray(requirements)) {
    return requirements;
  }

  if (typeof requirements === 'string') {
    return requirements
      .split(/\r?\n|,|，/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
};

const employerPublicAttributes = ['id', 'username', 'avatar', 'bio'];
const employerAdminAttributes = ['id', 'username', 'email', 'avatar', 'bio'];
const studentApplicationAttributes = [
  'id',
  'username',
  'email',
  'phone',
  'avatar',
  'bio',
  'creditScore',
  'personalityProfileCompletedAt'
];

const settlementJobAttributes = [
  'id',
  'title',
  'location',
  'salary',
  'salaryType',
  'status',
  'auditStatus'
];

const settlementStudentAttributes = [
  'id',
  'username',
  'email',
  'phone',
  'avatar'
];

const settlementEmployerAttributes = ['id', 'username', 'email'];

const settlementInclude = [
  {
    model: Application,
    as: 'application',
    attributes: ['id', 'status', 'appliedAt', 'reviewedAt', 'notes']
  },
  {
    model: Job,
    as: 'job',
    attributes: settlementJobAttributes
  },
  {
    model: User,
    as: 'student',
    attributes: settlementStudentAttributes
  },
  {
    model: User,
    as: 'employer',
    attributes: settlementEmployerAttributes
  },
  {
    model: User,
    as: 'processor',
    attributes: ['id', 'username']
  }
];

const buildSettlementStatusSummary = (settlements) => settlements.reduce((summary, settlement) => {
  summary.total += 1;
  if (summary[settlement.status] !== undefined) {
    summary[settlement.status] += 1;
  }
  return summary;
}, {
  total: 0,
  pending: 0,
  paid: 0,
  disputed: 0
});

const ensureSettlementForApprovedApplication = async (application, transaction) => {
  if (!application || !application.job || application.status !== 'approved') {
    return null;
  }

  const settlementPayload = {
    applicationId: application.id,
    jobId: application.job.id,
    studentId: application.studentId,
    employerId: application.job.employerId,
    amount: application.job.salary || 0,
    salaryType: application.job.salaryType || 'monthly',
    status: 'pending',
    notes: application.notes || null,
    paidAt: null,
    paidBy: null
  };

  const existingSettlement = await Settlement.findOne({
    where: { applicationId: application.id },
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (existingSettlement) {
    await existingSettlement.update(settlementPayload, { transaction });
    return existingSettlement;
  }

  return Settlement.create(settlementPayload, { transaction });
};

const buildConversationPreview = (coverLetter, hasResume) => {
  if (coverLetter) {
    return sanitizeText(coverLetter).slice(0, 120);
  }

  if (hasResume) {
    return '已发送简历图片';
  }

  return '已发起岗位沟通';
};

const createApplicationConversation = async ({
  application,
  student,
  job,
  coverLetter,
  resumeUrl,
  transaction
}) => {
  const preview = buildConversationPreview(coverLetter, Boolean(resumeUrl));
  const now = new Date();
  const conversation = await Conversation.create({
    applicationId: application.id,
    jobId: job.id,
    studentId: student.id,
    employerId: job.employerId,
    lastMessagePreview: preview,
    lastMessageAt: now
  }, { transaction });

  let initialUnreadCount = 0;
  let lastMessageAt = now;

  if (resumeUrl) {
    const resumeMessage = await ConversationMessage.create({
      conversationId: conversation.id,
      senderId: student.id,
      senderRole: 'student',
      messageType: 'resume',
      content: `${student.username} 已投递该岗位，并发送了简历图片。`,
      attachmentUrl: resumeUrl
    }, { transaction });
    lastMessageAt = resumeMessage.createdAt;
    initialUnreadCount += 1;
  }

  if (coverLetter) {
    const coverLetterMessage = await ConversationMessage.create({
      conversationId: conversation.id,
      senderId: student.id,
      senderRole: 'student',
      messageType: 'text',
      content: coverLetter
    }, { transaction });
    lastMessageAt = coverLetterMessage.createdAt;
    initialUnreadCount += 1;
  } else if (!resumeUrl) {
    const systemMessage = await ConversationMessage.create({
      conversationId: conversation.id,
      senderId: student.id,
      senderRole: 'student',
      messageType: 'system',
      content: `${student.username} 已投递该岗位。`
    }, { transaction });
    lastMessageAt = systemMessage.createdAt;
    initialUnreadCount += 1;
  }

  await conversation.update({ lastMessageAt }, { transaction });

  await ConversationParticipantState.bulkCreate([
    {
      conversationId: conversation.id,
      userId: student.id,
      role: 'student',
      unreadCount: 0,
      lastReadAt: lastMessageAt
    },
    {
      conversationId: conversation.id,
      userId: job.employerId,
      role: 'employer',
      unreadCount: initialUnreadCount,
      lastReadAt: null
    }
  ], { transaction });

  return conversation;
};

exports.createJob = async (req, res) => {
  try {
    if (req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: '只有企业用户可以发布岗位'
      });
    }

    const verification = await Verification.findOne({
      where: { userId: req.user.id, status: 'approved' }
    });

    if (!verification) {
      return res.status(403).json({
        success: false,
        message: '请先完成企业认证后再发布岗位'
      });
    }

    let {
      title,
      description,
      requirements,
      salary,
      location,
      workLocation,
      category,
      jobType,
      salaryType,
      workingHours,
      deadline
    } = req.body;

    if (!title || !description || !requirements || !salary || !location || !jobType) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段'
      });
    }

    const numericSalary = validateSalary(salary);
    if (numericSalary === null) {
      return res.status(400).json({
        success: false,
        message: '薪资格式不正确或超出合理范围'
      });
    }

    if (deadline && new Date(deadline) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: '截止日期必须晚于当前时间'
      });
    }

    if (salaryType && !VALID_SALARY_TYPES.includes(salaryType)) {
      return res.status(400).json({
        success: false,
        message: '薪资类型不合法'
      });
    }

    if (workLocation && !VALID_WORK_LOCATIONS.includes(workLocation)) {
      return res.status(400).json({
        success: false,
        message: '工作地点类型不合法'
      });
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: '岗位类别不合法'
      });
    }

    ({
      title,
      description,
      requirements,
      location,
      workingHours
    } = sanitizeJobTextFields({ title, description, requirements, location, workingHours }));

    const job = await Job.create({
      title,
      description,
      requirements,
      salary: numericSalary,
      location,
      workLocation: workLocation || 'on_campus',
      category: category || '其他',
      jobType,
      salaryType: salaryType || 'monthly',
      workingHours,
      deadline: deadline ? new Date(deadline) : null,
      employerId: req.user.id,
      status: 'draft',
      auditStatus: 'pending'
    });

    checkFraud({
      jobId: String(job.id),
      title,
      company: verification.companyName || req.user.username,
      salary: String(salary),
      description,
      requirements: serializeRequirements(requirements)
    })
      .then(async (fraudResult) => {
        if (fraudResult) {
          await job.update({ fraudCheckResult: fraudResult });
        }
      })
      .catch((error) => {
        console.error('AI fraud check failed:', error);
      });

    res.status(201).json({
      success: true,
      message: '岗位发布成功',
      data: job
    });
  } catch (error) {
    console.error('创建岗位错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.getJobs = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query.page, req.query.limit);
    const {
      title,
      minSalary,
      workLocation,
      category,
      jobType,
      salaryType,
      auditStatus,
      status
    } = req.query;

    const where = {};
    const isAdmin = req.user && req.user.role === 'admin';

    if (title) {
      where.title = { [Op.like]: `%${title}%` };
    }

    if (minSalary) {
      where.salary = { [Op.gte]: parseFloat(minSalary) };
    }

    if (workLocation) {
      where.workLocation = workLocation;
    }

    if (category) {
      const categories = category.split(',').map(item => item.trim()).filter(Boolean);
      where.category = categories.length > 1 ? { [Op.in]: categories } : categories[0];
    }

    if (jobType) {
      where.jobType = jobType;
    }

    if (salaryType) {
      const salaryTypes = salaryType.split(',').map(item => item.trim()).filter(Boolean);
      where.salaryType = salaryTypes.length > 1 ? { [Op.in]: salaryTypes } : salaryTypes[0];
    }

    if (status) {
      where.status = status;
    }

    if (isAdmin) {
      if (auditStatus) {
        where.auditStatus = auditStatus;
      }
    } else {
      where.auditStatus = 'approved';
    }

    const { rows: jobs, count } = await Job.findAndCountAll({
      where,
      offset,
      limit,
      distinct: true,
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'employer',
        attributes: isAdmin ? employerAdminAttributes : employerPublicAttributes
      }]
    });

    res.json({
      success: true,
      data: {
        jobs,
        pagination: buildPagination(page, limit, count)
      }
    });
  } catch (error) {
    console.error('获取岗位列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findByPk(id, {
      include: [{
        model: User,
        as: 'employer',
        attributes: req.user && req.user.role === 'admin' ? employerAdminAttributes : employerPublicAttributes
      }]
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: '岗位不存在'
      });
    }

    if (job.auditStatus !== 'approved' && !canViewUnapprovedJob(req.user, job)) {
      return res.status(403).json({
        success: false,
        message: '该岗位尚未公开'
      });
    }

    await job.increment('views');

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('获取岗位详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.updateJob = async (req, res) => {
  try {
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '只有企业用户或管理员可以修改岗位'
      });
    }

    const { id } = req.params;
    let {
      title,
      description,
      requirements,
      salary,
      location,
      workLocation,
      category,
      jobType,
      salaryType,
      workingHours,
      deadline,
      status
    } = req.body;

    const job = await Job.findByPk(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: '岗位不存在'
      });
    }

    if (req.user.role !== 'admin' && job.employerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '您没有权限修改此岗位'
      });
    }

    if (status !== undefined) {
      if (req.user.role === 'admin') {
        if (!ADMIN_STATUS_TRANSITIONS[job.status] || !ADMIN_STATUS_TRANSITIONS[job.status].includes(status)) {
          return res.status(400).json({
            success: false,
            message: '不允许的岗位状态变更'
          });
        }
      } else {
        if (job.auditStatus !== 'approved') {
          return res.status(400).json({
            success: false,
            message: '只有审核通过的岗位才允许开启或关闭招聘'
          });
        }

        if (!EMPLOYER_STATUS_TRANSITIONS[job.status] || !EMPLOYER_STATUS_TRANSITIONS[job.status].includes(status)) {
          return res.status(400).json({
            success: false,
            message: '企业只能在 active 和 closed 之间切换岗位状态'
          });
        }
      }
    }

    let numericSalary = job.salary;
    if (salary !== undefined) {
      numericSalary = validateSalary(salary);
      if (numericSalary === null) {
        return res.status(400).json({
          success: false,
          message: '薪资格式不正确或超出合理范围'
        });
      }
    }

    if (deadline && new Date(deadline) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: '截止日期必须晚于当前时间'
      });
    }

    if (salaryType && !VALID_SALARY_TYPES.includes(salaryType)) {
      return res.status(400).json({
        success: false,
        message: '薪资类型不合法'
      });
    }

    if (workLocation && !VALID_WORK_LOCATIONS.includes(workLocation)) {
      return res.status(400).json({
        success: false,
        message: '工作地点类型不合法'
      });
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: '岗位类别不合法'
      });
    }

    ({
      title,
      description,
      requirements,
      location,
      workingHours
    } = sanitizeJobTextFields({ title, description, requirements, location, workingHours }));

    const payload = {
      salary: numericSalary,
      workLocation: workLocation !== undefined ? workLocation : job.workLocation,
      category: category !== undefined ? category : job.category,
      salaryType: salaryType || job.salaryType,
      deadline: deadline ? new Date(deadline) : job.deadline,
      status: status !== undefined ? status : job.status
    };

    if (title !== undefined) payload.title = title;
    if (description !== undefined) payload.description = description;
    if (requirements !== undefined) payload.requirements = requirements;
    if (location !== undefined) payload.location = location;
    if (jobType !== undefined) payload.jobType = jobType;
    if (workingHours !== undefined) payload.workingHours = workingHours;

    await job.update(payload);

    const updatedJob = await Job.findByPk(id, {
      include: [{
        model: User,
        as: 'employer',
        attributes: employerAdminAttributes
      }]
    });

    res.json({
      success: true,
      message: '岗位更新成功',
      data: updatedJob
    });
  } catch (error) {
    console.error('更新岗位错误:', error);
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '只有企业用户或管理员可以删除岗位'
      });
    }

    const { id } = req.params;

    await sequelize.transaction(async (transaction) => {
      const job = await Job.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!job) {
        const notFoundError = new Error('岗位不存在');
        notFoundError.status = 404;
        throw notFoundError;
      }

      if (req.user.role !== 'admin' && job.employerId !== req.user.id) {
        const permissionError = new Error('您没有权限删除此岗位');
        permissionError.status = 403;
        throw permissionError;
      }

      await Application.destroy({ where: { jobId: id }, transaction });
      await Bookmark.destroy({ where: { jobId: id }, transaction });
      await job.destroy({ transaction });
    });

    res.json({
      success: true,
      message: '岗位删除成功'
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    console.error('删除岗位错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.getMyJobs = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query.page, req.query.limit);
    const { rows: jobs, count } = await Job.findAndCountAll({
      where: { employerId: req.user.id },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        jobs,
        pagination: buildPagination(page, limit, count)
      }
    });
  } catch (error) {
    console.error('获取我的岗位错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.getPendingJobs = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query.page, req.query.limit);
    const { rows: jobs, count } = await Job.findAndCountAll({
      where: { auditStatus: 'pending' },
      offset,
      limit,
      distinct: true,
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'employer',
        attributes: employerAdminAttributes
      }]
    });

    res.json({
      success: true,
      data: {
        jobs,
        pagination: buildPagination(page, limit, count)
      }
    });
  } catch (error) {
    console.error('获取待审核岗位错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.approveJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Job.findByPk(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: '岗位不存在'
      });
    }

    if (job.auditStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该岗位当前状态不允许审核通过'
      });
    }

    await job.update({
      auditStatus: 'approved',
      rejectionReason: null,
      status: 'active'
    });

    res.json({
      success: true,
      message: '岗位审核通过',
      data: job
    });
  } catch (error) {
    console.error('审核通过岗位错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.rejectJob = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = sanitizeText(req.body.reason || '不符合发布要求');
    const job = await Job.findByPk(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: '岗位不存在'
      });
    }

    if (job.auditStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该岗位当前状态不允许审核拒绝'
      });
    }

    await job.update({
      auditStatus: 'rejected',
      rejectionReason: reason,
      status: 'closed'
    });

    res.json({
      success: true,
      message: '岗位审核已拒绝',
      data: job
    });
  } catch (error) {
    console.error('审核拒绝岗位错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.getEmployerStats = async (req, res) => {
  try {
    const employerId = parseInt(req.user.id, 10);

    const activeJobsCount = await Job.count({
      where: { employerId, status: 'active', auditStatus: 'approved' }
    });

    const totalJobsCount = await Job.count({
      where: { employerId }
    });

    const recentJobs = await Job.findAll({
      where: { employerId },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: [
        'id',
        'title',
        'location',
        'salary',
        'status',
        'auditStatus',
        'createdAt',
        'views',
        'applicationsCount'
      ]
    });

    const employerJobs = await Job.findAll({
      where: { employerId },
      attributes: ['id'],
      raw: true
    });

    const employerJobIds = employerJobs.map(item => item.id);
    let totalApplications = 0;
    let pendingApplications = 0;
    let recentApplications = [];

    if (employerJobIds.length > 0) {
      totalApplications = await Application.count({
        where: { jobId: { [Op.in]: employerJobIds } }
      });

      pendingApplications = await Application.count({
        where: {
          jobId: { [Op.in]: employerJobIds },
          status: 'pending'
        }
      });

      recentApplications = await Application.findAll({
        where: { jobId: { [Op.in]: employerJobIds } },
        order: [['appliedAt', 'DESC']],
        limit: 5,
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'username', 'avatar']
          },
          {
            model: Job,
            as: 'job',
            attributes: ['id', 'title']
          }
        ]
      });
    }

    res.json({
      success: true,
      data: {
        activeJobsCount,
        totalJobsCount,
        recentJobs,
        totalApplications,
        pendingApplications,
        recentApplications
      }
    });
  } catch (error) {
    console.error('获取企业统计错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

const applyJobForStudent = async ({
  studentId,
  jobId,
  coverLetter,
  transaction
}) => {
  const job = await Job.findByPk(jobId, {
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (!job) {
    const error = new Error('岗位不存在');
    error.status = 404;
    throw error;
  }

  if (job.auditStatus !== 'approved') {
    const error = new Error('该岗位尚未通过审核');
    error.status = 400;
    throw error;
  }

  if (job.status !== 'active') {
    const error = new Error('该岗位当前不可申请');
    error.status = 400;
    throw error;
  }

  if (job.deadline && new Date(job.deadline) <= new Date()) {
    const error = new Error('该岗位申请已截止');
    error.status = 400;
    throw error;
  }

  const student = await User.findByPk(studentId, {
    attributes: ['id', 'username', 'personalityProfile'],
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (!student) {
    const error = new Error('学生账号不存在');
    error.status = 404;
    throw error;
  }

  const resumeUrl = student.personalityProfile?.resumeImage || null;
  if (!resumeUrl) {
    const error = new Error('请先在个人资料中上传简历图片后再投递');
    error.status = 400;
    throw error;
  }

  const existing = await Application.findOne({
    where: { studentId, jobId },
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (existing) {
    const error = new Error('你已经申请过该岗位');
    error.status = 409;
    throw error;
  }

  const application = await Application.create({
    studentId,
    jobId,
    coverLetter,
    resume: resumeUrl,
    status: 'pending'
  }, { transaction });

  await job.increment('applicationsCount', { by: 1, transaction });

  await createApplicationConversation({
    application,
    student,
    job,
    coverLetter,
    resumeUrl,
    transaction
  });

  return application;
};

exports.applyJob = async (req, res) => {
  try {
    const studentId = parseInt(req.user.id, 10);
    const jobId = parseInt(req.params.id, 10);
    const coverLetter = req.body.coverLetter ? sanitizeText(req.body.coverLetter) : null;

    const result = await sequelize.transaction(async (transaction) => {
      const job = await Job.findByPk(jobId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!job) {
        const error = new Error('岗位不存在');
        error.status = 404;
        throw error;
      }

      if (job.auditStatus !== 'approved') {
        const error = new Error('该岗位尚未通过审核');
        error.status = 400;
        throw error;
      }

      if (job.status !== 'active') {
        const error = new Error('该岗位当前不可申请');
        error.status = 400;
        throw error;
      }

      if (job.deadline && new Date(job.deadline) <= new Date()) {
        const error = new Error('该岗位申请已截止');
        error.status = 400;
        throw error;
      }

      const student = await User.findByPk(studentId, {
        attributes: ['id', 'username', 'personalityProfile'],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!student) {
        const error = new Error('学生账号不存在');
        error.status = 404;
        throw error;
      }

      const resumeUrl = student.personalityProfile?.resumeImage || null;
      if (!resumeUrl) {
        const error = new Error('请先在个人资料中上传简历图片后再投递');
        error.status = 400;
        throw error;
      }

      const existing = await Application.findOne({
        where: { studentId, jobId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (existing) {
        const error = new Error('您已经申请过该岗位');
        error.status = 409;
        throw error;
      }

      const application = await Application.create({
        studentId,
        jobId,
        coverLetter,
        resume: resumeUrl,
        status: 'pending'
      }, { transaction });

      await job.increment('applicationsCount', { by: 1, transaction });

      await createApplicationConversation({
        application,
        student,
        job,
        coverLetter,
        resumeUrl,
        transaction
      });

      return application;
    });

    res.json({
      success: true,
      message: '申请提交成功',
      data: result
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    console.error('申请岗位错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.bulkApplyJobs = async (req, res) => {
  try {
    const studentId = parseInt(req.user.id, 10);
    const coverLetter = req.body.coverLetter ? sanitizeText(req.body.coverLetter) : null;
    const rawJobIds = Array.isArray(req.body.jobIds) ? req.body.jobIds : [];
    const jobIds = [...new Set(rawJobIds
      .map((item) => parseInt(item, 10))
      .filter((item) => !Number.isNaN(item)))];

    if (jobIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请至少选择一个岗位'
      });
    }

    if (jobIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: '单次最多批量投递 100 个岗位'
      });
    }

    const results = [];

    for (const jobId of jobIds) {
      try {
        const application = await sequelize.transaction((transaction) => applyJobForStudent({
          studentId,
          jobId,
          coverLetter,
          transaction
        }));

        results.push({
          jobId,
          status: 'applied',
          message: '投递成功',
          application
        });
      } catch (error) {
        if (error.status) {
          results.push({
            jobId,
            status: 'skipped',
            message: error.message
          });
          continue;
        }

        console.error(`批量投递岗位 ${jobId} 失败:`, error);
        results.push({
          jobId,
          status: 'failed',
          message: '服务器内部错误'
        });
      }
    }

    const successCount = results.filter((item) => item.status === 'applied').length;
    const skippedCount = results.filter((item) => item.status === 'skipped').length;
    const failedCount = results.filter((item) => item.status === 'failed').length;

    return res.json({
      success: true,
      message: '批量投递处理完成',
      data: {
        total: jobIds.length,
        successCount,
        skippedCount,
        failedCount,
        results
      }
    });
  } catch (error) {
    console.error('批量投递岗位错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.checkApplied = async (req, res) => {
  try {
    const studentId = parseInt(req.user.id, 10);
    const jobId = parseInt(req.params.id, 10);

    const application = await Application.findOne({
      where: { studentId, jobId }
    });

    res.json({
      success: true,
      data: {
        applied: Boolean(application),
        status: application ? application.status : null
      }
    });
  } catch (error) {
    console.error('检查申请状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.getMyApplications = async (req, res) => {
  try {
    const studentId = parseInt(req.user.id, 10);

    const applications = await Application.findAll({
      where: { studentId },
      order: [['appliedAt', 'DESC']],
      include: [
        {
          model: Job,
          as: 'job',
          attributes: [
            'id',
            'title',
            'location',
            'salary',
            'salaryType',
            'status',
            'auditStatus',
            'deadline'
          ],
          include: [{
            model: User,
            as: 'employer',
            attributes: ['id', 'username']
          }]
        }
      ]
    });

    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('获取申请列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.withdrawApplication = async (req, res) => {
  try {
    const studentId = parseInt(req.user.id, 10);
    const applicationId = parseInt(req.params.applicationId, 10);

    const application = await Application.findByPk(applicationId, {
      include: [{
        model: Job,
        as: 'job',
        attributes: [
          'id',
          'title',
          'status',
          'auditStatus',
          'location',
          'salary',
          'salaryType',
          'deadline'
        ]
      }]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: '申请记录不存在'
      });
    }

    if (application.studentId !== studentId) {
      return res.status(403).json({
        success: false,
        message: '您无权撤回这条申请'
      });
    }

    if (application.status === 'withdrawn') {
      return res.status(400).json({
        success: false,
        message: '该申请已经撤回'
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '已处理的申请不能撤回'
      });
    }

    await sequelize.transaction(async (transaction) => {
      await application.update({
        status: 'withdrawn'
      }, { transaction });

      if (application.jobId) {
        const job = await Job.findByPk(application.jobId, {
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (job && job.applicationsCount > 0) {
          await job.decrement('applicationsCount', { by: 1, transaction });
        }
      }
    });

    const updatedApplication = await Application.findByPk(applicationId, {
      include: [
        {
          model: Job,
          as: 'job',
          attributes: [
            'id',
            'title',
            'status',
            'auditStatus',
            'location',
            'salary',
            'salaryType',
            'deadline'
          ],
          include: [{
            model: User,
            as: 'employer',
            attributes: ['id', 'username']
          }]
        }
      ]
    });

    return res.json({
      success: true,
      message: '申请已撤回',
      data: updatedApplication
    });
  } catch (error) {
    console.error('撤回申请错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.getReceivedApplications = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query.page, req.query.limit);
    const requestedJobId = req.query.jobId ? parseInt(req.query.jobId, 10) : null;
    const requestedStatus = req.query.status;

    const jobWhere = req.user.role === 'admin' && req.query.employerId
      ? { employerId: parseInt(req.query.employerId, 10) }
      : { employerId: req.user.id };

    if (requestedJobId) {
      jobWhere.id = requestedJobId;
    }

    const jobs = await Job.findAll({
      where: jobWhere,
      attributes: ['id', 'title', 'status', 'auditStatus', 'applicationsCount'],
      order: [['createdAt', 'DESC']]
    });

    const jobIds = jobs.map(job => job.id);
    if (jobIds.length === 0) {
      return res.json({
        success: true,
        data: {
          applications: [],
          jobs: [],
          summary: {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            withdrawn: 0
          },
          pagination: buildPagination(page, limit, 0)
        }
      });
    }

    const where = {
      jobId: { [Op.in]: jobIds }
    };

    if (requestedStatus && VALID_APPLICATION_STATUSES.includes(requestedStatus)) {
      where.status = requestedStatus;
    }

    const { rows: applications, count } = await Application.findAndCountAll({
      where,
      offset,
      limit,
      distinct: true,
      order: [['appliedAt', 'DESC']],
      include: [
        {
          model: Job,
          as: 'job',
          attributes: [
            'id',
            'title',
            'status',
            'auditStatus',
            'location',
            'salary',
            'salaryType',
            'deadline'
          ]
        },
        {
          model: User,
          as: 'student',
          attributes: studentApplicationAttributes
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'username']
        }
      ]
    });

    const [pending, approved, rejected, withdrawn] = await Promise.all([
      Application.count({ where: { jobId: { [Op.in]: jobIds }, status: 'pending' } }),
      Application.count({ where: { jobId: { [Op.in]: jobIds }, status: 'approved' } }),
      Application.count({ where: { jobId: { [Op.in]: jobIds }, status: 'rejected' } }),
      Application.count({ where: { jobId: { [Op.in]: jobIds }, status: 'withdrawn' } })
    ]);

    res.json({
      success: true,
      data: {
        applications,
        jobs,
        summary: {
          total: pending + approved + rejected + withdrawn,
          pending,
          approved,
          rejected,
          withdrawn
        },
        pagination: buildPagination(page, limit, count)
      }
    });
  } catch (error) {
    console.error('获取企业申请列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.reviewApplication = async (req, res) => {
  try {
    const applicationId = parseInt(req.params.applicationId, 10);
    const nextStatus = req.body.status;
    const notes = req.body.notes ? sanitizeText(req.body.notes) : null;

    if (!['approved', 'rejected'].includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: '申请处理状态只能是 approved 或 rejected'
      });
    }

    const application = await Application.findByPk(applicationId, {
      include: [{
        model: Job,
        as: 'job',
        attributes: ['id', 'title', 'employerId', 'salary', 'salaryType']
      }]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: '申请记录不存在'
      });
    }

    if (req.user.role !== 'admin' && application.job.employerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '您没有权限处理这条申请'
      });
    }

    if (application.status === 'withdrawn') {
      return res.status(400).json({
        success: false,
        message: '该申请已被学生撤回，不能继续处理'
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该申请已处理，请勿重复操作'
      });
    }

    await sequelize.transaction(async (transaction) => {
      await application.update({
        status: nextStatus,
        notes,
        reviewedAt: new Date(),
        reviewedBy: req.user.id
      }, { transaction });

      if (nextStatus === 'approved') {
        await ensureSettlementForApprovedApplication(application, transaction);
      }
    });

    const updatedApplication = await Application.findByPk(applicationId, {
      include: [
        {
          model: Job,
          as: 'job',
          attributes: [
            'id',
            'title',
            'status',
            'auditStatus',
            'location',
            'salary',
            'salaryType',
            'deadline'
          ]
        },
        {
          model: User,
          as: 'student',
          attributes: studentApplicationAttributes
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'username']
        }
      ]
    });

    res.json({
      success: true,
      message: nextStatus === 'approved' ? '申请已通过' : '申请已拒绝',
      data: updatedApplication
    });
  } catch (error) {
    console.error('处理申请错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.getMySettlements = async (req, res) => {
  try {
    const studentId = parseInt(req.user.id, 10);
    const settlements = await Settlement.findAll({
      where: { studentId },
      order: [['createdAt', 'DESC']],
      include: settlementInclude
    });

    return res.json({
      success: true,
      data: {
        settlements,
        summary: buildSettlementStatusSummary(settlements)
      }
    });
  } catch (error) {
    console.error('获取学生结算记录错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.getEmployerSettlements = async (req, res) => {
  try {
    const employerId = parseInt(req.user.id, 10);
    const status = req.query.status;
    const jobId = req.query.jobId ? parseInt(req.query.jobId, 10) : null;

    const where = { employerId };
    if (status && VALID_SETTLEMENT_STATUSES.includes(status)) {
      where.status = status;
    }
    if (jobId) {
      where.jobId = jobId;
    }

    const settlements = await Settlement.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: settlementInclude
    });

    const summaryRows = await Settlement.findAll({
      where: { employerId },
      attributes: ['status'],
      raw: true
    });

    const jobs = await Job.findAll({
      where: { employerId },
      attributes: ['id', 'title', 'status', 'auditStatus'],
      order: [['createdAt', 'DESC']]
    });

    return res.json({
      success: true,
      data: {
        settlements,
        jobs,
        summary: buildSettlementStatusSummary(summaryRows)
      }
    });
  } catch (error) {
    console.error('获取企业结算记录错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.updateSettlementStatus = async (req, res) => {
  try {
    const settlementId = parseInt(req.params.settlementId, 10);
    const nextStatus = req.body.status;
    const notes = req.body.notes ? sanitizeText(req.body.notes) : null;

    if (!VALID_SETTLEMENT_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: '结算状态不合法'
      });
    }

    const settlement = await Settlement.findByPk(settlementId, {
      include: settlementInclude
    });

    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: '结算记录不存在'
      });
    }

    if (req.user.role !== 'admin' && settlement.employerId !== parseInt(req.user.id, 10)) {
      return res.status(403).json({
        success: false,
        message: '您没有权限处理这条结算记录'
      });
    }

    await settlement.update({
      status: nextStatus,
      notes,
      paidAt: nextStatus === 'paid' ? new Date() : null,
      paidBy: nextStatus === 'paid' ? req.user.id : null
    });

    const updatedSettlement = await Settlement.findByPk(settlementId, {
      include: settlementInclude
    });

    return res.json({
      success: true,
      message: nextStatus === 'paid' ? '结算状态已标记为已支付' : '结算状态已更新',
      data: updatedSettlement
    });
  } catch (error) {
    console.error('更新结算状态错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.getAdminSettlements = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query.page, req.query.limit);
    const status = req.query.status;

    const where = {};
    if (status && VALID_SETTLEMENT_STATUSES.includes(status)) {
      where.status = status;
    }

    const { rows: settlements, count } = await Settlement.findAndCountAll({
      where,
      offset,
      limit,
      order: [['createdAt', 'DESC']],
      include: settlementInclude
    });

    const summaryRows = await Settlement.findAll({
      attributes: ['status'],
      raw: true
    });

    return res.json({
      success: true,
      data: {
        settlements,
        summary: buildSettlementStatusSummary(summaryRows),
        pagination: buildPagination(page, limit, count)
      }
    });
  } catch (error) {
    console.error('获取后台结算记录错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.toggleBookmark = async (req, res) => {
  try {
    const studentId = parseInt(req.user.id, 10);
    const jobId = parseInt(req.params.id, 10);

    const job = await Job.findByPk(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: '岗位不存在'
      });
    }

    const existing = await Bookmark.findOne({
      where: { studentId, jobId }
    });

    if (existing) {
      await existing.destroy();
      return res.json({
        success: true,
        message: '已取消收藏',
        data: { bookmarked: false }
      });
    }

    await Bookmark.create({ studentId, jobId });
    return res.json({
      success: true,
      message: '收藏成功',
      data: { bookmarked: true }
    });
  } catch (error) {
    console.error('收藏岗位错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.checkBookmarked = async (req, res) => {
  try {
    const studentId = parseInt(req.user.id, 10);
    const jobId = parseInt(req.params.id, 10);

    const bookmark = await Bookmark.findOne({
      where: { studentId, jobId }
    });

    res.json({
      success: true,
      data: { bookmarked: Boolean(bookmark) }
    });
  } catch (error) {
    console.error('检查收藏状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.getMyBookmarks = async (req, res) => {
  try {
    const studentId = parseInt(req.user.id, 10);

    const bookmarks = await Bookmark.findAll({
      where: { studentId },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Job,
          as: 'job',
          attributes: [
            'id',
            'title',
            'location',
            'salary',
            'salaryType',
            'jobType',
            'status',
            'auditStatus'
          ],
          include: [{
            model: User,
            as: 'employer',
            attributes: ['id', 'username']
          }]
        }
      ]
    });

    res.json({
      success: true,
      data: bookmarks
    });
  } catch (error) {
    console.error('获取收藏列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
