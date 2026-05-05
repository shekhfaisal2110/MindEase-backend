// const mongoose = require('mongoose');

// const gratitudeSchema = new mongoose.Schema({
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
//   people: { 
//     type: String, 
//     default: '', 
//     trim: true, 
//     maxlength: 500 
//   },
//   things: { 
//     type: String, 
//     default: '', 
//     trim: true, 
//     maxlength: 500 
//   },
//   situations: { 
//     type: String, 
//     default: '', 
//     trim: true, 
//     maxlength: 500 
//   },
//   notes: { 
//     type: String, 
//     default: '', 
//     trim: true, 
//     maxlength: 1000 
//   }
// }, { timestamps: true });

// // Compound index: user + date descending (for latest entries)
// gratitudeSchema.index({ user: 1, date: -1 });

// // Optional: prevent duplicate entries per user per day
// gratitudeSchema.index({ user: 1, date: 1 }, { unique: true });

// // Static method to get entries for date range (with caching)
// gratitudeSchema.statics.getEntriesForRange = async function(userId, startDateStr, endDateStr, excludeNotes = true) {
//   let projection = { date: 1, people: 1, things: 1, situations: 1 };
//   if (excludeNotes) projection.notes = 0;
  
//   return this.find(
//     { user: userId, date: { $gte: startDateStr, $lte: endDateStr } },
//     projection
//   )
//   .sort({ date: -1 })
//   .lean();
// };

// // Static method to get today's entry (or null)
// gratitudeSchema.statics.getToday = async function(userId) {
//   const today = new Date().toISOString().split('T')[0];
//   return this.findOne({ user: userId, date: today }).lean();
// };

// // Static method to create or update today's entry (upsert)
// gratitudeSchema.statics.upsertToday = async function(userId, data) {
//   const today = new Date().toISOString().split('T')[0];
//   return this.findOneAndUpdate(
//     { user: userId, date: today },
//     { $set: data },
//     { upsert: true, new: true, lean: true }
//   );
// };

// // Instance method to get word count (example utility)
// gratitudeSchema.methods.getWordCount = function() {
//   const text = `${this.people} ${this.things} ${this.situations} ${this.notes}`;
//   return text.trim().split(/\s+/).filter(w => w.length > 0).length;
// };

// module.exports = mongoose.model('GratitudeEntry', gratitudeSchema);







const mongoose = require('mongoose');

const gratitudeSchema = new mongoose.Schema({
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
  people: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  },
  things: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  },
  situations: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  },
  notes: {
    type: String,
    default: '',
    trim: true,
    maxlength: 1000
  }
}, {
  timestamps: true,
  // Remove __v from JSON output, reduce payload size
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  minimize: false
});

// ========== INDEXES (optimized) ==========
// User + date descending for latest entries (most common query)
gratitudeSchema.index({ user: 1, date: -1 });

// Unique constraint: prevent duplicate entries per user per day
gratitudeSchema.index({ user: 1, date: 1 }, { unique: true });

// Date range queries without user (admin/analytics)
gratitudeSchema.index({ date: -1 });

// Additional coverage for user + date range queries (used by getEntriesForRange)
gratitudeSchema.index({ user: 1, date: -1 });  // already present, keep

// ========== STATIC METHODS (optimized with lean & atomic ops) ==========

/**
 * Get gratitude entries for a date range (lean, projected)
 * @param {string|ObjectId} userId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {boolean} excludeNotes - if true, excludes 'notes' field (default true)
 * @returns {Promise<Array>} entries sorted descending by date
 */
gratitudeSchema.statics.getEntriesForRange = function(userId, startDate, endDate, excludeNotes = true) {
  const projection = { date: 1, people: 1, things: 1, situations: 1 };
  if (!excludeNotes) projection.notes = 1;
  
  return this.find(
    { user: userId, date: { $gte: startDate, $lte: endDate } },
    projection
  )
    .sort({ date: -1 })
    .lean()                     // 10x faster
    .exec();
};

/**
 * Get today's gratitude entry (lean)
 * @param {string|ObjectId} userId
 * @returns {Promise<object|null>}
 */
