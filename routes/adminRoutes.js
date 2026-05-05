const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const adminInsightController = require('../controllers/adminInsightController');

// All routes require authentication (admin permissions checked in controller)
router.use(auth);

// Analytics endpoints - already optimised with aggregations and cursor pagination where applicable
router.get('/daily-active-users', adminController.getDailyActiveUsers);
router.get('/user-registrations', adminController.getUserRegistrations);
router.get('/feature-usage', adminController.getFeatureUsage);
router.get('/points-breakdown', adminController.getPointsBreakdown);
router.get('/engagement-radar', adminController.getEngagementRadar);
router.get('/total-users-over-time', adminController.getTotalUsersOverTime);
router.get('/total-time-spent', adminController.getTotalTimeSpent);
router.get('/total-page-views', adminController.getTotalPageViews);
router.get('/page-view-counts', adminController.getPageViewCounts);

// User progress & rankings (cursor pagination)
router.get('/user-progress', auth, adminController.getUserProgress);
router.get('/monthly-rankings', auth, adminController.getMonthlyRankings);

// Notifications & welcome
router.post('/send-congratulations', auth, adminController.sendCongratulations);
router.get('/pending-welcome-users', auth, adminController.getPendingWelcomeUsers);
router.post('/send-welcome-notification', auth, adminController.sendWelcomeNotification);

// Dashboard stats
router.get('/stats', auth, adminController.getAdminStats);

// Page views & user visits (optimised aggregations)
router.get('/page-views-by-page', auth, adminController.getPageViewsByPage);
router.get('/user-visits', auth, adminController.getUserVisits);
router.get('/new-users', auth, adminController.getNewUsers);
router.get('/total-user-points', auth, adminController.getTotalUserPoints);

// User insight stats (cached, no Redis needed)
router.get('/insight-stats', auth, adminInsightController.getInsightStats);
router.post('/insight-stats/refresh', auth, adminInsightController.refreshInsightStats);

module.exports = router;