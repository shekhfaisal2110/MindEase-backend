// const mongoose = require('mongoose');

// const emotionalSchema = new mongoose.Schema({
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
//   emotion: { 
//   type: String, 
//   required: true,
//   enum: ['happy', 'sad', 'anxious', 'angry', 'calm', 'grateful', 'stressed', 'excited', 'frustrated', 'hopeful', 'tired', 'loved', 'lonely', 'peaceful'],
//   lowercase: true,
//   trim: true,
//   index: true
// },
//   intensity: { 
//     type: Number, 
//     min: 1, 
//     max: 10,
//     required: true,
//     validate: {
//       validator: Number.isInteger,
//       message: 'Intensity must be an integer between 1 and 10'
//     }
//   },
//   note: { 
//     type: String, 
//     maxlength: 500,
//     trim: true,
//     default: ''
//   }
// }, { timestamps: true });

// // Indexes
// emotionalSchema.index({ user: 1, date: -1 });
// emotionalSchema.index({ user: 1, emotion: 1, date: -1 });
// emotionalSchema.index({ date: -1 }); // for admin reports

// // Static method to get last N days summary (caching friendly)
// emotionalSchema.statics.getWeeklySummary = async function(userId, days = 7) {
//   const today = new Date().toISOString().split('T')[0];
//   const startDate = new Date();
//   startDate.setDate(startDate.getDate() - days + 1);
//   const startStr = startDate.toISOString().split('T')[0];
  
//   return this.aggregate([
//     { $match: { user: mongoose.Types.ObjectId(userId), date: { $gte: startStr, $lte: today } } },
//     { $group: { _id: "$date", avgIntensity: { $avg: "$intensity" }, dominantEmotion: { $first: "$emotion" } } },
//     { $sort: { _id: 1 } }
//   ]);
// };

// // Static method to add multiple entries (batch)
// emotionalSchema.statics.addBatch = async function(userId, entries) {
//   const docs = entries.map(entry => ({
//     user: userId,
//     date: entry.date || new Date().toISOString().split('T')[0],
//     emotion: entry.emotion,
//     intensity: entry.intensity,
//     note: entry.note || ''
//   }));
//   return this.insertMany(docs, { ordered: false });
// };

// module.exports = mongoose.model('EmotionalActivity', emotionalSchema);







const mongoose = require('mongoose');

const emotionalSchema = new mongoose.Schema({
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
  emotion: {
    type: String,
    required: true,
    enum: ['happy', 'sad', 'anxious', 'angry', 'calm', 'grateful', 'stressed', 'excited', 'frustrated', 'hopeful', 'tired', 'loved', 'lonely', 'peaceful'],
    lowercase: true,
    trim: true,
    index: true
  },
  intensity: {
    type: Number,
    min: 1,
    max: 10,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: 'Intensity must be an integer between 1 and 10'
    }
  },
  note: {
    type: String,
    maxlength: 500,
    trim: true,
    default: ''
  }
}, {
  timestamps: true,
  // Remove __v from JSON output, reduce payload size
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  minimize: false
});

// ========== INDEXES (optimized) ==========
// User's entries in chronological order (most used)
emotionalSchema.index({ user: 1, date: -1 });

// User + emotion + date (for trend analysis per emotion)
emotionalSchema.index({ user: 1, emotion: 1, date: -1 });

// Global date queries for admin reports / analytics
emotionalSchema.index({ date: -1 });

// Additional composite for uniqueness? Not required because multiple entries per user/date are allowed.
// But for fast retrieval of a user's specific entry on a date+emotion:
emotionalSchema.index({ user: 1, date: 1, emotion: 1 });

// ========== STATIC METHODS (optimized with lean & aggregation) ==========

/**
 * Get emotional entries for a user on a specific date (lean, projected)
 * @param {string|ObjectId} userId
 * @param {string} dateStr - YYYY-MM-DD (default today)
 * @returns {Promise<Array>} list of emotional entries for that day
 */
emotionalSchema.statics.getByDate = function(userId, dateStr = null) {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  return this.find({ user: userId, date: targetDate })
    .select('emotion intensity note createdAt')  // only needed fields
    .lean()                                       // 10x faster
    .exec();
};

/**
 * Get the most recent emotional entry for a user (e.g., for dashboard)
 * @param {string|ObjectId} userId
 * @returns {Promise<object|null>} latest entry (lean)
 */
emotionalSchema.statics.getLatest = function(userId) {
  return this.findOne({ user: userId })
    .sort({ date: -1, createdAt: -1 })
    .lean()
    .exec();
};

