// const mongoose = require('mongoose');

// const reactResponseSchema = new mongoose.Schema({
//   user: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true,
//     index: true
//   },
//   date: { 
//     type: Date, 
//     default: Date.now,
//     index: true
//   },
//   dateStr: { 
//     type: String, 
//     default: () => new Date().toISOString().split('T')[0],
//     index: true
//   },
//   emotion: { 
//     type: String, 
//     default: 'angry',
//     enum: ['angry', 'sad', 'anxious', 'frustrated', 'happy', 'calm', 'grateful', 'neutral'],
//     lowercase: true,
//     trim: true
//   },
//   choice: { 
//     type: String, 
//     enum: ['react', 'response'], 
//     required: true,
//     index: true
//   },
//   situation: { 
//     type: String, 
//     default: '', 
//     maxlength: 500, 
//     trim: true 
//   },
//   outcome: { 
//     type: String, 
//     default: '', 
//     maxlength: 500, 
//     trim: true 
//   }
// }, { timestamps: true });

// // Indexes
// reactResponseSchema.index({ user: 1, date: -1 });
// reactResponseSchema.index({ user: 1, choice: 1, date: -1 });
// reactResponseSchema.index({ user: 1, dateStr: 1 });  // for daily grouping
// reactResponseSchema.index({ emotion: 1 });

// // TTL index (optional) – delete after 1 year
// reactResponseSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// // Static method to get recent entries with pagination
// reactResponseSchema.statics.getRecent = async function(userId, limit = 20, skip = 0) {
//   return this.find({ user: userId })
//     .sort({ date: -1 })
//     .skip(skip)
//     .limit(limit)
//     .select('emotion choice situation outcome date')
//     .lean();
// };

// // Static method to get daily summary (react vs response counts for last N days)
// reactResponseSchema.statics.getDailySummary = async function(userId, days = 7) {
//   const today = new Date();
//   const startDate = new Date();
//   startDate.setDate(today.getDate() - days + 1);
//   const startStr = startDate.toISOString().split('T')[0];
  
//   const result = await this.aggregate([
//     { $match: { user: mongoose.Types.ObjectId(userId), dateStr: { $gte: startStr } } },
//     { $group: { _id: { date: "$dateStr", choice: "$choice" }, count: { $sum: 1 } } },
//     { $sort: { "_id.date": 1 } }
//   ]);
//   return result;
// };

// // Static method to get choice stats (total react vs response)
// reactResponseSchema.statics.getChoiceStats = async function(userId) {
//   return this.aggregate([
//     { $match: { user: mongoose.Types.ObjectId(userId) } },
//     { $group: { _id: "$choice", count: { $sum: 1 } } }
//   ]);
// };

// module.exports = mongoose.model('ReactResponse', reactResponseSchema);





const mongoose = require('mongoose');

const reactResponseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  dateStr: {
    type: String,
    default: () => new Date().toISOString().split('T')[0],
    index: true
  },
  emotion: {
    type: String,
    default: 'angry',
    enum: ['angry', 'sad', 'anxious', 'frustrated', 'happy', 'calm', 'grateful', 'neutral'],
    lowercase: true,
    trim: true,
    index: true
  },
  choice: {
    type: String,
    enum: ['react', 'response'],
    required: true,
    index: true
  },
  situation: {
    type: String,
    default: '',
    maxlength: 500,
    trim: true
  },
  outcome: {
    type: String,
    default: '',
    maxlength: 500,
    trim: true
  }
}, {
  timestamps: true,
  // Remove __v from JSON output
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  minimize: false
});

// ========== INDEXES (optimized) ==========
// User's entries sorted by date (newest first)
reactResponseSchema.index({ user: 1, date: -1 });

// User + choice for filtering (react vs response)
reactResponseSchema.index({ user: 1, choice: 1, date: -1 });

// Daily grouping using precomputed dateStr
reactResponseSchema.index({ user: 1, dateStr: 1 });

// Emotion analytics
reactResponseSchema.index({ emotion: 1 });

// TTL index: auto‑delete after 1 year
reactResponseSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// Covering index for cursor pagination (user + date + _id)
reactResponseSchema.index({ user: 1, date: -1, _id: -1 });

// ========== STATIC METHODS (optimized) ==========

/**
 * Get recent entries with cursor‑based pagination (no skip)
 * @param {string|ObjectId} userId
 * @param {number} limit - items per page (default 20)
 * @param {string} [cursor] - last document _id from previous page
 * @returns {Promise<Object>} { entries, nextCursor, hasMore }
 */
reactResponseSchema.statics.getRecent = async function(userId, limit = 20, cursor = null) {
  const query = { user: userId };
  if (cursor) query._id = { $lt: cursor };   // because sorted by date descending

  const entries = await this.find(query)
    .sort({ date: -1, _id: -1 })
    .limit(limit)
    .select('emotion choice situation outcome date dateStr')
    .lean()                                 // 10x faster
    .exec();

  const nextCursor = entries.length === limit ? entries[entries.length - 1]._id : null;
  return { entries, nextCursor, hasMore: !!nextCursor, limit };
};

/**
 * Get daily summary (react vs response counts) for last N days
 * @param {string|ObjectId} userId
 * @param {number} days - number of days to include (default 7)
 * @returns {Promise<Array>} array of { _id: { date, choice }, count }
 */
reactResponseSchema.statics.getDailySummary = async function(userId, days = 7) {
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - days + 1);
  const startStr = startDate.toISOString().split('T')[0];

  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), dateStr: { $gte: startStr } } },
    { $group: { _id: { date: "$dateStr", choice: "$choice" }, count: { $sum: 1 } } },
    { $sort: { "_id.date": 1 } }
  ], { allowDiskUse: false }).exec();
};

/**
 * Get total react vs response counts (all‑time)
 * @param {string|ObjectId} userId
 * @returns {Promise<Array>} array of { _id: choice, count }
 */
reactResponseSchema.statics.getChoiceStats = async function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$choice", count: { $sum: 1 } } }
  ], { allowDiskUse: false }).exec();
};

/**
 * Create a new entry (atomic, lean)
 * @param {object} entryData - { user, emotion, choice, situation?, outcome? }
 * @returns {Promise<object>} created entry (lean)
 */
reactResponseSchema.statics.createEntry = async function(entryData) {
  const entry = new this(entryData);
  await entry.save();
  return entry.toJSON();
};

/**
 * Get emotion frequency for a user (analytics)
 * @param {string|ObjectId} userId
 * @returns {Promise<Array>} array of { _id: emotion, count }
 */
reactResponseSchema.statics.getEmotionStats = async function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$emotion", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ], { allowDiskUse: false }).exec();
};

module.exports = mongoose.model('ReactResponse', reactResponseSchema);