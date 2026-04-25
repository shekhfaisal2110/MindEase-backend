const mongoose = require('mongoose');

const deviceUsageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  totalMinutes: { type: Number, required: true, default: 0 },
}, { timestamps: true }); // adds createdAt, updatedAt

deviceUsageSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DeviceUsage', deviceUsageSchema);