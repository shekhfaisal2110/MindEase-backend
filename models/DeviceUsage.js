const mongoose = require('mongoose');

const deviceUsageSchema = new mongoose.Schema({
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
  totalMinutes: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } }
});

// Unique index: one record per user per day
deviceUsageSchema.index({ user: 1, date: 1 }, { unique: true });

// Static: get total minutes for a date (returns 0 if not found)
deviceUsageSchema.statics.getUsage = async function(userId, dateStr) {
  const record = await this.findOne({ user: userId, date: dateStr }).lean();
  return record ? record.totalMinutes : 0;
};

// Static: set exact total minutes (upsert)
deviceUsageSchema.statics.setExactMinutes = async function(userId, dateStr, totalMinutes) {
  const record = await this.findOneAndUpdate(
    { user: userId, date: dateStr },
    { $set: { totalMinutes } },
    { upsert: true, new: true, lean: true }
  );
  return record;
};

module.exports = mongoose.model('DeviceUsage', deviceUsageSchema);