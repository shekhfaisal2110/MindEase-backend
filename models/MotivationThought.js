// const mongoose = require('mongoose');

// const motivationThoughtSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
//   thought: { type: String, required: true, trim: true, maxlength: 500 },
//   status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
//   approvedAt: { type: Date },
//   createdAt: { type: Date, default: Date.now, index: true }
// });

// // Compound index for admin queries
// motivationThoughtSchema.index({ status: 1, createdAt: -1 });

// module.exports = mongoose.model('MotivationThought', motivationThoughtSchema);





const mongoose = require('mongoose');

const motivationThoughtSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  thought: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  approvedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,   // adds createdAt & updatedAt (but we already have createdAt; keep for updatedAt)
  // Remove __v from JSON output, reduce payload size
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  minimize: false
});

// ========== COMPOUND INDEXES (critical for speed) ==========
// Most common query: pending thoughts sorted newest first (admin dashboard)
motivationThoughtSchema.index({ status: 1, createdAt: -1 });

// User's own thoughts (paginated)
motivationThoughtSchema.index({ user: 1, createdAt: -1 });

// Approved thoughts for public display (if needed)
motivationThoughtSchema.index({ status: 1, approvedAt: -1 });

// Covering index for cursor pagination (user + status + _id)
motivationThoughtSchema.index({ user: 1, status: 1, _id: 1 });

// ========== STATIC METHODS (optimized with lean & cursor pagination) ==========

/**
 * Get pending thoughts for admin (cursor‑based, no skip)
 * @param {number} limit - items per page (default 50)
 * @param {string} [cursor] - last document _id from previous page
 * @returns {Promise<Object>} { thoughts, nextCursor, hasMore }
 */
motivationThoughtSchema.statics.getPendingThoughts = async function(limit = 50, cursor = null) {
  const query = { status: 'pending' };
  if (cursor) query._id = { $gt: cursor };   // because sorted by createdAt descending, we use _id cursor with _id order

  const thoughts = await this.find(query)
    .sort({ createdAt: -1, _id: -1 })       // newest first
    .limit(limit)
    .select('user thought createdAt')
    .populate('user', 'username email')     // optionally populate, but lean still works
    .lean()                                  // 10x faster
    .exec();

  const nextCursor = thoughts.length === limit ? thoughts[thoughts.length - 1]._id : null;
  return { thoughts, nextCursor, hasMore: !!nextCursor };
};

/**
 * Get thoughts for a specific user (paginated, cursor‑based)
 * @param {string|ObjectId} userId
 * @param {number} limit
 * @param {string} [cursor]
 * @returns {Promise<Object>} { thoughts, nextCursor, hasMore }
 */
motivationThoughtSchema.statics.getUserThoughts = async function(userId, limit = 20, cursor = null) {
  const query = { user: userId };
  if (cursor) query._id = { $lt: cursor };   // because sorted by createdAt descending

  const thoughts = await this.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .select('thought status createdAt approvedAt')
    .lean()
    .exec();

  const nextCursor = thoughts.length === limit ? thoughts[thoughts.length - 1]._id : null;
  return { thoughts, nextCursor, hasMore: !!nextCursor };
};

/**
 * Approve a thought (atomic update, no separate find+save)
 * @param {string|ObjectId} thoughtId
 * @returns {Promise<object|null>} updated thought (lean)
 */
motivationThoughtSchema.statics.approve = async function(thoughtId) {
  return this.findByIdAndUpdate(
    thoughtId,
    { $set: { status: 'approved', approvedAt: new Date() } },
    { new: true, lean: true, runValidators: false }
  ).exec();
};

/**
 * Reject a thought (atomic update)
 * @param {string|ObjectId} thoughtId
 * @returns {Promise<object|null>} updated thought (lean)
 */
motivationThoughtSchema.statics.reject = async function(thoughtId) {
  return this.findByIdAndUpdate(
    thoughtId,
    { $set: { status: 'rejected' } },
    { new: true, lean: true, runValidators: false }
  ).exec();
};

/**
 * Create a new thought (atomic, lean result)
 * @param {string|ObjectId} userId
 * @param {string} thoughtText
 * @returns {Promise<object>} created thought (lean)
 */
motivationThoughtSchema.statics.createThought = async function(userId, thoughtText) {
  const thought = new this({ user: userId, thought: thoughtText });
  await thought.save();
  return thought.toJSON();
};

/**
 * Get count of pending thoughts (for admin badge)
 * @returns {Promise<number>}
 */
motivationThoughtSchema.statics.getPendingCount = function() {
  return this.countDocuments({ status: 'pending' }).lean().exec();
};

module.exports = mongoose.model('MotivationThought', motivationThoughtSchema);