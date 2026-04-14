const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticateToken } = require('../middlewares/auth');
const { employerGuard } = require('../middlewares/roleGuard');

// 发布岗位 - 仅限 employer 角色
router.post('/', authenticateToken, employerGuard, jobController.createJob);

// 获取岗位列表 - 公开接口
router.get('/', jobController.getJobs);

// 获取岗位详情 - 公开接口
router.get('/:id', jobController.getJobById);

// 更新岗位 - 仅限发布该岗位的企业
router.put('/:id', authenticateToken, jobController.updateJob);

// 删除岗位 - 仅限发布该岗位的企业
router.delete('/:id', authenticateToken, jobController.deleteJob);

module.exports = router;