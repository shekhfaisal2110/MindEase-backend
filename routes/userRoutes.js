// const express = require('express');
// const router = express.Router();
// const auth = require('../middleware/auth');
// const userController = require('../controllers/userController');

// // All routes require authentication
// router.use(auth);

// // Password change with OTP
// router.post('/request-password-change-otp', userController.requestPasswordChangeOTP);
// router.post('/verify-password-change-otp', userController.verifyPasswordChangeOTP);
// router.post('/change-password-with-otp', userController.changePasswordWithOTP);

// // Profile & progress
// router.get('/progress', userController.getProgress);
// router.put('/username', userController.updateUsername);

// // Gratitude challenge target
// router.get('/gratitude-target', userController.getGratitudeTarget);
// router.put('/gratitude-target', userController.updateGratitudeTarget);

// // Analytics / badges support
// router.get('/activity-breakdown', userController.getActivityBreakdown);
// router.get('/recent-activities', userController.getRecentActivities);
// router.get('/active-days', userController.getActiveDays);

// router.get('/leaderboard', userController.getLeaderboard);
// router.get('/leaderboard-visibility', userController.getLeaderboardVisibility);
// router.put('/leaderboard-visibility', userController.updateLeaderboardVisibility);

// module.exports = router;












const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');

router.use(auth);

// Password change with OTP
router.post('/request-password-change-otp', userController.requestPasswordChangeOTP);
router.post('/verify-password-change-otp', userController.verifyPasswordChangeOTP);
router.post('/change-password-with-otp', userController.changePasswordWithOTP);

// Profile & progress
router.get('/progress', userController.getProgress);
router.put('/username', userController.updateUsername);

// Gratitude challenge target
router.get('/gratitude-target', userController.getGratitudeTarget);
router.put('/gratitude-target', userController.updateGratitudeTarget);

// Analytics / badges support
router.get('/activity-breakdown', userController.getActivityBreakdown);
router.get('/recent-activities', userController.getRecentActivities);
router.get('/active-days', userController.getActiveDays);

// ✅ Leaderboard routes
router.get('/leaderboard', userController.getLeaderboard);
router.get('/leaderboard-visibility', userController.getLeaderboardVisibility);
router.put('/leaderboard-visibility', userController.updateLeaderboardVisibility);

router.get('/admin/users', userController.getAllUsers);

module.exports = router;