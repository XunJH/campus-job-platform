const { Op } = require('sequelize');
const { AdminOperationLog, User } = require('../models');

exports.getAdminOperationLogs = async (req, res) => {
  try {
    let { page = 1, limit = 10, actionType, targetType, adminId, search } = req.query;
    page = parseInt(page, 10) || 1;
    limit = Math.min(parseInt(limit, 10) || 10, 100);
    const offset = (page - 1) * limit;

    const where = {};

    if (actionType) {
      where.actionType = actionType;
    }

    if (targetType) {
      where.targetType = targetType;
    }

    if (adminId) {
      where.adminId = parseInt(adminId, 10);
    }

    if (search && search.trim()) {
      where[Op.or] = [
        { summary: { [Op.like]: `%${search.trim()}%` } },
        { detail: { [Op.like]: `%${search.trim()}%` } }
      ];
    }

    const { rows, count } = await AdminOperationLog.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'admin',
        attributes: ['id', 'username', 'email', 'role']
      }],
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });

    const actionTypeSummary = await AdminOperationLog.findAll({
      attributes: [
        [AdminOperationLog.sequelize.col('action_type'), 'actionType'],
        [AdminOperationLog.sequelize.fn('COUNT', AdminOperationLog.sequelize.col('action_type')), 'count']
      ],
      group: ['action_type'],
      raw: true
    });

    return res.json({
      success: true,
      data: {
        logs: rows,
        actionTypeSummary,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit) || 1
        }
      }
    });
  } catch (error) {
    console.error('Get admin operation logs error:', error);
    return res.status(500).json({
      success: false,
      message: '获取管理员操作日志失败'
    });
  }
};
