// const mongoose = require('mongoose');

// const wellbeingActivitySchema = new mongoose.Schema({
//   user: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true,
//     index: true
//   },
//   name: { 
//     type: String, 
//     required: true, 
//     trim: true, 
//     maxlength: 100 
//   },
//   type: { 
//     type: String, 
//     enum: ['happiness', 'stress_relief'], 
//     required: true 
//   },
//   stressReductionPercent: { 
//     type: Number, 
//     default: 0, 
//     min: 0, 
//     max: 100,
//     validate: {
//       validator: Number.isInteger,
//       message: 'Stress reduction percent must be an integer'
//     }
//   },
//   notes: { 
//     type: String, 
//     default: '', 
//     trim: true, 
//     maxlength: 500 
//   },
//   dateStr: { 
//     type: String, 
//     default: () => new Date().toISOString().split('T')[0],
//     index: true
//   } // for daily grouping
// }, { timestamps: true }); // adds createdAt and updatedAt automatically

// // Indexes
// wellbeingActivitySchema.index({ user: 1, createdAt: -1 });
// wellbeingActivitySchema.index({ user: 1, type: 1, createdAt: -1 });
// wellbeingActivitySchema.index({ type: 1, createdAt: -1 });

// // Optional TTL index (1 year)
// wellbeingActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// // Static method to get recent activities
// wellbeingActivitySchema.statics.getRecent = async function(userId, limit = 10) {
//   return this.find({ user: userId })
//     .sort({ createdAt: -1 })
//     .limit(limit)
//     .select('name type stressReductionPercent notes createdAt')
//     .lean();
// };

// // Static method to get stats by type
// wellbeingActivitySchema.statics.getStatsByType = async function(userId) {
//   const stats = await this.aggregate([
//     { $match: { user: mongoose.Types.ObjectId(userId) } },
//     { $group: { _id: "$type", count: { $sum: 1 }, avgStressReduction: { $avg: "$stressReductionPercent" } } }
//   ]);
//   return stats;
// };

// // Static method to get weekly summary (last 7 days)
// wellbeingActivitySchema.statics.getWeeklySummary = async function(userId) {
//   const sevenDaysAgo = new Date();
//   sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
//   return this.aggregate([
//     { $match: { user: mongoose.Types.ObjectId(userId), createdAt: { $gte: sevenDaysAgo } } },
//     { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
//     { $sort: { _id: 1 } }
//   ]);
// };

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
    maxlength: 100,
    index: true                       // for searching by activity name
  },
  type: {
    type: String,
    enum: ['happiness', 'stress_relief'],
    required: true,
    index: true
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
  }
}, {
  timestamps: true,
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  minimize: false
});

// ========== INDEXES (optimized) ==========
wellbeingActivitySchema.index({ user: 1, createdAt: -1 });
wellbeingActivitySchema.index({ user: 1, type: 1, createdAt: -1 });
wellbeingActivitySchema.index({ type: 1, createdAt: -1 });
// Covering index for cursor pagination (user + createdAt + _id)
wellbeingActivitySchema.index({ user: 1, createdAt: -1, _id: -1 });
// TTL index (auto‑delete after 1 year)
wellbeingActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// ========== STATIC METHODS (optimized, lean, cursor pagination) ==========

/**
 * Get recent activities for a user – cursor‑based pagination (no skip)
 * @param {string|ObjectId} userId
 * @param {number} limit - default 10
 * @param {string} [cursor] - last document _id from previous page
 * @returns {Promise<Object>} { activities, nextCursor, hasMore }
 */
wellbeingActivitySchema.statics.getRecent = async function(userId, limit = 10, cursor = null) {
  const query = { user: userId };
  if (cursor) query._id = { $lt: cursor };   // because sorted by createdAt descending, _id descending

  const activities = await this.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .select('name type stressReductionPercent notes createdAt')
    .lean()                                  // 10x faster
    .exec();

  const nextCursor = activities.length === limit ? activities[activities.length - 1]._id : null;
  return { activities, nextCursor, hasMore: !!nextCursor };
};

/**
 * Get stats by type (count and average stress reduction)
 * @param {string|ObjectId} userId
 * @returns {Promise<Array>}
 */
wellbeingActivitySchema.statics.getStatsByType = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$type", count: { $sum: 1 }, avgStressReduction: { $avg: "$stressReductionPercent" } } }
  ], { allowDiskUse: false }).exec();
  return stats;
};

/**
 * Get weekly summary (last 7 days) – daily activity counts
 * Uses `dateStr` for grouping (more efficient than converting createdAt each time)
 * @param {string|ObjectId} userId
 * @returns {Promise<Array>} array of { _id: dateStr, count }
 */
wellbeingActivitySchema.statics.getWeeklySummary = async function(userId) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 7);
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = today.toISOString().split('T')[0];

  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), dateStr: { $gte: startStr, $lte: endStr } } },
    { $group: { _id: "$dateStr", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ], { allowDiskUse: false }).exec();
};

/**
 * Create a new wellbeing activity (atomic, lean result)
 * @param {object} activityData - { user, name, type, stressReductionPercent?, notes? }
 * @returns {Promise<object>} created activity (lean)
 */
wellbeingActivitySchema.statics.createActivity = async function(activityData) {
  const activity = new this(activityData);
  await activity.save();
  return activity.toJSON();
};

module.exports = mongoose.model('WellbeingActivity', wellbeingActivitySchema);