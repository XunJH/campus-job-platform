const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * JWT认证中间件
 * 验证请求头中的Bearer Token，并将解析后的用户信息挂载到req.user
 */
const authenticateToken = async (req, res, next) => {
  try {
    // 获取请求头中的Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问被拒绝，需要认证令牌'
      });
    }

    // 验证JWT Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 查找用户，确保用户存在且状态为active
    const user = await User.findOne({
      where: {
        id: decoded.userId,
        status: 'active'
      },
      attributes: { exclude: ['password'] } // 不返回密码字段
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '无效的令牌或用户不存在'
      });
    }

    // 将用户信息挂载到req.user
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的令牌'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '令牌已过期'
      });
    }

    // 其他错误
    return res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

/**
 * 可选的认证中间件（允许未认证用户访问，但req.user为undefined）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findOne({
        where: {
          id: decoded.userId,
          status: 'active'
        },
        attributes: { exclude: ['password'] }
      });

      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // 可选认证中，即使Token无效也继续执行
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};