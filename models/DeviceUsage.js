// const mongoose = require('mongoose');

// const deviceUsageSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   date: { type: Date, required: true },
//   totalMinutes: { type: Number, required: true, default: 0 },
// }, { timestamps: true }); // adds createdAt, updatedAt

// deviceUsageSchema.index({ user: 1, date: 1 }, { unique: true });

// module.exports = mongoose.model('DeviceUsage', deviceUsageSchema);



const mongoose = require('mongoose');

const deviceUsageSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  date: { 
    type: String,  // 'YYYY-MM-DD'
    required: true,
    default: () => new Date().toISOString().split('T')[0]
  },
  totalMinutes: { 
    type: Number, 
    required: true, 
    default: 0,
    min: 0
  }
}, { timestamps: true }); // optional, agar chahiye to rakho

// Unique compound index
deviceUsageSchema.index({ user: 1, date: 1 }, { unique: true });

// Date index for range queries without user filter
deviceUsageSchema.index({ date: -1 });

// Static method to increment usage (atomic upsert)
deviceUsageSchema.statics.addMinutes = async function(userId, dateStr, minutes) {
  return this.updateOne(
    { user: userId, date: dateStr },
    { $inc: { totalMinutes: minutes } },
    { upsert: true }
  );
};

// Static method to get today's usage
deviceUsageSchema.statics.getToday = async function(userId) {
  const today = new Date().toISOString().split('T')[0];
  const record = await this.findOne({ user: userId, date: today })
    .lean();
  return record?.totalMinutes || 0;
};

module.exports = mongoose.model('DeviceUsage', deviceUsageSchema);