gratitudeSchema.statics.getToday = function(userId) {
  const today = new Date().toISOString().split('T')[0];
  return this.findOne({ user: userId, date: today })
    .lean()
    .exec();
};

/**
 * Get entry for a specific date (lean)
 * @param {string|ObjectId} userId
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Promise<object|null>}
 */
gratitudeSchema.statics.getByDate = function(userId, dateStr) {
  return this.findOne({ user: userId, date: dateStr })
    .lean()
    .exec();
};

/**
 * Upsert (create or update) today's gratitude entry – atomic
 * @param {string|ObjectId} userId
 * @param {object} data - partial fields (people, things, situations, notes)
 * @returns {Promise<object>} updated/created entry (lean)
 */
gratitudeSchema.statics.upsertToday = async function(userId, data) {
  const today = new Date().toISOString().split('T')[0];
  // Use findOneAndUpdate with upsert – atomic, single round-trip
  const allowedFields = ['people', 'things', 'situations', 'notes'];
  const $set = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) $set[field] = data[field];
  }
  if (Object.keys($set).length === 0) {
    // If no data provided, return existing or null
    return this.getToday(userId);
  }
  return this.findOneAndUpdate(
    { user: userId, date: today },
    { $set },
    { upsert: true, new: true, lean: true, runValidators: true }
  ).exec();
};

/**
 * Get paginated gratitude entries for a user (cursor‑based, no skip)
 * @param {string|ObjectId} userId
 * @param {number} limit - items per page (default 20)
 * @param {string} [cursor] - last document's _id from previous page
 * @param {boolean} excludeNotes - exclude notes field (default true)
 * @returns {Promise<Object>} { entries, nextCursor, hasMore }
 */
gratitudeSchema.statics.getPaginatedEntries = async function(userId, limit = 20, cursor = null, excludeNotes = true) {
  const query = { user: userId };
  if (cursor) query._id = { $lt: cursor };   // because sorted by date descending, but we use _id for cursor safety
  
  // To maintain consistent ordering, we sort by date descending, then by _id descending.
  // Using _id as cursor is simpler: we sort by _id descending (which usually correlates with date).
  const entries = await this.find(query)
    .sort({ _id: -1 })         // descending by insertion (≈ newest first)
    .limit(limit)
    .select(excludeNotes ? 'date people things situations' : 'date people things situations notes')
    .lean()
    .exec();
  
  const nextCursor = entries.length === limit ? entries[entries.length - 1]._id : null;
  return { entries, nextCursor, hasMore: !!nextCursor };
};

/**
 * Get streak of consecutive days with gratitude entries
 * @param {string|ObjectId} userId
 * @returns {Promise<number>} current streak count
 */
gratitudeSchema.statics.getCurrentStreak = async function(userId) {
  const entries = await this.find({ user: userId })
    .sort({ date: -1 })
    .select('date')
    .limit(100)                // reasonable limit to compute streak
    .lean()
    .exec();
  
  if (entries.length === 0) return 0;
  
  let streak = 0;
  let expectedDate = new Date();
  expectedDate.setHours(0, 0, 0, 0);
  const todayStr = expectedDate.toISOString().split('T')[0];
  
  for (let i = 0; i < entries.length; i++) {
    const entryDate = entries[i].date;
    if (i === 0 && entryDate !== todayStr) {
      // Check if yesterday's entry exists to continue streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      if (entryDate !== yesterdayStr) return 0;
      streak = 1;
      expectedDate = yesterday;
    } else {
      const expectedStr = expectedDate.toISOString().split('T')[0];
      if (entryDate === expectedStr) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }
  }
  return streak;
};

/**
 * Delete entry by date (atomic)
 * @param {string|ObjectId} userId
 * @param {string} dateStr
 * @returns {Promise<object>} delete result
 */
gratitudeSchema.statics.deleteByDate = function(userId, dateStr) {
  return this.deleteOne({ user: userId, date: dateStr }).lean().exec();
};

// ========== INSTANCE METHOD (kept for convenience, but not performance critical) ==========
gratitudeSchema.methods.getWordCount = function() {
  const text = `${this.people} ${this.things} ${this.situations} ${this.notes}`;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
};

module.exports = mongoose.model('GratitudeEntry', gratitudeSchema);