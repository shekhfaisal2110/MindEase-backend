// const DeviceUsage = require('../models/DeviceUsage');
// const AppUsage = require('../models/AppUsage');

// // ---------- Device Usage ----------
// exports.getDeviceUsage = async (req, res) => {
//   try {
//     const { date } = req.params;
//     const targetDate = new Date(date);
//     targetDate.setHours(0, 0, 0, 0);
//     let record = await DeviceUsage.findOne({ user: req.user._id, date: targetDate });
//     if (!record) {
//       record = { date: targetDate, totalMinutes: 0 };
//     }
//     res.json(record);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.updateDeviceUsage = async (req, res) => {
//   try {
//     const { date, totalMinutes } = req.body;
//     const targetDate = new Date(date);
//     targetDate.setHours(0, 0, 0, 0);
//     const record = await DeviceUsage.findOneAndUpdate(
//       { user: req.user._id, date: targetDate },
//       { totalMinutes },
//       { upsert: true, new: true }
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
//     const targetDate = new Date(date);
//     targetDate.setHours(0, 0, 0, 0);
//     const usages = await AppUsage.find({ user: req.user._id, date: targetDate }).sort({ minutes: -1 });
//     res.json(usages);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.updateAppUsage = async (req, res) => {
//   try {
//     const { date, appName, minutes } = req.body;
//     const targetDate = new Date(date);
//     targetDate.setHours(0, 0, 0, 0);
//     const record = await AppUsage.findOneAndUpdate(
//       { user: req.user._id, date: targetDate, appName },
//       { minutes },
//       { upsert: true, new: true }
//     );
//     res.json(record);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.deleteAppUsage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     await AppUsage.findOneAndDelete({ _id: id, user: req.user._id });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // ---------- Analytics ----------
// exports.getMonthlySummary = async (req, res) => {
//   try {
//     const { year, month } = req.params;
//     const start = new Date(year, month - 1, 1);
//     const end = new Date(year, month, 0);
//     const appUsages = await AppUsage.find({
//       user: req.user._id,
//       date: { $gte: start, $lte: end }
//     });
//     const deviceUsages = await DeviceUsage.find({
//       user: req.user._id,
//       date: { $gte: start, $lte: end }
//     });
//     // Aggregate total per app
//     const appTotals = {};
//     appUsages.forEach(u => {
//       if (!appTotals[u.appName]) appTotals[u.appName] = 0;
//       appTotals[u.appName] += u.minutes;
//     });
//     // Total device time
//     const totalDeviceTime = deviceUsages.reduce((sum, d) => sum + d.totalMinutes, 0);
//     res.json({ appTotals, totalDeviceTime });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };




const DeviceUsage = require('../models/DeviceUsage');
const AppUsage = require('../models/AppUsage');

// Helper: convert any date to YYYY-MM-DD string (UTC)
const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

// ---------- Device Usage ----------
exports.getDeviceUsage = async (req, res) => {
  try {
    const { date } = req.params;
    const dateStr = toDateStr(date);
    let record = await DeviceUsage.findOne({ user: req.user._id, date: dateStr }).lean();
    if (!record) {
      record = { date: dateStr, totalMinutes: 0 };
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateDeviceUsage = async (req, res) => {
  try {
    const { date, totalMinutes } = req.body;
    const dateStr = toDateStr(date);
    const record = await DeviceUsage.findOneAndUpdate(
      { user: req.user._id, date: dateStr },
      { $set: { totalMinutes } },
      { upsert: true, new: true, lean: true }
    );
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- App Usage ----------
exports.getAppUsagesForDate = async (req, res) => {
  try {
    const { date } = req.params;
    const dateStr = toDateStr(date);
    const usages = await AppUsage.find({ user: req.user._id, date: dateStr })
      .sort({ minutes: -1 })
      .lean();
    res.json(usages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateAppUsage = async (req, res) => {
  try {
    const { date, appName, minutes } = req.body;
    const dateStr = toDateStr(date);
    const record = await AppUsage.findOneAndUpdate(
      { user: req.user._id, date: dateStr, appName },
      { $set: { minutes } },
      { upsert: true, new: true, lean: true }
    );
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteAppUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await AppUsage.findOneAndDelete({ _id: id, user: req.user._id });
    if (!result) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Analytics (optimized with aggregation) ----------
exports.getMonthlySummary = async (req, res) => {
  try {
    const { year, month } = req.params;
    const startStr = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const endStr = `${year}-${month.padStart(2, '0')}-${endDate.getDate()}`;

    // Use aggregation to get app totals and total device minutes in one pipeline
    const [appTotalsResult, totalDeviceTimeResult] = await Promise.all([
      AppUsage.aggregate([
        { $match: { user: req.user._id, date: { $gte: startStr, $lte: endStr } } },
        { $group: { _id: "$appName", totalMinutes: { $sum: "$minutes" } } },
        { $sort: { totalMinutes: -1 } }
      ]),
      DeviceUsage.aggregate([
        { $match: { user: req.user._id, date: { $gte: startStr, $lte: endStr } } },
        { $group: { _id: null, totalMinutes: { $sum: "$totalMinutes" } } }
      ])
    ]);

    const appTotals = {};
    appTotalsResult.forEach(app => { appTotals[app._id] = app.totalMinutes; });
    const totalDeviceTime = totalDeviceTimeResult[0]?.totalMinutes || 0;

    res.json({ appTotals, totalDeviceTime });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get distinct app names for user
exports.getDistinctApps = async (req, res) => {
  try {
    const apps = await AppUsage.distinct('appName', { user: req.user._id });
    res.json(apps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get last N days app totals (default 30)
exports.getRecentAppTotals = async (req, res) => {
  try {
    const userId = req.user._id;
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().split('T')[0];
    const apps = await AppUsage.aggregate([
      { $match: { user: userId, date: { $gte: startStr } } },
      { $group: { _id: '$appName', totalMinutes: { $sum: '$minutes' } } },
      { $sort: { totalMinutes: -1 } }
    ]);
    const result = {};
    apps.forEach(a => { result[a._id] = a.totalMinutes; });
    res.json({ appTotals: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get lifetime app totals
exports.getLifetimeAppTotals = async (req, res) => {
  try {
    const userId = req.user._id;
    const apps = await AppUsage.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$appName', totalMinutes: { $sum: '$minutes' } } },
      { $sort: { totalMinutes: -1 } }
    ]);
    const result = {};
    apps.forEach(a => { result[a._id] = a.totalMinutes; });
    res.json({ appTotals: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};