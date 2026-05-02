// const mongoose = require('mongoose');

// const appUsageSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   date: { type: Date, required: true },
//   appName: { type: String, required: true },
//   minutes: { type: Number, required: true, default: 0 },
// }, { timestamps: true });

// appUsageSchema.index({ user: 1, date: 1, appName: 1 }, { unique: true });

// module.exports = mongoose.model('AppUsage', appUsageSchema);


const mongoose = require('mongoose');

const appUsageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true, index: true }, // 'YYYY-MM-DD'
  appName: { type: String, required: true, index: true },
  minutes: { type: Number, required: true, min: 0, default: 0 },
}, { timestamps: true });

// Ensure no duplicate per user per day per app
appUsageSchema.index({ user: 1, date: 1, appName: 1 }, { unique: true });

// For time-range queries
appUsageSchema.index({ user: 1, date: -1 });

// For global app analytics
appUsageSchema.index({ appName: 1, date: -1 });

// Static method for weekly report
appUsageSchema.statics.getWeeklyReport = function(userId, endDate) {
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), date: { $gte: startStr, $lte: endStr } } },
    { $group: { _id: "$appName", totalMinutes: { $sum: "$minutes" } } },
    { $sort: { totalMinutes: -1 } }
  ]);
};

module.exports = mongoose.model('AppUsage', appUsageSchema);