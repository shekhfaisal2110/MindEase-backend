// // const mongoose = require('mongoose');

// // const userSessionSchema = new mongoose.Schema({
// //   user: {
// //     type: mongoose.Schema.Types.ObjectId,
// //     ref: 'User',
// //     required: true,
// //     index: true,
// //   },
// //   startTime: {
// //     type: Date,
// //     default: Date.now,
// //     index: true,
// //   },
// //   endTime: {
// //     type: Date,
// //     default: null,
// //   },
// //   durationSeconds: {
// //     type: Number,
// //     default: 0,
// //   },
// //   // optional: track device, page, etc.
// //   deviceType: {
// //     type: String,
// //     enum: ['mobile', 'desktop', 'tablet'],
// //     default: 'desktop',
// //   },
// // }, { timestamps: true });

// // // Index for fast aggregation by date ranges
// // userSessionSchema.index({ startTime: 1, endTime: 1 });
// // userSessionSchema.index({ user: 1, startTime: -1 });

// // module.exports = mongoose.model('UserSession', userSessionSchema);



// const mongoose = require('mongoose');

// const userSessionSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//     index: true,
//   },
//   startTime: {
//     type: Date,
//     default: Date.now,
//     index: true,
//   },
//   endTime: {
//     type: Date,
//     default: null,
//     index: true,
//   },
//   durationSeconds: {
//     type: Number,
//     default: 0,
//     min: 0,
//   },
//   deviceType: {
//     type: String,
//     enum: ['mobile', 'desktop', 'tablet'],
//     default: 'desktop',
//   },
// }, { timestamps: true });

// // Indexes
// userSessionSchema.index({ startTime: 1, endTime: 1 });
// userSessionSchema.index({ user: 1, startTime: -1 });
// userSessionSchema.index({ user: 1, endTime: 1 }, { partialFilterExpression: { endTime: null } });
// userSessionSchema.index({ endTime: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // auto-delete after 90 days

// // Pre-save hook to auto-calculate duration when endTime is set
// userSessionSchema.pre('save', function(next) {
//   if (this.isModified('endTime') && this.endTime && this.startTime) {
//     this.durationSeconds = Math.floor((this.endTime - this.startTime) / 1000);
//   }
//   next();
// });

// // Static method to start a new session (ends any open session automatically)
// userSessionSchema.statics.startSession = async function(userId, deviceType = 'desktop') {
//   // End any existing open session
//   await this.endActiveSession(userId);
//   // Create new session
//   return this.create({ user: userId, deviceType });
// };

// // Static method to end active session for a user
// userSessionSchema.statics.endActiveSession = async function(userId) {
//   const session = await this.findOneAndUpdate(
//     { user: userId, endTime: null },
//     { $set: { endTime: new Date() } },
//     { new: true }
//   );
//   // durationSeconds will be auto-calculated by pre-save hook when we call save? Actually findOneAndUpdate doesn't trigger pre-save. So we need to save again.
//   if (session && session.startTime && !session.durationSeconds) {
//     session.durationSeconds = Math.floor((new Date() - session.startTime) / 1000);
//     await session.save();
//   }
//   return session;
// };

// // Static method to get total active time for user in last N days (only completed sessions)
// userSessionSchema.statics.getTotalActiveTime = async function(userId, days = 7) {
//   const startDate = new Date();
//   startDate.setDate(startDate.getDate() - days);
//   const result = await this.aggregate([
//     { $match: { user: mongoose.Types.ObjectId(userId), endTime: { $ne: null }, startTime: { $gte: startDate } } },
//     { $group: { _id: null, totalSeconds: { $sum: "$durationSeconds" } } }
//   ]);
//   return result[0]?.totalSeconds || 0;
// };

// module.exports = mongoose.model('UserSession', userSessionSchema);






const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  startTime: {
    type: Date,
    default: Date.now,
    index: true,
  },
  endTime: {
    type: Date,
    default: null,
    index: true,
  },
  durationSeconds: {
    type: Number,
    default: 0,
    min: 0,
  },
  deviceType: {
    type: String,
    enum: ['mobile', 'desktop', 'tablet'],
    default: 'desktop',
  },
}, {
  timestamps: true,
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
});

// ========== INDEXES (optimized) ==========
userSessionSchema.index({ startTime: 1, endTime: 1 });
userSessionSchema.index({ user: 1, startTime: -1 });
// Partial index for active sessions (endTime = null) – fast lookup for ending active session
userSessionSchema.index({ user: 1, endTime: 1 }, { partialFilterExpression: { endTime: null } });
// TTL index to auto‑delete sessions after 90 days
userSessionSchema.index({ endTime: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// ========== STATIC METHODS (atomic, lean, no pre‑hooks) ==========

/**
 * Start a new session – ends any active session atomically, then creates a new one.
 * Uses two atomic operations, but each is fast.
 * @param {string|ObjectId} userId
 * @param {string} deviceType - 'mobile', 'desktop', 'tablet'
 * @returns {Promise<object>} newly created session (lean)
 */
userSessionSchema.statics.startSession = async function(userId, deviceType = 'desktop') {
  // 1. End any currently active session for this user
  await this.endActiveSession(userId);
  // 2. Create new session
  const newSession = new this({ user: userId, deviceType, startTime: new Date() });
  await newSession.save();
  return newSession.toJSON();
};

/**
 * End the active session for a user (atomic, calculates duration in‑place)
 * Uses aggregation pipeline to set endTime and compute durationSeconds in one update (MongoDB 4.2+).
 * @param {string|ObjectId} userId
 * @returns {Promise<object|null>} updated session (lean) or null if none active
 */
userSessionSchema.statics.endActiveSession = async function(userId) {
  const now = new Date();
  const result = await this.findOneAndUpdate(
    { user: userId, endTime: null },
    [
      {
        $set: {
          endTime: now,
          durationSeconds: {
            $floor: {
              $divide: [
                { $subtract: [now, "$startTime"] },
                1000
              ]
            }
          }
        }
      }
    ],
    { new: true, lean: true }
  ).exec();
  return result;
};

/**
 * Get total active time (seconds) for a user in the last N days (only completed sessions)
 * @param {string|ObjectId} userId
 * @param {number} days - default 7
 * @returns {Promise<number>}
 */
userSessionSchema.statics.getTotalActiveTime = async function(userId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const result = await this.aggregate([
    { $match: {
        user: mongoose.Types.ObjectId(userId),
        endTime: { $ne: null },
        startTime: { $gte: startDate }
      } },
    { $group: { _id: null, totalSeconds: { $sum: "$durationSeconds" } } }
  ], { allowDiskUse: false }).exec();
  return result[0]?.totalSeconds || 0;
};

/**
 * Get average session duration per day over a period (useful for reporting)
 * @param {string|ObjectId} userId
 * @param {number} days - default 7
 * @returns {Promise<number>}
 */
userSessionSchema.statics.getAvgDailyActiveTime = async function(userId, days = 7) {
  const total = await this.getTotalActiveTime(userId, days);
  return days > 0 ? total / days : 0;
};

/**
 * Get most recent session for a user (lean, fast)
 * @param {string|ObjectId} userId
 * @returns {Promise<object|null>}
 */
userSessionSchema.statics.getLastSession = async function(userId) {
  return this.findOne({ user: userId })
    .sort({ startTime: -1 })
    .select('startTime endTime durationSeconds deviceType')
    .lean()
    .exec();
};

module.exports = mongoose.model('UserSession', userSessionSchema);