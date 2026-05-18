const express = require('express');
const router = express.Router();

const ticketController = require('../controllers/ticketController');
const { authenticateToken } = require('../middlewares/auth');
const { adminGuard, anyRoleGuard } = require('../middlewares/roleGuard');

router.get('/admin', authenticateToken, adminGuard, ticketController.getAdminTickets);
router.get('/my', authenticateToken, anyRoleGuard, ticketController.getMyTickets);
router.post('/', authenticateToken, anyRoleGuard, ticketController.createTicket);
router.patch('/:id/status', authenticateToken, adminGuard, ticketController.updateTicketStatus);

module.exports = router;
