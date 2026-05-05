const mongoose = require('mongoose');

const appUsageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String,        // YYYY-MM-DD
    required: true,
    index: true
  },
  appName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  minutes: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } }
});

// Unique index: one app per user per day
appUsageSchema.index({ user: 1, date: 1, appName: 1 }, { unique: true });

// Static: get all app usages for a specific date (sorted by minutes descending)
appUsageSchema.statics.getDailyUsage = async function(userId, dateStr) {
  return this.find({ user: userId, date: dateStr })
    .sort({ minutes: -1 })
    .lean();
};

// Static: increment (or set) minutes for a specific app on a date (upsert)
appUsageSchema.statics.incrementMinutes = async function(userId, dateStr, appName, minutes) {
  const record = await this.findOneAndUpdate(
    { user: userId, date: dateStr, appName: appName.toLowerCase().trim() },
    { $set: { minutes } },               // Overwrite minutes (not increment)
    { upsert: true, new: true, lean: true }
  );
  return record;
};

// Static: get app summary for a date range (aggregated by app)
appUsageSchema.statics.getAppSummary = async function(userId, startDate, endDate = null, limit = 100) {
  const match = { user: userId };
  if (startDate) match.date = { $gte: startDate };
  if (endDate) match.date = { ...match.date, $lte: endDate };
  const results = await this.aggregate([
    { $match: match },
    { $group: { _id: "$appName", totalMinutes: { $sum: "$minutes" } } },
    { $sort: { totalMinutes: -1 } },
    { $limit: limit }
  ]);
  return results;
};

module.exports = mongoose.model('AppUsage', appUsageSchema);