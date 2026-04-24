const { validationResult } = require('express-validator');

/**
 * 统一处理 express-validator 校验结果
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '请求参数错误',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  handleValidationErrors
};
