const express = require('express');
const router = express.Router();
const platformSettingController = require('../controllers/platformSettingController');
const { authenticateToken } = require('../middlewares/auth');
const { adminGuard } = require('../middlewares/roleGuard');

router.get('/public', platformSettingController.getPublicPlatformSettings);
router.get('/', authenticateToken, adminGuard, platformSettingController.getPlatformSettings);
router.put('/', authenticateToken, adminGuard, platformSettingController.updatePlatformSettings);

module.exports = router;
