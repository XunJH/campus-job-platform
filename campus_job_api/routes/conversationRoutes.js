const express = require('express');
const conversationController = require('../controllers/conversationController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

router.get('/summary/unread', authenticateToken, conversationController.getUnreadSummary);
router.get('/', authenticateToken, conversationController.getMyConversations);
router.get('/:id', authenticateToken, conversationController.getConversationDetail);
router.post('/:id/messages', authenticateToken, conversationController.sendMessage);

module.exports = router;
