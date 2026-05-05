// const DeviceUsage = require('../models/DeviceUsage');
// const AppUsage = require('../models/AppUsage');

// // Helper: convert any date to YYYY-MM-DD string (UTC)
// const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

// // ---------- Device Usage ----------
// exports.getDeviceUsage = async (req, res) => {
//   try {
//     const { date } = req.params;
//     const dateStr = toDateStr(date);
//     let record = await DeviceUsage.findOne({ user: req.user._id, date: dateStr }).lean();
//     if (!record) {
//       record = { date: dateStr, totalMinutes: 0 };
//     }
//     res.json(record);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.updateDeviceUsage = async (req, res) => {
//   try {
//     const { date, totalMinutes } = req.body;
//     const dateStr = toDateStr(date);
//     const record = await DeviceUsage.findOneAndUpdate(
//       { user: req.user._id, date: dateStr },
//       { $set: { totalMinutes } },
//       { upsert: true, new: true, lean: true }
//     );
//     res.json(record);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // ---------- App Usage ----------
// exports.getAppUsagesForDate = async (req, res) => {
//   try {
//     const { date } = req.params;
//     const dateStr = toDateStr(date);
//     const usages = await AppUsage.find({ user: req.user._id, date: dateStr })
//       .sort({ minutes: -1 })
//       .lean();
//     res.json(usages);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.updateAppUsage = async (req, res) => {
//   try {
//     const { date, appName, minutes } = req.body;
//     const dateStr = toDateStr(date);
//     const record = await AppUsage.findOneAndUpdate(
//       { user: req.user._id, date: dateStr, appName },
//       { $set: { minutes } },
//       { upsert: true, new: true, lean: true }
//     );
//     res.json(record);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.deleteAppUsage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const result = await AppUsage.findOneAndDelete({ _id: id, user: req.user._id });
//     if (!result) return res.status(404).json({ message: 'Entry not found' });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // ---------- Analytics (optimized with aggregation) ----------
// exports.getMonthlySummary = async (req, res) => {
//   try {
//     const { year, month } = req.params;
//     const startStr = `${year}-${month.padStart(2, '0')}-01`;
//     const endDate = new Date(year, month, 0);
//     const endStr = `${year}-${month.padStart(2, '0')}-${endDate.getDate()}`;

//     // Use aggregation to get app totals and total device minutes in one pipeline
//     const [appTotalsResult, totalDeviceTimeResult] = await Promise.all([
//       AppUsage.aggregate([
//         { $match: { user: req.user._id, date: { $gte: startStr, $lte: endStr } } },
//         { $group: { _id: "$appName", totalMinutes: { $sum: "$minutes" } } },
//         { $sort: { totalMinutes: -1 } }
//       ]),
//       DeviceUsage.aggregate([
//         { $match: { user: req.user._id, date: { $gte: startStr, $lte: endStr } } },
//         { $group: { _id: null, totalMinutes: { $sum: "$totalMinutes" } } }
//       ])
//     ]);

//     const appTotals = {};
//     appTotalsResult.forEach(app => { appTotals[app._id] = app.totalMinutes; });
//     const totalDeviceTime = totalDeviceTimeResult[0]?.totalMinutes || 0;

//     res.json({ appTotals, totalDeviceTime });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get distinct app names for user
// exports.getDistinctApps = async (req, res) => {
//   try {
//     const apps = await AppUsage.distinct('appName', { user: req.user._id });
//     res.json(apps);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get last N days app totals (default 30)
// exports.getRecentAppTotals = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const days = parseInt(req.query.days) || 30;
//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - days);
//     const startStr = startDate.toISOString().split('T')[0];
//     const apps = await AppUsage.aggregate([
//       { $match: { user: userId, date: { $gte: startStr } } },
//       { $group: { _id: '$appName', totalMinutes: { $sum: '$minutes' } } },
//       { $sort: { totalMinutes: -1 } }
//     ]);
//     const result = {};
//     apps.forEach(a => { result[a._id] = a.totalMinutes; });
//     res.json({ appTotals: result });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get lifetime app totals
// exports.getLifetimeAppTotals = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const apps = await AppUsage.aggregate([
//       { $match: { user: userId } },
//       { $group: { _id: '$appName', totalMinutes: { $sum: '$minutes' } } },
//       { $sort: { totalMinutes: -1 } }
//     ]);
//     const result = {};
//     apps.forEach(a => { result[a._id] = a.totalMinutes; });
//     res.json({ appTotals: result });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };





