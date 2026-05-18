const { Op } = require('sequelize');
const { User, Job, Application, Bookmark, Verification, sequelize } = require('../models');
const { createAdminOperationLog, createSystemNotification } = require('../services/adminActivityService');

const maskSensitive = (user) => {
  const plain = user.toJSON ? user.toJSON() : { ...user };

  if (plain.phone) {
    plain.phone = plain.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }

  if (plain.email) {
    plain.email = plain.email.replace(/(.{2}).+(@.+)/, '$1****$2');
  }

  return plain;
};

exports.getUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10, search } = req.query;
    page = parseInt(page, 10) || 1;
    limit = Math.min(parseInt(limit, 10) || 10, 100);
    const offset = (page - 1) * limit;

    const where = {};
    if (search && search.trim()) {
      where[Op.or] = [
        { username: { [Op.like]: `%${search.trim()}%` } },
        { email: { [Op.like]: `%${search.trim()}%` } },
        { phone: { [Op.like]: `%${search.trim()}%` } }
      ];
    }

    const { rows: users, count } = await User.findAndCountAll({
      where,
      offset,
      limit,
      order: [['createdAt', 'DESC']],
      attributes: {
        exclude: ['password']
      }
    });

    return res.json({
      success: true,
      users: users.map(maskSensitive),
      total: count
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: {
        exclude: ['password']
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    return res.json({
      success: true,
      user: maskSensitive(user)
    });
  } catch (error) {
    console.error('Get user by id error:', error);
    return res.status(500).json({
      success: false,
      message: '获取用户详情失败'
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const targetId = parseInt(id, 10);

    if (targetId === req.user.id) {
      return res.status(403).json({
        success: false,
        message: '不能修改自己的状态'
      });
    }

    const result = await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(targetId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!user) {
        return { error: { status: 404, message: '用户不存在' } };
      }

      if (user.role === 'admin' && status !== 'active') {
        const activeAdminCount = await User.count({
          where: { role: 'admin', status: 'active' },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (activeAdminCount <= 1) {
          return { error: { status: 400, message: '系统中必须保留至少一个活跃的管理员账号' } };
        }
      }

      await user.update({ status }, { transaction });

      const updatedUser = await User.findByPk(targetId, {
        attributes: { exclude: ['password'] },
        transaction
      });

      return { user: updatedUser };
    });

    if (result.error) {
      return res.status(result.error.status).json({
        success: false,
        message: result.error.message
      });
    }

    await createAdminOperationLog({
      adminId: req.user.id,
      actionType: 'user_status_update',
      targetType: 'user',
      targetId: result.user.id,
      summary: `更新用户状态：${result.user.username || result.user.id} -> ${status}`,
      detail: `管理员将用户状态更新为 ${status}`,
      metadata: {
        status,
        userRole: result.user.role
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await createSystemNotification({
      title: '账户状态更新通知',
      content: `你的平台账户状态已更新为「${status}」。如有疑问，请通过申诉工单联系管理员。`,
      type: 'system',
      targetRole: result.user.role,
      targetUserId: result.user.id,
      senderAdminId: req.user.id,
      relatedUserId: result.user.id,
      actionUrl: result.user.role === 'employer' ? '/employer/tickets' : '/student/tickets'
    });

    return res.json({
      success: true,
      user: maskSensitive(result.user)
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return res.status(500).json({
      success: false,
      message: '更新用户状态失败'
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const targetId = parseInt(id, 10);

    if (targetId === req.user.id) {
      return res.status(403).json({
        success: false,
        message: '不能删除自己的账号'
      });
    }

    const deletedUser = await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(targetId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!user) {
        throw { status: 404, message: '用户不存在' };
      }

      if (user.role === 'admin' && user.status === 'active') {
        const activeAdminCount = await User.count({
          where: {
            role: 'admin',
            status: 'active',
            id: { [Op.ne]: user.id }
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (activeAdminCount < 1) {
          throw { status: 400, message: '系统中必须保留至少一个活跃的管理员账号' };
        }
      }

      const plain = user.toJSON();
      const jobs = await Job.findAll({ where: { employerId: user.id }, transaction });

      for (const job of jobs) {
        await Application.destroy({ where: { jobId: job.id }, transaction });
        await Bookmark.destroy({ where: { jobId: job.id }, transaction });
      }

      await Job.destroy({ where: { employerId: user.id }, transaction });
      await Application.destroy({ where: { studentId: user.id }, transaction });
      await Bookmark.destroy({ where: { studentId: user.id }, transaction });
      await Verification.destroy({ where: { userId: user.id }, transaction });
      await user.destroy({ transaction });

      return plain;
    });

    await createAdminOperationLog({
      adminId: req.user.id,
      actionType: 'user_delete',
      targetType: 'user',
      targetId,
      summary: `删除用户：${deletedUser.username || targetId}`,
      detail: '管理员删除了一个用户账号及其关联数据。',
      metadata: {
        deletedUserId: targetId,
        deletedUserRole: deletedUser.role
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    console.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      message: '删除用户失败'
    });
  }
};
