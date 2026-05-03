const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');
const User = require('../models/User');

// All routes require authentication
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

router.get('/leaderboard', userController.getLeaderboard);
router.get('/leaderboard-visibility', userController.getLeaderboardVisibility);
router.put('/leaderboard-visibility', userController.updateLeaderboardVisibility);


router.get('/check-monthly-report', auth, userController.checkMonthlyReport);
router.post('/acknowledge-monthly-report', auth, userController.acknowledgeMonthlyReport);
router.get('/check-month-start', auth, userController.checkMonthStart);
router.post('/acknowledge-month-start', auth, userController.acknowledgeMonthStart);

// Admin: get all users (with pagination)
router.get('/admin/users', auth, async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().select('username email createdAt isVerified hideFromLeaderboard')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments()
    ]);
    res.json({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: get all users (with search) – for notification recipient selection
router.get('/admin/all-users', auth, async (req, res) => {
  try {
    if (req.user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { search = '', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {
      $or: [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    };
    const [users, total] = await Promise.all([
      User.find(search ? filter : {})
        .select('username email')
        .sort({ username: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(search ? filter : {})
    ]);
    res.json({ users, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
