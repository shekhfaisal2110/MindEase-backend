const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminController = require('../controllers/adminController');

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

module.exports = router;