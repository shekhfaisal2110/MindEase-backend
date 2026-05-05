// const mongoose = require('mongoose');

// const userActivitySchema = new mongoose.Schema({
//   user: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true,
//     index: true
//   },
//   date: { 
//     type: String,  // 'YYYY-MM-DD'
//     required: true,
//     default: () => new Date().toISOString().split('T')[0]
//   },
//   totalPoints: { 
//     type: Number, 
//     default: 0, 
//     min: 0 
//   },
//   breakdown: {
//     pageView: { type: Number, default: 0, min: 0 },
//     hourlyEmotion: { type: Number, default: 0, min: 0 },
//     emotionalCheckIn: { type: Number, default: 0, min: 0 },
//     gratitude: { type: Number, default: 0, min: 0 },
//     affirmation: { type: Number, default: 0, min: 0 },
//     growthHealing: { type: Number, default: 0, min: 0 },
//     letterToSelf: { type: Number, default: 0, min: 0 },
//     dailyTask: { type: Number, default: 0, min: 0 },
//     reactResponse: { type: Number, default: 0, min: 0 },
//     ikigaiItem: { type: Number, default: 0, min: 0 }
//   }
// }, { timestamps: true });

// // Indexes
// userActivitySchema.index({ user: 1, date: 1 }, { unique: true });
// userActivitySchema.index({ date: -1 });
// userActivitySchema.index({ totalPoints: -1 }); // for leaderboard
// userActivitySchema.index({ user: 1, totalPoints: -1 });
// userActivitySchema.index({ user: 1, date: 1 });

// // Static method to increment activity point
// userActivitySchema.statics.incrementActivity = async function(userId, activityType, points = 1) {
//   const today = new Date().toISOString().split('T')[0];
//   const update = {
//     $inc: { totalPoints: points }
//   };
//   update.$inc[`breakdown.${activityType}`] = 1;
  
//   return this.updateOne(
//     { user: userId, date: today },
//     update,
//     { upsert: true }
//   );
// };

// // Static method to get today's points
// userActivitySchema.statics.getTodayPoints = async function(userId) {
//   const today = new Date().toISOString().split('T')[0];
//   const data = await this.findOne(
//     { user: userId, date: today },
//     { totalPoints: 1, breakdown: 1, _id: 0 }
//   ).lean();
//   return data || { totalPoints: 0, breakdown: {} };
// };

// // Static method to get weekly points (last 7 days)
// userActivitySchema.statics.getWeeklyPoints = async function(userId) {
//   const today = new Date();
//   const start = new Date(today);
//   start.setDate(today.getDate() - 6);
//   const startStr = start.toISOString().split('T')[0];
//   const endStr = today.toISOString().split('T')[0];
  
//   return this.find(
//     { user: userId, date: { $gte: startStr, $lte: endStr } },
//     { date: 1, totalPoints: 1 }
//   )
//   .sort({ date: 1 })
//   .lean();
// };

// module.exports = mongoose.model('UserActivity', userActivitySchema);







const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String,        // 'YYYY-MM-DD'
    required: true,
    default: () => new Date().toISOString().split('T')[0],
    match: /^\d{4}-\d{2}-\d{2}$/,
    index: true
  },
  totalPoints: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  breakdown: {
    pageView: { type: Number, default: 0, min: 0 },
    hourlyEmotion: { type: Number, default: 0, min: 0 },
    emotionalCheckIn: { type: Number, default: 0, min: 0 },
    gratitude: { type: Number, default: 0, min: 0 },
    affirmation: { type: Number, default: 0, min: 0 },
    growthHealing: { type: Number, default: 0, min: 0 },
    letterToSelf: { type: Number, default: 0, min: 0 },
    dailyTask: { type: Number, default: 0, min: 0 },
    reactResponse: { type: Number, default: 0, min: 0 },
    ikigaiItem: { type: Number, default: 0, min: 0 }
  }
}, {
  timestamps: true,
  // Remove __v from JSON output
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  minimize: false
});

// ========== COMPOUND INDEXES (optimized) ==========
userActivitySchema.index({ user: 1, date: 1 }, { unique: true });
userActivitySchema.index({ date: -1 });
userActivitySchema.index({ totalPoints: -1 });                    // leaderboard (global)
userActivitySchema.index({ user: 1, totalPoints: -1 });           // user ranking
userActivitySchema.index({ user: 1, date: -1 });                  // user history (newest first)

// Covering index for weekly points queries (user + date + totalPoints)
userActivitySchema.index({ user: 1, date: 1, totalPoints: 1 });

// ========== STATIC METHODS (optimized, atomic, lean) ==========

/**
 * Atomically increment a specific activity counter and total points
 * @param {string|ObjectId} userId
 * @param {string} activityType - key inside breakdown (e.g., 'gratitude')
 * @param {number} points - points to add (default 1)
 * @returns {Promise<object>} updated document (lean) or null
 */
userActivitySchema.statics.incrementActivity = async function(userId, activityType, points = 1) {
  const today = new Date().toISOString().split('T')[0];
  const update = {
    $inc: {
      totalPoints: points,
      [`breakdown.${activityType}`]: points  // use same points, but spec says +1; keep as is
    }
  };
  // If the activityType corresponds to a counter that should increment by 1 (not by points),
  // we can split: totalPoints += points, breakdown.xxx += 1.
  // The original code incremented breakdown by 1, totalPoints by points.
  // Let's follow original: breakdown increments by 1, totalPoints by points.
  // So:
  update.$inc[`breakdown.${activityType}`] = 1;
  update.$inc.totalPoints = points;
  
  return this.findOneAndUpdate(
    { user: userId, date: today },
    update,
    { upsert: true, new: true, lean: true, runValidators: false }
  ).exec();
};

/**
 * Get today's activity summary (lean, projected)
 * @param {string|ObjectId} userId
 * @returns {Promise<object>} { totalPoints, breakdown }
 */
userActivitySchema.statics.getTodayPoints = async function(userId) {
  const today = new Date().toISOString().split('T')[0];
  const data = await this.findOne(
    { user: userId, date: today },
    { totalPoints: 1, breakdown: 1, _id: 0 }
  ).lean().exec();
  return data || { totalPoints: 0, breakdown: {} };
};

/**
 * Get weekly points (last 7 days, including today)
 * Returns array of { date, totalPoints } for the last 7 days
 * @param {string|ObjectId} userId
 * @returns {Promise<Array>}
 */
userActivitySchema.statics.getWeeklyPoints = async function(userId) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  const startStr = start.toISOString().split('T')[0];
  const endStr = today.toISOString().split('T')[0];
  
  return this.find(
    { user: userId, date: { $gte: startStr, $lte: endStr } },
    { date: 1, totalPoints: 1, _id: 0 }
  )
    .sort({ date: 1 })
    .lean()
    .exec();
};

/**
 * Get total points for a user (all-time)
 * @param {string|ObjectId} userId
 * @returns {Promise<number>}
 */
userActivitySchema.statics.getTotalPoints = async function(userId) {
  const result = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, total: { $sum: "$totalPoints" } } }
  ], { allowDiskUse: false }).exec();
  return result.length ? result[0].total : 0;
};

module.exports = mongoose.model('UserActivity', userActivitySchema);