// const mongoose = require('mongoose');

// const hourlyEmotionSchema = new mongoose.Schema({
//   user: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true,
//     index: true
//   },
//   date: { 
//     type: String,  // 'YYYY-MM-DD'
//     required: true,
//     match: /^\d{4}-\d{2}-\d{2}$/
//   },
//   hourBlock: { 
//     type: String, 
//     required: true,
//     match: /^([0-9]|1[0-9]|2[0-3])-([0-9]|1[0-9]|2[0-3])$/,
//     validate: {
//       validator: function(v) {
//         const [start, end] = v.split('-').map(Number);
//         return start < end && start >= 0 && end <= 24;
//       },
//       message: 'Invalid hour block. Use format like "6-8" or "10-12"'
//     }
//   },
//   emotion: { 
//     type: String, 
//     enum: ['positive', 'negative', 'neutral'], 
//     required: true 
//   }
// }, { timestamps: true });

// // Indexes
// hourlyEmotionSchema.index({ user: 1, date: 1, hourBlock: 1 }, { unique: true });
// hourlyEmotionSchema.index({ user: 1, date: -1 }); // for date range

// // Static method to get today's full schedule (mapped object)
// hourlyEmotionSchema.statics.getTodaySchedule = async function(userId) {
//   const today = new Date().toISOString().split('T')[0];
//   const records = await this.find(
//     { user: userId, date: today },
//     { hourBlock: 1, emotion: 1, _id: 0 }
//   ).lean();
  
//   const schedule = {};
//   records.forEach(r => { schedule[r.hourBlock] = r.emotion; });
//   return schedule;
// };

// // Static method to upsert an emotion for a specific hour block
// hourlyEmotionSchema.statics.setEmotion = async function(userId, dateStr, hourBlock, emotion) {
//   return this.updateOne(
//     { user: userId, date: dateStr, hourBlock },
//     { $set: { emotion } },
//     { upsert: true }
//   );
// };

// module.exports = mongoose.model('HourlyEmotion', hourlyEmotionSchema);




const mongoose = require('mongoose');

const hourlyEmotionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String,        // 'YYYY-MM-DD'
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
    index: true          // for date range queries
  },
  hourBlock: {
    type: String,
    required: true,
    match: /^([0-9]|1[0-9]|2[0-3])-([0-9]|1[0-9]|2[0-3])$/,
    validate: {
      validator: function(v) {
        const [start, end] = v.split('-').map(Number);
        return start < end && start >= 0 && end <= 24;
      },
      message: 'Invalid hour block. Use format like "6-8" or "10-12"'
    }
  },
  emotion: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    required: true,
    index: true          // for analytics by emotion
  }
}, {
  timestamps: true,
  // Remove __v from JSON output, reduce payload size
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  minimize: false
});

// ========== INDEXES (optimized) ==========
// Unique constraint: one emotion per user per date per hour block
hourlyEmotionSchema.index({ user: 1, date: 1, hourBlock: 1 }, { unique: true });

// Date range queries for a user (e.g., weekly report)
hourlyEmotionSchema.index({ user: 1, date: -1 });

// Global date range (admin/analytics)
hourlyEmotionSchema.index({ date: -1 });

// Emotion‑based filtering (e.g., count of positive emotions per user)
hourlyEmotionSchema.index({ user: 1, emotion: 1, date: -1 });

// ========== STATIC METHODS (optimized with lean & atomic ops) ==========

/**
 * Get today's schedule as a map: { hourBlock: emotion }
 * @param {string|ObjectId} userId
 * @param {string} [dateStr] - optional date, defaults to today
 * @returns {Promise<Object>} schedule object
 */
hourlyEmotionSchema.statics.getSchedule = async function(userId, dateStr = null) {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  const records = await this.find(
    { user: userId, date: targetDate },
    { hourBlock: 1, emotion: 1, _id: 0 }   // projection: only needed fields
  )
    .lean()                                 // 10x faster
    .exec();

  const schedule = {};
  for (const r of records) {
    schedule[r.hourBlock] = r.emotion;
  }
  return schedule;
};

/**
 * Get today's schedule (alias for backward compatibility)
 */
hourlyEmotionSchema.statics.getTodaySchedule = async function(userId) {
  return this.getSchedule(userId);
};

/**
 * Atomic upsert: set emotion for a specific hour block (single round‑trip)
 * @param {string|ObjectId} userId
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} hourBlock - e.g., "6-8"
 * @param {string} emotion - 'positive' | 'negative' | 'neutral'
 * @returns {Promise<object>} updated/created document (lean)
 */
hourlyEmotionSchema.statics.setEmotion = async function(userId, dateStr, hourBlock, emotion) {
  return this.findOneAndUpdate(
    { user: userId, date: dateStr, hourBlock },
    { $set: { emotion } },
    { upsert: true, new: true, lean: true, runValidators: false }  // skip validation for speed
  ).exec();
};

/**
 * Get all entries for a date range (lean, projected)
 * @param {string|ObjectId} userId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array>} entries sorted by date ascending, then hourBlock
 */
hourlyEmotionSchema.statics.getRange = function(userId, startDate, endDate) {
  return this.find(
    { user: userId, date: { $gte: startDate, $lte: endDate } }
  )
    .select('date hourBlock emotion -_id')
    .sort({ date: 1, hourBlock: 1 })
    .lean()
    .exec();
};

/**
 * Get aggregated emotion counts for a date range (e.g., weekly summary)
 * @param {string|ObjectId} userId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array>} [{ emotion, count }]
 */
hourlyEmotionSchema.statics.getEmotionSummary = function(userId, startDate, endDate) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), date: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: "$emotion", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ], { allowDiskUse: false }).exec();
};

/**
 * Bulk create multiple hour block entries for a single day (atomic, ordered: false)
 * @param {string|ObjectId} userId
 * @param {string} dateStr
 * @param {Array<{hourBlock: string, emotion: string}>} blocks
 * @returns {Promise<Array>} inserted documents
 */
hourlyEmotionSchema.statics.bulkCreate = async function(userId, dateStr, blocks) {
  const docs = blocks.map(block => ({
    user: userId,
    date: dateStr,
    hourBlock: block.hourBlock,
    emotion: block.emotion
  }));
  return this.insertMany(docs, { ordered: false, lean: true });
};

/**
 * Delete all entries for a specific date (e.g., reset day)
 * @param {string|ObjectId} userId
 * @param {string} dateStr
 * @returns {Promise<object>} delete result
 */
hourlyEmotionSchema.statics.deleteByDate = function(userId, dateStr) {
  return this.deleteMany({ user: userId, date: dateStr }).lean().exec();
};

module.exports = mongoose.model('HourlyEmotion', hourlyEmotionSchema);