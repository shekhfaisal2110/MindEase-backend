const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

// Admin middleware: checks email against configured ADMIN_EMAIL
const adminOnly = async (req, res, next) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// All analytics endpoints are admin‑only and use the optimised controller
// (aggregations with $facet, cursor‑based, allowDiskUse: false, etc.)
router.get('/admin/time-spent', auth, adminOnly, analyticsController.getTimeSpentStats);
router.get('/admin/top-active-users', auth, adminOnly, analyticsController.getTopActiveUsers);
router.get('/admin/page-views-by-page', auth, adminOnly, analyticsController.getPageViewsByPage);
router.get('/admin/user-visits', auth, adminOnly, analyticsController.getUserVisits);
router.get('/admin/new-users', auth, adminOnly, analyticsController.getNewUsers);
router.get('/admin/total-user-points', auth, adminOnly, analyticsController.getTotalUserPoints);

module.exports = router;