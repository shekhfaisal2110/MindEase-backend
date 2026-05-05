// const mongoose = require('mongoose');

// const thoughtRecordSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
//   date: { type: String, required: true, index: true }, // YYYY-MM-DD
//   situation: { type: String, required: true, trim: true, maxlength: 1000 },
//   automaticThoughts: { type: String, required: true, trim: true, maxlength: 1500 },
//   feelings: [{
//     emotion: { type: String, required: true },
//     intensity: { type: Number, min: 0, max: 10, required: true }
//   }],
//   cognitiveDistortions: [{ type: String }], // e.g., 'all-or-nothing', 'overgeneralization', etc.
//   balancedResponse: { type: String, trim: true, maxlength: 2000 },
//   outcomeEmotions: [{
//     emotion: { type: String, required: true },
//     intensity: { type: Number, min: 0, max: 10, required: true }
//   }],
//   createdAt: { type: Date, default: Date.now }
// });

// // Indexes for fast querying
// thoughtRecordSchema.index({ user: 1, date: -1 });
// thoughtRecordSchema.index({ "feelings.emotion": 1 });
// thoughtRecordSchema.index({ "outcomeEmotions.emotion": 1 });

// module.exports = mongoose.model('ThoughtRecord', thoughtRecordSchema);



const mongoose = require('mongoose');

const thoughtRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String,        // YYYY-MM-DD
    required: true,
    index: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  situation: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  automaticThoughts: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1500
  },
  feelings: [{
    emotion: { type: String, required: true, trim: true },
    intensity: { type: Number, min: 0, max: 10, required: true }
  }],
  cognitiveDistortions: {
    type: [String],
    default: []
  },
  balancedResponse: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: ''
  },
  outcomeEmotions: [{
    emotion: { type: String, required: true, trim: true },
    intensity: { type: Number, min: 0, max: 10, required: true }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false,      // using manual createdAt
  // Remove __v from JSON output
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } }
});

// ========== COMPOUND INDEXES (optimized) ==========
// Most common: user's records sorted by date
thoughtRecordSchema.index({ user: 1, date: -1 });

// Covering index for cursor pagination (user + date + _id)
thoughtRecordSchema.index({ user: 1, date: -1, _id: 1 });

// Emotion analytics (used in aggregation)
thoughtRecordSchema.index({ 'feelings.emotion': 1 });
thoughtRecordSchema.index({ 'outcomeEmotions.emotion': 1 });

// Optional: date range without user (admin reports)
thoughtRecordSchema.index({ date: -1 });

// ========== STATIC METHODS (optimized, lean, cursor‑based pagination) ==========

/**
 * Get paginated thought records for a user (newest first, cursor‑based)
 * @param {string|ObjectId} userId
 * @param {number} limit - default 20
 * @param {string} [cursor] - last document _id from previous page
 * @returns {Promise<Object>} { records, nextCursor, hasMore }
 */
thoughtRecordSchema.statics.getUserRecords = async function(userId, limit = 20, cursor = null) {
  const query = { user: userId };
  if (cursor) query._id = { $lt: cursor };   // because sorted by date descending

  const records = await this.find(query)
    .sort({ date: -1, _id: -1 })
    .limit(limit)
    .select('date situation automaticThoughts feelings cognitiveDistortions balancedResponse outcomeEmotions createdAt')
    .lean()                                 // 10x faster
    .exec();

  const nextCursor = records.length === limit ? records[records.length - 1]._id : null;
  return { records, nextCursor, hasMore: !!nextCursor, limit };
};

/**
 * Get a single thought record by ID (with user ownership check)
 * @param {string|ObjectId} recordId
 * @param {string|ObjectId} userId
 * @returns {Promise<object|null>} lean record
 */
thoughtRecordSchema.statics.getById = async function(recordId, userId) {
  return this.findOne({ _id: recordId, user: userId }).lean().exec();
};

/**
 * Get records for a specific date (or date range)
 * @param {string|ObjectId} userId
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Promise<Array>} lean records
 */
thoughtRecordSchema.statics.getByDate = async function(userId, dateStr) {
  return this.find({ user: userId, date: dateStr })
    .sort({ createdAt: 1 })
    .lean()
    .exec();
};

/**
 * Create a new thought record (atomic, lean result)
 * @param {object} recordData - must contain user, date, situation, automaticThoughts, feelings, etc.
 * @returns {Promise<object>} created record (lean)
 */
thoughtRecordSchema.statics.createRecord = async function(recordData) {
  const record = new this(recordData);
  await record.save();
  return record.toJSON();
};

/**
 * Update an existing thought record (atomic, lean)
 * @param {string|ObjectId} recordId
 * @param {string|ObjectId} userId
 * @param {object} updateData - fields to update
 * @returns {Promise<object|null>} updated record (lean)
 */
thoughtRecordSchema.statics.updateRecord = async function(recordId, userId, updateData) {
  const allowedFields = ['situation', 'automaticThoughts', 'feelings', 'cognitiveDistortions', 'balancedResponse', 'outcomeEmotions', 'date'];
  const $set = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) $set[field] = updateData[field];
  }
  if (Object.keys($set).length === 0) return null;
  return this.findOneAndUpdate(
    { _id: recordId, user: userId },
    { $set },
    { new: true, lean: true, runValidators: false }   // skip validation for speed
  ).exec();
};

/**
 * Delete a thought record (with ownership check)
 * @param {string|ObjectId} recordId
 * @param {string|ObjectId} userId
 * @returns {Promise<object>} delete result
 */
thoughtRecordSchema.statics.deleteRecord = async function(recordId, userId) {
  return this.deleteOne({ _id: recordId, user: userId }).lean().exec();
};

/**
 * Get emotion statistics (most frequent pre‑cognitive emotions) for a user
 * @param {string|ObjectId} userId
 * @returns {Promise<Array>} { emotion, count, avgIntensity }
 */
thoughtRecordSchema.statics.getEmotionStats = async function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    { $unwind: "$feelings" },
    { $group: {
        _id: "$feelings.emotion",
        count: { $sum: 1 },
        avgIntensity: { $avg: "$feelings.intensity" }
      } },
    { $sort: { count: -1 } }
  ], { allowDiskUse: false }).exec();
};

module.exports = mongoose.model('ThoughtRecord', thoughtRecordSchema);