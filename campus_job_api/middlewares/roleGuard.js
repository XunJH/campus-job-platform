/**
 * 角色拦截中间件工厂函数
 * @param {...string} allowedRoles - 允许访问的角色列表
 * @returns {Function} Express中间件函数
 */
const roleGuard = (...allowedRoles) => {
  return (req, res, next) => {
    // 必须先经过auth中间件，确保req.user存在
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    // 检查用户角色是否在允许的角色列表中
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足，访问被拒绝'
      });
    }

    next();
  };
};

/**
 * 雇主角色专用中间件
 */
const employerGuard = roleGuard('employer', 'admin');

/**
 * 学生角色专用中间件
 */
const studentGuard = roleGuard('student', 'admin');

/**
 * 管理员角色专用中间件
 */
const adminGuard = roleGuard('admin');

/**
 * 至少拥有指定角色之一（包括更高级别的角色）
 * @param {...string} minimumRoles - 最低需要的角色
 * @returns {Function} Express中间件函数
 */
const roleAtLeast = (...minimumRoles) => {
  // 角色权限层级（从低到高）
  const roleHierarchy = {
    student: 0,
    employer: 1,
    admin: 2
  };

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    // 获取用户角色等级
    const userRoleLevel = roleHierarchy[req.user.role];

    // 检查是否满足最低角色要求
    const isValid = minimumRoles.some(role => {
      return roleHierarchy[role] <= userRoleLevel;
    });

    if (!isValid) {
      return res.status(403).json({
        success: false,
        message: '权限不足，需要更高级别的角色'
      });
    }

    next();
  };
};

/**
 * 任意角色中间件（确保已登录）
 */
const anyRoleGuard = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '请先登录'
    });
  }
  next();
};

module.exports = {
  roleGuard,
  employerGuard,
  studentGuard,
  adminGuard,
  roleAtLeast,
  anyRoleGuard
};