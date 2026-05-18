const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { adminGuard } = require('../middlewares/roleGuard');
const adminOperationLogController = require('../controllers/adminOperationLogController');

router.get('/', authenticateToken, adminGuard, adminOperationLogController.getAdminOperationLogs);

module.exports = router;
