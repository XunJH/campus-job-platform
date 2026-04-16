const { User, Job, Application, Bookmark, Verification } = require('../models');

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
      users,
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
      user
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

    // 查找用户
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 如果要封禁/禁用管理员，需确保不是最后一个活跃管理员
    if (user.role === 'admin' && status !== 'active') {
      const activeAdminCount = await User.count({
        where: { role: 'admin', status: 'active' }
      });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: '系统中必须保留至少一个活跃的管理员账号'
        });
      }
    }

    // 更新用户状态
    await user.update({ status });

    // 返回更新后的用户信息（不包含密码）
    const updatedUser = await User.findByPk(id, {
      attributes: {
        exclude: ['password']
      }
    });

    res.json({
      success: true,
      user: updatedUser
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

    // 查找用户
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 如果要删除管理员，需确保不是最后一个活跃管理员
    if (user.role === 'admin') {
      const activeAdminCount = await User.count({
        where: { role: 'admin', status: 'active' }
      });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: '系统中必须保留至少一个活跃的管理员账号'
        });
      }
    }

    // 删除关联数据
    await Job.destroy({ where: { employerId: user.id } });
    await Application.destroy({ where: { studentId: user.id } });
    await Bookmark.destroy({ where: { studentId: user.id } });
    await Verification.destroy({ where: { userId: user.id } });

    // 删除用户
    await user.destroy();

    res.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
