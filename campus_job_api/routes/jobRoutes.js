const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticateToken, optionalAuth } = require('../middlewares/auth');
const { employerGuard, adminGuard } = require('../middlewares/roleGuard');

// 发布岗位 - 仅限 employer 角色
router.post('/', authenticateToken, employerGuard, jobController.createJob);

// 获取岗位列表 - 公开接口（仅展示审核通过的）
router.get('/', jobController.getJobs);

// 获取我发布的岗位 - 仅限 employer
router.get('/my-jobs', authenticateToken, employerGuard, jobController.getMyJobs);

// 获取企业统计数据 - 仅限 employer
router.get('/employer-stats', authenticateToken, employerGuard, jobController.getEmployerStats);

// 获取待审核岗位列表 - 仅限 admin
router.get('/pending', authenticateToken, adminGuard, jobController.getPendingJobs);

// 审核通过岗位 - 仅限 admin
router.post('/:id/approve', authenticateToken, adminGuard, jobController.approveJob);

// 审核拒绝岗位 - 仅限 admin
router.post('/:id/reject', authenticateToken, adminGuard, jobController.rejectJob);

// 获取岗位详情 - 可选登录（未登录只能看 approved）
router.get('/:id', optionalAuth, jobController.getJobById);

// 更新岗位 - 仅限发布该岗位的企业
router.put('/:id', authenticateToken, employerGuard, jobController.updateJob);

// 删除岗位 - 仅限发布该岗位的企业
router.delete('/:id', authenticateToken, employerGuard, jobController.deleteJob);

module.exports = router;