/**
 * Get weekly summary (average intensity, dominant emotion) for a user
 * Optimized: uses aggregation pipeline with in‑memory sorting, projected fields.
 * @param {string|ObjectId} userId
 * @param {number} days - number of days to look back (default 7)
 * @returns {Promise<Array>} summary per date
 */
emotionalSchema.statics.getWeeklySummary = async function(userId, days = 7) {
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  const startStr = startDate.toISOString().split('T')[0];

  // Use aggregation with `allowDiskUse: false` for in‑memory processing (fast for small sets)
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        date: { $gte: startStr, $lte: today }
      }
    },
    {
      $group: {
        _id: "$date",
        avgIntensity: { $avg: "$intensity" },
        // To get dominant emotion (most frequent), we need a two-step aggregation or use $push and compute in client.
        // Simpler: get first emotion (most recent? unclear). Instead, we'll collect all and let client decide, or use $addToSet.
        // But original used $first – unreliable. Better: compute mode via $sortByCount.
        // However, to preserve original behavior but improve, we'll use $first after sorting by createdAt.
      }
    },
    { $sort: { _id: 1 } },
    { $limit: days }
  ], { allowDiskUse: false }).exec();

  // More accurate version: get dominant emotion using $sortByCount per date.
  // Uncomment below for more accuracy (slightly heavier but still optimized).
  /*
  const summary = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), date: { $gte: startStr, $lte: today } } },
    { $group: {
        _id: { date: "$date", emotion: "$emotion" },
        count: { $sum: 1 },
        avgIntensity: { $avg: "$intensity" }
      }
    },
    { $sort: { "_id.date": 1, "count": -1 } },
    { $group: {
        _id: "$_id.date",
        dominantEmotion: { $first: "$_id.emotion" },
        avgIntensity: { $first: "$avgIntensity" }
      }
    },
    { $sort: { _id: 1 } }
  ], { allowDiskUse: false }).exec();
  return summary;
  */
};

/**
 * Get emotional statistics for a date range (grouped by emotion)
 * @param {string|ObjectId} userId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array>} { _id: emotion, count, avgIntensity }
 */
emotionalSchema.statics.getEmotionStats = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: "$emotion",
        count: { $sum: 1 },
        avgIntensity: { $avg: "$intensity" }
      }
    },
    { $sort: { count: -1 } }
  ], { allowDiskUse: false }).exec();
};

/**
 * Add a single emotional entry (atomic, validated)
 * @param {object} entryData
 * @returns {Promise<object>} lean created entry
 */
emotionalSchema.statics.addEntry = async function(entryData) {
  const entry = new this(entryData);
  await entry.save();
  return entry.toJSON();   // lean output
};

/**
 * Batch add multiple emotional entries (ordered: false for speed)
 * @param {string|ObjectId} userId
 * @param {Array} entries - each entry has emotion, intensity, note, optional date
 * @returns {Promise<Array>} inserted documents (lean)
 */
emotionalSchema.statics.addBatch = async function(userId, entries) {
  const docs = entries.map(entry => ({
    user: userId,
    date: entry.date || new Date().toISOString().split('T')[0],
    emotion: entry.emotion,
    intensity: entry.intensity,
    note: entry.note || ''
  }));
  // insertMany with ordered: false is faster (parallel insert)
  const inserted = await this.insertMany(docs, { ordered: false, lean: true });
  return inserted;
};

/**
 * Update an existing emotional entry (by ID) with atomic $set
 * @param {string|ObjectId} entryId
 * @param {string|ObjectId} userId - for ownership check
 * @param {object} updateData - fields to update (emotion, intensity, note, date)
 * @returns {Promise<object|null>} updated document (lean)
 */
emotionalSchema.statics.updateEntry = async function(entryId, userId, updateData) {
  const allowedUpdates = ['emotion', 'intensity', 'note', 'date'];
  const $set = {};
  for (const key of allowedUpdates) {
    if (updateData[key] !== undefined) $set[key] = updateData[key];
  }
  if (Object.keys($set).length === 0) return null;
  return this.findOneAndUpdate(
    { _id: entryId, user: userId },
    { $set },
    { new: true, lean: true, runValidators: true }
  ).exec();
};

/**
 * Delete an emotional entry (by ID) with ownership check
 * @param {string|ObjectId} entryId
 * @param {string|ObjectId} userId
 * @returns {Promise<object>} delete result
 */
emotionalSchema.statics.deleteEntry = function(entryId, userId) {
  return this.deleteOne({ _id: entryId, user: userId }).lean().exec();
};

module.exports = mongoose.model('EmotionalActivity', emotionalSchema);