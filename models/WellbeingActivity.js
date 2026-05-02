// const mongoose = require('mongoose');

// const wellbeingActivitySchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   name: { type: String, required: true },
//   type: { type: String, enum: ['happiness', 'stress_relief'], required: true },
//   stressReductionPercent: { type: Number, default: 0, min: 0, max: 100 },
//   notes: { type: String, default: '' },
//   createdAt: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model('WellbeingActivity', wellbeingActivitySchema);


const mongoose = require('mongoose');

const wellbeingActivitySchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  name: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 100 
  },
  type: { 
    type: String, 
    enum: ['happiness', 'stress_relief'], 
    required: true 
  },
  stressReductionPercent: { 
    type: Number, 
    default: 0, 
    min: 0, 
    max: 100,
    validate: {
      validator: Number.isInteger,
      message: 'Stress reduction percent must be an integer'
    }
  },
  notes: { 
    type: String, 
    default: '', 
    trim: true, 
    maxlength: 500 
  },
  dateStr: { 
    type: String, 
    default: () => new Date().toISOString().split('T')[0],
    index: true
  } // for daily grouping
}, { timestamps: true }); // adds createdAt and updatedAt automatically

// Indexes
wellbeingActivitySchema.index({ user: 1, createdAt: -1 });
wellbeingActivitySchema.index({ user: 1, type: 1, createdAt: -1 });
wellbeingActivitySchema.index({ type: 1, createdAt: -1 });

// Optional TTL index (1 year)
wellbeingActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// Static method to get recent activities
wellbeingActivitySchema.statics.getRecent = async function(userId, limit = 10) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('name type stressReductionPercent notes createdAt')
    .lean();
};

// Static method to get stats by type
wellbeingActivitySchema.statics.getStatsByType = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$type", count: { $sum: 1 }, avgStressReduction: { $avg: "$stressReductionPercent" } } }
  ]);
  return stats;
};

// Static method to get weekly summary (last 7 days)
wellbeingActivitySchema.statics.getWeeklySummary = async function(userId) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), createdAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
};

module.exports = mongoose.model('WellbeingActivity', wellbeingActivitySchema);