const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { sanitizeFields } = require('../utils/sanitize');

// JWT Secret - 实际项目中应该从环境变量中读取
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * 生成 JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * 用户注册
 */
exports.register = async (req, res) => {
  try {
    let { username, password, email, role = 'student' } = req.body;
    // 禁止通过注册接口创建管理员账号
    if (role === 'admin') {
      role = 'student';
    }

    // 检查用户名或邮箱是否已存在（统一错误消息，防止枚举攻击）
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [{ username }, { email }]
      }
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名或邮箱已被注册，请更换后重试'
      });
    }

    // 加密密码
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 清理用户输入防止 XSS
    const cleanUsername = require('../utils/sanitize').sanitizeText(username);
    const cleanEmail = require('../utils/sanitize').sanitizeText(email);

    // 创建用户
    const user = await User.create({
      username: cleanUsername,
      password: hashedPassword,
      email: cleanEmail,
      role,
      status: 'active'
    });

    // 生成 token
    const token = generateToken(user);

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user.toJSON();

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: userWithoutPassword
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
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

/**
 * 用户登录
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用户（用户名或邮箱）
    const user = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { username: username },
          { email: username }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 检查用户状态
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: '账号已被禁用，请联系管理员'
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 生成 token
    const token = generateToken(user);

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user.toJSON();

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: userWithoutPassword
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 管理员登录
 */
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用户（用户名或邮箱）
    const user = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { username: username },
          { email: username }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '管理员用户名或密码错误'
      });
    }

    // 检查是否为管理员
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '非管理员账号，无权访问'
      });
    }

    // 检查用户状态
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: '管理员账号已被禁用'
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '管理员用户名或密码错误'
      });
    }

    // 生成 token
    const token = generateToken(user);

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user.toJSON();

    res.json({
      success: true,
      message: '管理员登录成功',
      data: {
        token,
        user: userWithoutPassword
      }
    });
  } catch (error) {
    console.error('管理员登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取当前用户信息
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 更新用户信息
 */
exports.updateUser = async (req, res) => {
  try {
    const { username, email, phone, bio, avatar, personalityProfile } = req.body;
    const userId = req.user.id;

    // 检查用户是否存在
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查邮箱是否被其他用户使用
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '邮箱已被使用'
        });
      }
    }

    // 更新用户信息
    const updateData = {};
    if (username !== undefined && username.trim()) {
      updateData.username = require('../utils/sanitize').sanitizeText(username.trim());
    }
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar) {
      if (!/^https?:\/\//i.test(avatar)) {
        return res.status(400).json({
          success: false,
          message: '头像URL格式不正确'
        });
      }
      updateData.avatar = avatar;
    }
    if (personalityProfile !== undefined) {
      updateData.personalityProfile = personalityProfile;
    }
    await user.update(updateData);

    // 如果用户是企业且修改了用户名，同步更新认证信息中的企业名称
    if (updateData.username && user.role === 'employer') {
      const { Verification } = require('../models');
      await Verification.update(
        { companyName: updateData.username },
        { where: { userId } }
      );
    }

    // 获取更新后的用户信息（不包含密码）
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      message: '信息更新成功',
      data: updatedUser
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
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

/**
 * 修改密码
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // 查找用户
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: '当前密码错误'
      });
    }

    // 验证新密码长度
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码至少需要6个字符'
      });
    }
    // 新密码必须包含大小写字母和数字
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: '新密码必须包含大小写字母和数字'
      });
    }
    // 禁止新密码与旧密码相同
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: '新密码不能与旧密码相同'
      });
    }

    // 加密新密码
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    await user.update({ password: hashedNewPassword });

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取人格画像状态
 */
exports.getPersonalityProfileStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'personalityProfileCompletedAt', 'personalityProfile']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        completed: !!user.personalityProfileCompletedAt,
        completedAt: user.personalityProfileCompletedAt,
        profile: user.personalityProfile
      }
    });
  } catch (error) {
    console.error('获取人格画像状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 提交人格画像
 */
exports.submitPersonalityProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileData = req.body;

    // 查找用户
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 更新用户人格画像（直接存储 AI 返回的完整 JSON）
    await user.update({
      personalityProfile: profileData,
      personalityProfileCompletedAt: new Date()
    });

    res.json({
      success: true,
      message: '人格画像提交成功',
      data: {
        completed: true,
        completedAt: user.personalityProfileCompletedAt,
        profile: profileData
      }
    });
  } catch (error) {
    console.error('提交人格画像错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 忘记密码（直接重置，无需验证）
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '用户名/邮箱和新密码不能为空'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码至少需要6个字符'
      });
    }

    // 查找用户（用户名或邮箱）
    const user = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { username: username },
          { email: username }
        ]
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在，请检查用户名或邮箱'
      });
    }

    // 加密新密码
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    await user.update({ password: hashedPassword });

    res.json({
      success: true,
      message: '密码重置成功，请使用新密码登录'
    });
  } catch (error) {
    console.error('忘记密码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 用户登出
 */
exports.logout = async (req, res) => {
  try {
    // JWT 是无状态的，登出主要是客户端删除 token
    // 在实际项目中，如果使用 Redis 存储 token，可以在这里将 token 加入黑名单
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 初始化管理员账号
 * 用于创建第一个管理员账号
 */
exports.createAdmin = async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      });
    }

    // 加密密码
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 创建管理员账号
    const admin = await User.create({
      username,
      password: hashedPassword,
      email,
      role: 'admin',
      status: 'active'
    });

    // 生成 token
    const token = generateToken(admin);

    // 返回用户信息（不包含密码）
    const { password: _, ...adminWithoutPassword } = admin.toJSON();

    res.status(201).json({
      success: true,
      message: '管理员账号创建成功',
      data: {
        token,
        user: adminWithoutPassword
      }
    });
  } catch (error) {
    console.error('创建管理员账号错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};