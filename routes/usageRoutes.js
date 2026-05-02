// const express = require('express');
// const router = express.Router();
// const auth = require('../middleware/auth');
// const usageController = require('../controllers/usageController');
// const AppUsage = require('../models/AppUsage');

// router.use(auth);

// // Device usage
// router.get('/device/:date', usageController.getDeviceUsage);
// router.post('/device', usageController.updateDeviceUsage);

// // App usage
// router.get('/app/:date', usageController.getAppUsagesForDate);
// router.post('/app', usageController.updateAppUsage);
// router.delete('/app/:id', usageController.deleteAppUsage);

// // Analytics
// router.get('/monthly/:year/:month', usageController.getMonthlySummary);

// router.get('/apps/distinct', async (req, res) => {
//   try {
//     const apps = await AppUsage.distinct('appName', { user: req.user._id });
//     res.json(apps);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Get last 30 days app totals
// router.get('/last30days', async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - 30);
//     startDate.setHours(0,0,0,0);
//     const apps = await AppUsage.aggregate([
//       { $match: { user: userId, date: { $gte: startDate } } },
//       { $group: { _id: '$appName', totalMinutes: { $sum: '$minutes' } } }
//     ]);
//     const result = {};
//     apps.forEach(a => { result[a._id] = a.totalMinutes; });
//     res.json({ appTotals: result });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Get lifetime app totals (all time)
// router.get('/lifetime', async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const apps = await AppUsage.aggregate([
//       { $match: { user: userId } },
//       { $group: { _id: '$appName', totalMinutes: { $sum: '$minutes' } } }
//     ]);
//     const result = {};
//     apps.forEach(a => { result[a._id] = a.totalMinutes; });
//     res.json({ appTotals: result });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// module.exports = router;




const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const usageController = require('../controllers/usageController');

router.use(auth);

// Device usage
router.get('/device/:date', usageController.getDeviceUsage);
router.post('/device', usageController.updateDeviceUsage);

// App usage
router.get('/app/:date', usageController.getAppUsagesForDate);
router.post('/app', usageController.updateAppUsage);
router.delete('/app/:id', usageController.deleteAppUsage);

// Analytics
router.get('/monthly/:year/:month', usageController.getMonthlySummary);
router.get('/apps/distinct', usageController.getDistinctApps);
router.get('/last30days', usageController.getRecentAppTotals);
router.get('/lifetime', usageController.getLifetimeAppTotals);

module.exports = router;