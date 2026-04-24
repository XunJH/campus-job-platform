const xss = require('xss');

/**
 * 清理用户输入，防止存储型 XSS
 * @param {string} input
 * @returns {string}
 */
function sanitizeText(input) {
  if (typeof input !== 'string') return input;
  return xss(input, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  });
}

/**
 * 清理对象中的所有字符串字段
 * @param {object} obj
 * @param {string[]} fields - 需要清理的字段名数组
 * @returns {object}
 */
function sanitizeFields(obj, fields) {
  const result = { ...obj };
  fields.forEach(field => {
    if (typeof result[field] === 'string') {
      result[field] = sanitizeText(result[field]);
    }
  });
  return result;
}

module.exports = {
  sanitizeText,
  sanitizeFields
};
