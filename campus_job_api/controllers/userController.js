const { User, Job, Application, Bookmark, Verification, sequelize } = require('../models');

// 敏感字段脱敏辅助函数
function maskSensitive(user) {
  const u = user.toJSON ? user.toJSON() : user;
  if (u.phone) u.phone = u.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  if (u.email) u.email = u.email.replace(/(.{2}).+(@.+)/, '$1****$2');
  return u;
}

// 获取用户列表
exports.getUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    limit = Math.min(parseInt(limit) || 10, 100);
    page = parseInt(page) || 1;
    const offset = (page - 1) * limit;

    // 查询用户列表（分页）
    const { rows: users, count } = await User.findAndCountAll({
      offset,
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']],
      attributes: {
        exclude: ['password']
      }
    });

    res.json({
      success: true,
      users: users.map(maskSensitive),
      total: count
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 获取用户详情
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // 查询用户详情
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

    res.json({
      success: true,
      user: maskSensitive(user)
    });
  } catch (error) {
    console.error('获取用户详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 更新用户状态
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 禁止管理员修改自己的状态
    if (parseInt(id, 10) === req.user.id) {
      return res.status(403).json({
        success: false,
        message: '不能修改自己的状态'
      });
    }

    const result = await sequelize.transaction(async (t) => {
      // 查找用户并加锁
      const user = await User.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });

      if (!user) {
        return { error: { status: 404, message: '用户不存在' } };
      }

      // 如果要封禁/禁用管理员，需确保不是最后一个活跃管理员
      if (user.role === 'admin' && status !== 'active') {
        const activeAdminCount = await User.count({
          where: { role: 'admin', status: 'active' },
          transaction: t,
          lock: t.LOCK.UPDATE
        });
        if (activeAdminCount <= 1) {
          return { error: { status: 400, message: '系统中必须保留至少一个活跃的管理员账号' } };
        }
      }

      // 更新用户状态
      await user.update({ status }, { transaction: t });

      const updatedUser = await User.findByPk(id, {
        attributes: { exclude: ['password'] },
        transaction: t
      });

      return { user: updatedUser };
    });

    if (result.error) {
      return res.status(result.error.status).json({
        success: false,
        message: result.error.message
      });
    }

    res.json({
      success: true,
      user: maskSensitive(result.user)
    });
  } catch (error) {
    console.error('更新用户状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 删除用户
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 禁止管理员删除自己
    if (parseInt(id, 10) === req.user.id) {
      return res.status(403).json({
        success: false,
        message: '不能删除自己的账号'
      });
    }

    await sequelize.transaction(async (t) => {
      // 查找用户并加锁
      const user = await User.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });

      if (!user) {
        throw { status: 404, message: '用户不存在' };
      }

      // 如果要删除管理员，需确保删除后至少保留一个活跃管理员
      if (user.role === 'admin' && user.status === 'active') {
        const activeAdminCount = await User.count({
          where: { role: 'admin', status: 'active', id: { [require('sequelize').Op.ne]: user.id } },
          transaction: t,
          lock: t.LOCK.UPDATE
        });
        if (activeAdminCount < 1) {
          throw { status: 400, message: '系统中必须保留至少一个活跃的管理员账号' };
        }
      }

      // 级联删除：先删除该雇主所有岗位下的申请和收藏，再删除岗位
      const jobs = await Job.findAll({ where: { employerId: user.id }, transaction: t });
      for (const job of jobs) {
        await Application.destroy({ where: { jobId: job.id }, transaction: t });
        await Bookmark.destroy({ where: { jobId: job.id }, transaction: t });
      }
      await Job.destroy({ where: { employerId: user.id }, transaction: t });

      // 删除该学生相关的申请和收藏
      await Application.destroy({ where: { studentId: user.id }, transaction: t });
      await Bookmark.destroy({ where: { studentId: user.id }, transaction: t });

      // 删除认证记录
      await Verification.destroy({ where: { userId: user.id }, transaction: t });

      // 删除用户
      await user.destroy({ transaction: t });
    });

    res.json({
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
    console.error('删除用户错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
