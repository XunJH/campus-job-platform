const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticateToken, optionalAuth } = require('../middlewares/auth');
const { employerGuard, adminGuard, studentGuard } = require('../middlewares/roleGuard');

router.post('/', authenticateToken, employerGuard, jobController.createJob);
router.get('/', optionalAuth, jobController.getJobs);

router.get('/my-jobs', authenticateToken, employerGuard, jobController.getMyJobs);
router.get('/employer-stats', authenticateToken, employerGuard, jobController.getEmployerStats);
router.get('/pending', authenticateToken, adminGuard, jobController.getPendingJobs);

router.get('/applications/my', authenticateToken, studentGuard, jobController.getMyApplications);
router.get('/settlements/my', authenticateToken, studentGuard, jobController.getMySettlements);
router.patch('/applications/:applicationId/withdraw', authenticateToken, studentGuard, jobController.withdrawApplication);
router.get('/applications/received', authenticateToken, employerGuard, jobController.getReceivedApplications);
router.patch('/applications/:applicationId/status', authenticateToken, employerGuard, jobController.reviewApplication);
router.get('/settlements/employer', authenticateToken, employerGuard, jobController.getEmployerSettlements);
router.patch('/settlements/:settlementId/status', authenticateToken, employerGuard, jobController.updateSettlementStatus);
router.get('/settlements/admin', authenticateToken, adminGuard, jobController.getAdminSettlements);

router.get('/bookmarks/my', authenticateToken, studentGuard, jobController.getMyBookmarks);

router.post('/:id/approve', authenticateToken, adminGuard, jobController.approveJob);
router.post('/:id/reject', authenticateToken, adminGuard, jobController.rejectJob);

router.get('/:id', optionalAuth, jobController.getJobById);
router.put('/:id', authenticateToken, employerGuard, jobController.updateJob);
router.delete('/:id', authenticateToken, employerGuard, jobController.deleteJob);

router.post('/:id/apply', authenticateToken, studentGuard, jobController.applyJob);
router.get('/:id/applied', authenticateToken, studentGuard, jobController.checkApplied);
router.post('/:id/bookmark', authenticateToken, studentGuard, jobController.toggleBookmark);
router.get('/:id/bookmarked', authenticateToken, studentGuard, jobController.checkBookmarked);

module.exports = router;
