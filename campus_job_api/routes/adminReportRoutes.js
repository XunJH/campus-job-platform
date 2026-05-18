const express = require('express');
const router = express.Router();
const adminReportController = require('../controllers/adminReportController');
const { authenticateToken } = require('../middlewares/auth');
const { adminGuard } = require('../middlewares/roleGuard');

router.get('/overview', authenticateToken, adminGuard, adminReportController.getOverview);
router.get('/export', authenticateToken, adminGuard, adminReportController.exportResource);

module.exports = router;
