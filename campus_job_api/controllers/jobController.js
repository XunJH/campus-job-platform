const { Op } = require('sequelize');
const Job = require('../models/Job');
const User = require('../models/User');
const { Verification } = require('../models');

// 发布岗位
exports.createJob = async (req, res) => {
  try {
    // 检查用户角色是否为 employer
    if (req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: '只有企业用户可以发布岗位'
      });
    }

    // 检查企业是否已完成认证
    const verification = await Verification.findOne({
      where: { userId: req.user.id, status: 'approved' }
    });
    if (!verification) {
      return res.status(403).json({
        success: false,
        message: '请先完成企业认证后再发布岗位'
      });
    }

    // 从请求体获取岗位数据
    const {
      title,
      description,
      requirements,
      salary,
      location,
      jobType,
      salaryType,
      workingHours,
      deadline
    } = req.body;

    // 验证必填字段
    if (!title || !description || !requirements || !salary || !location || !jobType) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段'
      });
    }

    // 创建岗位（默认待审核）
    const job = await Job.create({
      title,
      description,
      requirements,
      salary,
      location,
      jobType,
      salaryType: salaryType || 'monthly',
      workingHours,
      deadline: deadline ? new Date(deadline) : null,
      employerId: req.user.id,
      auditStatus: 'pending'
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

// 获取岗位列表
exports.getJobs = async (req, res) => {
  try {
    let { page = 1, limit = 10, title } = req.query;
    limit = Math.min(parseInt(limit) || 10, 100);
    page = parseInt(page) || 1;
    const offset = (page - 1) * limit;

    // 构建查询条件
    const where = {};
    if (title) {
      where.title = { [Op.like]: `%${title}%` };
    }

    // 非管理员只能看到审核通过的岗位
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin || req.query.auditStatus === undefined) {
      where.auditStatus = 'approved';
    } else if (req.query.auditStatus) {
      where.auditStatus = req.query.auditStatus;
    }

    // 查询岗位列表（分页）
    const { rows: jobs, count } = await Job.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'employer',
        attributes: ['id', 'username', 'email', 'avatar', 'bio']
      }]
    });

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
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

// 获取岗位详情
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    // 查询岗位详情，包含企业信息
    const job = await Job.findByPk(id, {
      include: [{
        model: User,
        as: 'employer',
        attributes: ['id', 'username', 'email', 'avatar', 'bio']
      }]
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: '岗位不存在'
      });
    }

    // 增加浏览次数
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

// 更新岗位
exports.updateJob = async (req, res) => {
  try {
    // 检查用户角色是否为 employer 或 admin
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '只有企业用户可以修改岗位'
      });
    }

    const { id } = req.params;
    const {
      title,
      description,
      requirements,
      salary,
      location,
      jobType,
      salaryType,
      workingHours,
      deadline,
      status
    } = req.body;

    // 查找岗位
    const job = await Job.findByPk(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: '岗位不存在'
      });
    }

    // 检查是否为发布该岗位的企业（admin 可操作所有岗位）
    if (req.user.role !== 'admin' && job.employerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '您没有权限修改此岗位'
      });
    }

    // 更新岗位信息
    await job.update({
      title,
      description,
      requirements,
      salary,
      location,
      jobType,
      salaryType,
      workingHours,
      deadline: deadline ? new Date(deadline) : job.deadline,
      status: status !== undefined ? status : job.status
    });

    // 重新获取更新后的岗位数据（包含关联信息）
    const updatedJob = await Job.findByPk(id, {
      include: [{
        model: User,
        as: 'employer',
        attributes: ['id', 'username', 'email', 'avatar', 'bio']
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

// 删除岗位
exports.deleteJob = async (req, res) => {
  try {
    // 检查用户角色是否为 employer 或 admin
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '只有企业用户可以删除岗位'
      });
    }

    const { id } = req.params;

    // 查找岗位
    const job = await Job.findByPk(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: '岗位不存在'
      });
    }

    // 检查是否为发布该岗位的企业（admin 可删除所有岗位）
    if (req.user.role !== 'admin' && job.employerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '您没有权限删除此岗位'
      });
    }

    // 删除岗位
    await job.destroy();

    res.json({
      success: true,
      message: '岗位删除成功'
    });
  } catch (error) {
    console.error('删除岗位错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 获取我发布的岗位（企业端）
exports.getMyJobs = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    limit = Math.min(parseInt(limit) || 10, 100);
    page = parseInt(page) || 1;
    const offset = (page - 1) * limit;

    const { rows: jobs, count } = await Job.findAndCountAll({
      where: { employerId: req.user.id },
      offset,
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
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

// 获取待审核岗位列表（管理员）
exports.getPendingJobs = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    limit = Math.min(parseInt(limit) || 10, 100);
    page = parseInt(page) || 1;
    const offset = (page - 1) * limit;

    const { rows: jobs, count } = await Job.findAndCountAll({
      where: { auditStatus: 'pending' },
      offset,
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'employer',
        attributes: ['id', 'username', 'email', 'avatar', 'bio']
      }]
    });

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
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

// 审核通过岗位
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

// 审核拒绝岗位
exports.rejectJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const job = await Job.findByPk(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: '岗位不存在'
      });
    }

    await job.update({
      auditStatus: 'rejected',
      rejectionReason: reason || '不符合发布要求',
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

// 获取企业统计数据（岗位数、招聘列表等）
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
      attributes: ['id', 'title', 'location', 'salary', 'status', 'auditStatus', 'createdAt', 'views', 'applicationsCount']
    });

    res.json({
      success: true,
      data: {
        activeJobsCount,
        totalJobsCount,
        recentJobs
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