// controllers/deviceAppController.js
const DeviceUsage = require('../models/DeviceUsage');
const AppUsage = require('../models/AppUsage');

// Helper: convert any date to YYYY-MM-DD string (UTC)
const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

// ---------- Device Usage (optimised, using model static methods) ----------
exports.getDeviceUsage = async (req, res) => {
  try {
    const { date } = req.params;
    const dateStr = toDateStr(date);
    const totalMinutes = await DeviceUsage.getUsage(req.user._id, dateStr);
    res.json({ date: dateStr, totalMinutes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateDeviceUsage = async (req, res) => {
  try {
    const { date, totalMinutes } = req.body;
    const dateStr = toDateStr(date);
    const record = await DeviceUsage.setExactMinutes(req.user._id, dateStr, totalMinutes);
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- App Usage (optimised, using model static methods) ----------
// Get all app usages for a specific date – returns array, no pagination needed
exports.getAppUsagesForDate = async (req, res) => {
  try {
    const { date } = req.params;
    const dateStr = toDateStr(date);
    const usages = await AppUsage.getDailyUsage(req.user._id, dateStr);
    res.json(usages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Upsert a single app usage entry
exports.updateAppUsage = async (req, res) => {
  try {
    const { date, appName, minutes } = req.body;
    const dateStr = toDateStr(date);
    const record = await AppUsage.incrementMinutes(req.user._id, dateStr, appName, minutes);
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete an app usage entry by its _id
exports.deleteAppUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await AppUsage.deleteOne({ _id: id, user: req.user._id }).lean();
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Analytics (optimised aggregations) ----------
// Monthly summary: app totals + total device minutes in one parallel aggregation
exports.getMonthlySummary = async (req, res) => {
  try {
    const { year, month } = req.params;
    const monthPadded = month.padStart(2, '0');
    const startStr = `${year}-${monthPadded}-01`;
    const endDate = new Date(year, month, 0);
    const endStr = `${year}-${monthPadded}-${endDate.getDate()}`;

    const [appTotalsResult, totalDeviceTimeResult] = await Promise.all([
      AppUsage.aggregate([
        { $match: { user: req.user._id, date: { $gte: startStr, $lte: endStr } } },
        { $group: { _id: "$appName", totalMinutes: { $sum: "$minutes" } } },
        { $sort: { totalMinutes: -1 } }
      ], { allowDiskUse: false }),
      DeviceUsage.aggregate([
        { $match: { user: req.user._id, date: { $gte: startStr, $lte: endStr } } },
        { $group: { _id: null, totalMinutes: { $sum: "$totalMinutes" } } }
      ], { allowDiskUse: false })
    ]);

    const appTotals = {};
    appTotalsResult.forEach(app => { appTotals[app._id] = app.totalMinutes; });
    const totalDeviceTime = totalDeviceTimeResult[0]?.totalMinutes || 0;

    res.json({ appTotals, totalDeviceTime });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get distinct app names used by the user (optimised: distinct on indexed field)
exports.getDistinctApps = async (req, res) => {
  try {
    const apps = await AppUsage.distinct('appName', { user: req.user._id });
    res.json(apps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get totals for last N days (default 30) – grouped by app
exports.getRecentAppTotals = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = toDateStr(startDate);
    const totals = await AppUsage.getAppSummary(req.user._id, startStr, null, 100); // no end date, we'll use up to today
    const result = {};
    totals.forEach(t => { result[t._id] = t.totalMinutes; });
    res.json({ appTotals: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lifetime totals (all‑time) – grouped by app
exports.getLifetimeAppTotals = async (req, res) => {
  try {
    const totals = await AppUsage.getAppSummary(req.user._id, '1970-01-01', null, 100);
    const result = {};
    totals.forEach(t => { result[t._id] = t.totalMinutes; });
    res.json({ appTotals: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};