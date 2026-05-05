// const mongoose = require('mongoose');

// const affirmationSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
//   text: { type: String, required: true },
//   category: { type: String, default: 'positive', index: true },
//   count: { type: Number, default: 0 },
//   targetCount: { type: Number, default: 33 },
//   month: { type: String, required: true, index: true },
//   completionDates: [{ type: String }] // YYYY-MM-DD format, duplicate nahi hoga $addToSet se
// }, { timestamps: true });

// // Compound indexes
// affirmationSchema.index({ user: 1, month: 1 });
// affirmationSchema.index({ user: 1, category: 1 });

// // Static method for commonly used query
// affirmationSchema.statics.findByUserAndMonth = function(userId, month, projection = {}) {
//   return this.findOne({ user: userId, month }, projection).lean();
// };

// module.exports = mongoose.model('Affirmation', affirmationSchema);







const mongoose = require('mongoose');

const affirmationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    default: 'positive',
    index: true,
    lowercase: true,
    trim: true
  },
  count: {
    type: Number,
    default: 0,
    min: 0
  },
  targetCount: {
    type: Number,
    default: 33,
    min: 1
  },
  month: {
    type: String,
    required: true,
    index: true,
    match: /^\d{4}-\d{2}$/   // YYYY-MM
  },
  completionDates: {
    type: [String],
    default: [],
    index: true                // for potential queries on dates
  }
}, {
  timestamps: true,
  // Optimize JSON/object transformation
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  // Minimize storage for empty objects
  minimize: false
});

// ========== COMPOUND INDEXES (critical for fast filtering) ==========
affirmationSchema.index({ user: 1, month: 1 });              // Primary lookup
affirmationSchema.index({ user: 1, category: 1 });          // Category filter
affirmationSchema.index({ user: 1, month: 1, category: 1 }); // Full coverage
affirmationSchema.index({ month: 1, count: 1 });            // Analytics

// ========== STATIC METHODS (optimized, lean, projected) ==========
/**
 * Get a single affirmation for a user & month (fastest possible)
 */
affirmationSchema.statics.findByUserAndMonth = function(userId, month, projection = {}) {
  return this.findOne({ user: userId, month }, projection)
    .lean()                // 10x faster than Mongoose documents
    .cache()               // optional: if you add in‑memory cache (see note)
    .exec();
};

/**
 * Get all affirmations for a user with pagination (cursor‑based)
 * @param {string} userId
 * @param {number} limit  - max documents
 * @param {string} cursor - last document's _id for offset‑free pagination
 */
affirmationSchema.statics.getUserAffirmationsPaginated = function(userId, limit = 20, cursor = null) {
  const query = { user: userId };
  if (cursor) query._id = { $gt: cursor };
  
  return this.find(query)
    .sort({ _id: 1 })      // natural order, uses primary index
    .limit(limit)
    .select('text category count targetCount month createdAt completionDates')
    .lean()
    .exec();
};

/**
 * Atomic increment of `count` and conditional add to completionDates
 * Uses $inc and $addToSet, no read‑modify‑write race conditions
 */
affirmationSchema.statics.incrementCountAndAddDate = async function(affirmationId, dateStr) {
  return this.findByIdAndUpdate(
    affirmationId,
    {
      $inc: { count: 1 },
      $addToSet: { completionDates: dateStr }
    },
    { new: true, lean: true, runValidators: false }  // lean + skip validation for speed
  ).exec();
};

/**
 * Bulk update completion targets for a month (e.g., set targetCount to 66)
 */
affirmationSchema.statics.bulkUpdateTargetCount = async function(userId, month, newTarget) {
  return this.updateMany(
    { user: userId, month },
    { $set: { targetCount: newTarget } },
    { lean: true, runValidators: false }
  ).exec();
};

module.exports = mongoose.model('Affirmation', affirmationSchema);