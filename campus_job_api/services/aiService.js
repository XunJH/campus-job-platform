const axios = require('axios');

const AI_BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const aiClient = axios.create({
  baseURL: AI_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * AI 认证辅助审核
 * @param {string} type - 认证类型: id_card | student_card | enterprise
 * @param {string} userId - 用户ID
 * @param {string} content - 认证内容描述
 */
async function verifyIdentity(type, userId, content) {
  try {
    const response = await aiClient.post('/verification/verify', {
      type,
      user_id: String(userId),
      content
    });
    return response.data?.data || null;
  } catch (error) {
    console.error('[AI Service] verifyIdentity failed:', error.message);
    return null;
  }
}

/**
 * AI 虚假岗位检测
 * @param {Object} jobData
 */
async function checkFraud(jobData) {
  try {
    const response = await aiClient.post('/verification/fraud-check', {
      job_id: String(jobData.jobId),
      title: jobData.title,
      company: jobData.company,
      salary: jobData.salary,
      description: jobData.description,
      requirements: jobData.requirements || []
    });
    return response.data?.data || null;
  } catch (error) {
    console.error('[AI Service] checkFraud failed:', error.message);
    return null;
  }
}

/**
 * AI 信用分计算
 * @param {Object} creditData
 */
async function calculateCredit(creditData) {
  try {
    const response = await aiClient.post('/verification/credit-score', {
      user_id: String(creditData.userId),
      completed_jobs: creditData.completedJobs || 0,
      bad_reviews: creditData.badReviews || 0,
      violation_count: creditData.violationCount || 0,
      avg_rating: creditData.avgRating || 5.0
    });
    return response.data?.data || null;
  } catch (error) {
    console.error('[AI Service] calculateCredit failed:', error.message);
    return null;
  }
}

module.exports = {
  verifyIdentity,
  checkFraud,
  calculateCredit
};
