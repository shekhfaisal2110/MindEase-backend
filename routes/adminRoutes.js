const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const adminInsightController = require('../controllers/adminInsightController');

router.use(auth);

router.get('/daily-active-users', adminController.getDailyActiveUsers);
router.get('/user-registrations', adminController.getUserRegistrations);
router.get('/feature-usage', adminController.getFeatureUsage);
router.get('/points-breakdown', adminController.getPointsBreakdown);
router.get('/engagement-radar', adminController.getEngagementRadar);
router.get('/total-users-over-time', adminController.getTotalUsersOverTime);
router.get('/total-time-spent', adminController.getTotalTimeSpent);
router.get('/total-page-views', adminController.getTotalPageViews);
router.get('/page-view-counts', adminController.getPageViewCounts);
router.get('/user-progress', auth, adminController.getUserProgress);
router.get('/monthly-rankings', auth, adminController.getMonthlyRankings);
router.post('/send-congratulations', auth, adminController.sendCongratulations);
router.get('/insight-stats', auth, adminInsightController.getInsightStats);
router.post('/insight-stats/refresh', auth, adminInsightController.refreshInsightStats);
router.get('/pending-welcome-users', auth, adminController.getPendingWelcomeUsers);
router.post('/send-welcome-notification', auth, adminController.sendWelcomeNotification);
router.get('/stats', auth, adminController.getAdminStats);

module.exports = router;