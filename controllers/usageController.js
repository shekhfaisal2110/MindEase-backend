const DeviceUsage = require('../models/DeviceUsage');
const AppUsage = require('../models/AppUsage');

// ---------- Device Usage ----------
exports.getDeviceUsage = async (req, res) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    let record = await DeviceUsage.findOne({ user: req.user._id, date: targetDate });
    if (!record) {
      record = { date: targetDate, totalMinutes: 0 };
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateDeviceUsage = async (req, res) => {
  try {
    const { date, totalMinutes } = req.body;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const record = await DeviceUsage.findOneAndUpdate(
      { user: req.user._id, date: targetDate },
      { totalMinutes },
      { upsert: true, new: true }
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
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const usages = await AppUsage.find({ user: req.user._id, date: targetDate }).sort({ minutes: -1 });
    res.json(usages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateAppUsage = async (req, res) => {
  try {
    const { date, appName, minutes } = req.body;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const record = await AppUsage.findOneAndUpdate(
      { user: req.user._id, date: targetDate, appName },
      { minutes },
      { upsert: true, new: true }
    );
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteAppUsage = async (req, res) => {
  try {
    const { id } = req.params;
    await AppUsage.findOneAndDelete({ _id: id, user: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Analytics ----------
exports.getMonthlySummary = async (req, res) => {
  try {
    const { year, month } = req.params;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const appUsages = await AppUsage.find({
      user: req.user._id,
      date: { $gte: start, $lte: end }
    });
    const deviceUsages = await DeviceUsage.find({
      user: req.user._id,
      date: { $gte: start, $lte: end }
    });
    // Aggregate total per app
    const appTotals = {};
    appUsages.forEach(u => {
      if (!appTotals[u.appName]) appTotals[u.appName] = 0;
      appTotals[u.appName] += u.minutes;
    });
    // Total device time
    const totalDeviceTime = deviceUsages.reduce((sum, d) => sum + d.totalMinutes, 0);
    res.json({ appTotals, totalDeviceTime });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};