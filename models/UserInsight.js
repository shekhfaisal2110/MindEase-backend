// // models/UserInsight.js
// const mongoose = require('mongoose');

// const userInsightSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
//   date: { type: String, required: true }, // YYYY-MM-DD (the day insights were generated)
//   insights: [{
//     title: { type: String, required: true },
//     description: { type: String, required: true },
//     type: { type: String, enum: ['positive', 'warning', 'neutral'], default: 'neutral' },
//     metric: { type: String }, // e.g., 'mood', 'sleep'
//   }],
  
// }, { timestamps: true });

// userInsightSchema.index({ user: 1, date: -1 });
// userInsightSchema.index({ "insights.type": 1 });
// userInsightSchema.index({ "insights.metric": 1 });
// module.exports = mongoose.model('UserInsight', userInsightSchema);





const mongoose = require('mongoose');

const userInsightSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String,        // YYYY-MM-DD (the day insights were generated)
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
    index: true
  },
  insights: [{
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['positive', 'warning', 'neutral'], default: 'neutral' },
    metric: { type: String } // e.g., 'mood', 'sleep'
  }]
}, {
  timestamps: true,
  // Remove __v from JSON output
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  minimize: false
});

// ========== INDEXES (optimized) ==========
userInsightSchema.index({ user: 1, date: -1 });
userInsightSchema.index({ "insights.type": 1 });
userInsightSchema.index({ "insights.metric": 1 });
// Covering index for cursor pagination (user + date + _id)
userInsightSchema.index({ user: 1, date: -1, _id: -1 });

// ========== STATIC METHODS (optimized, lean, atomic) ==========

/**
 * Get paginated insights for a user (newest first, cursor‑based)
 * @param {string|ObjectId} userId
 * @param {number} limit - default 20
 * @param {string} [cursor] - last document _id from previous page
 * @returns {Promise<Object>} { insights, nextCursor, hasMore }
 */
userInsightSchema.statics.getUserInsights = async function(userId, limit = 20, cursor = null) {
  const query = { user: userId };
  if (cursor) query._id = { $lt: cursor };   // because sorted by date descending, _id descending

  const docs = await this.find(query)
    .sort({ date: -1, _id: -1 })
    .limit(limit)
    .select('date insights createdAt')
    .lean()                                 // 10x faster
    .exec();

  const nextCursor = docs.length === limit ? docs[docs.length - 1]._id : null;
  return { insights: docs, nextCursor, hasMore: !!nextCursor };
};

/**
 * Get insights for a specific date (lean)
 * @param {string|ObjectId} userId
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Promise<object|null>}
 */
userInsightSchema.statics.getByDate = async function(userId, dateStr) {
  return this.findOne({ user: userId, date: dateStr })
    .select('insights date')
    .lean()
    .exec();
};

/**
 * Add an insight to a user's daily record (atomic $push)
 * @param {string|ObjectId} userId
 * @param {string} dateStr
 * @param {object} insight - { title, description, type, metric? }
 * @returns {Promise<object>} updated document (lean)
 */
userInsightSchema.statics.addInsight = async function(userId, dateStr, insight) {
  return this.findOneAndUpdate(
    { user: userId, date: dateStr },
    { $push: { insights: insight } },
    { upsert: true, new: true, lean: true, runValidators: true }
  ).exec();
};

/**
 * Replace all insights for a given date (atomic $set)
 * @param {string|ObjectId} userId
 * @param {string} dateStr
 * @param {Array} insightsArray
 * @returns {Promise<object>} updated document (lean)
 */
userInsightSchema.statics.setInsights = async function(userId, dateStr, insightsArray) {
  return this.findOneAndUpdate(
    { user: userId, date: dateStr },
    { $set: { insights: insightsArray } },
    { upsert: true, new: true, lean: true, runValidators: true }
  ).exec();
};

/**
 * Delete insights for a specific date (atomic)
 * @param {string|ObjectId} userId
 * @param {string} dateStr
 * @returns {Promise<object>} delete result
 */
userInsightSchema.statics.deleteByDate = async function(userId, dateStr) {
  return this.deleteOne({ user: userId, date: dateStr }).lean().exec();
};

module.exports = mongoose.model('UserInsight', userInsightSchema);