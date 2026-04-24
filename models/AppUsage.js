const mongoose = require('mongoose');

const appUsageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  appName: { type: String, required: true },
  minutes: { type: Number, required: true, default: 0 },
}, { timestamps: true });

appUsageSchema.index({ user: 1, date: 1, appName: 1 }, { unique: true });

module.exports = mongoose.model('AppUsage', appUsageSchema);