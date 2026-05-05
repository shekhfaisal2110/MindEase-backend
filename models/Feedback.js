// const mongoose = require('mongoose');

// const feedbackSchema = new mongoose.Schema({
//   user: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true,
//     index: true
//   },
//   username: { 
//     type: String, 
//     required: true,
//     trim: true,
//     maxlength: 100
//   },
//   rating: { 
//     type: Number, 
//     required: true, 
//     min: 1, 
//     max: 5,
//     validate: {
//       validator: Number.isInteger,
//       message: 'Rating must be an integer between 1 and 5'
//     }
//   },
//   comment: { 
//     type: String, 
//     required: true, 
//     maxlength: 2000,
//     trim: true
//   },
//   isApproved: { 
//     type: Boolean, 
//     default: false,
//     index: true
//   }
// }, { timestamps: true }); // adds createdAt and updatedAt automatically

// // Compound indexes for common queries
// feedbackSchema.index({ isApproved: 1, createdAt: -1 });
// feedbackSchema.index({ user: 1, createdAt: -1 });
// feedbackSchema.index({ isApproved: 1, rating: -1, createdAt: -1 });

// // Static method to get approved feedbacks with pagination (caching friendly)
// feedbackSchema.statics.getApprovedFeedbacks = async function(page = 1, limit = 20) {
//   const skip = (page - 1) * limit;
//   const [feedbacks, total] = await Promise.all([
//     this.find({ isApproved: true })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .select('username rating comment createdAt') // projection
//       .lean(),
//     this.countDocuments({ isApproved: true })
//   ]);
//   return { feedbacks, total, page, totalPages: Math.ceil(total / limit) };
// };

// // Static method to get average rating (with cache invalidation in mind)
// feedbackSchema.statics.getAverageRating = async function() {
//   const result = await this.aggregate([
//     { $match: { isApproved: true } },
//     { $group: { _id: null, avgRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } }
//   ]);
//   return result[0] || { avgRating: 0, totalReviews: 0 };
// };

// // Instance method to approve (admin action)
// feedbackSchema.methods.approve = async function() {
//   this.isApproved = true;
//   await this.save();
//   // Invalidate caches in controller after calling this
//   return this;
// };

// module.exports = mongoose.model('Feedback', feedbackSchema);



const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true   // for user‑search
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be an integer between 1 and 5'
    }
  },
  comment: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true
  },
  isApproved: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,   // adds createdAt and updatedAt
  // Remove __v from JSON output, reduce payload size
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  minimize: false
});

// ========== COMPOUND INDEXES (critical for speed) ==========
// Most common query: approved feedbacks sorted newest first
feedbackSchema.index({ isApproved: 1, createdAt: -1 });

// User's own feedback history
feedbackSchema.index({ user: 1, createdAt: -1 });

// Top‑rated approved feedbacks (e.g., for testimonials)
feedbackSchema.index({ isApproved: 1, rating: -1, createdAt: -1 });

// Additional covering index for cursor pagination (uses _id as cursor with createdAt)
feedbackSchema.index({ isApproved: 1, _id: 1 });

// For average rating aggregation – already covered by isApproved index

// ========== STATIC METHODS (optimized with lean & cursor pagination) ==========

/**
 * Get approved feedbacks using cursor‑based pagination (no skip/limit)
 * Much faster for large collections because it uses index directly.
 * @param {number} limit - items per page (default 20)
 * @param {string} [cursor] - last _id from previous page (optional)
 * @returns {Promise<Object>} { feedbacks, nextCursor, hasMore }
 */
feedbackSchema.statics.getApprovedFeedbacks = async function(limit = 20, cursor = null) {
  const query = { isApproved: true };
  if (cursor) query._id = { $gt: cursor };
  
  const feedbacks = await this.find(query)
    .sort({ _id: 1 })           // natural order (←→ createdAt ordering with index)
    .limit(limit)
    .select('username rating comment createdAt')
    .lean()                      // 10x faster
    .exec();
  
  const nextCursor = feedbacks.length === limit ? feedbacks[feedbacks.length - 1]._id : null;
  return {
    feedbacks,
    nextCursor,
    hasMore: !!nextCursor,
    limit
  };
};

/**
 * Get approved feedbacks sorted by rating (highest first) with cursor pagination
 * @param {number} limit
 * @param {string} [cursor] - compound cursor: `${rating}_${_id}` (simplified: we use rating + _id)
 * @returns {Promise<Object>}
 */
feedbackSchema.statics.getTopRatedFeedbacks = async function(limit = 20, cursor = null) {
  const query = { isApproved: true };
  if (cursor) {
    const [rating, id] = cursor.split('_');
    query.$or = [
      { rating: { $lt: parseInt(rating) } },
      { rating: parseInt(rating), _id: { $gt: id } }
    ];
  }
  
  const feedbacks = await this.find(query)
    .sort({ rating: -1, _id: 1 })
    .limit(limit)
    .select('username rating comment createdAt')
    .lean()
    .exec();
  
  let nextCursor = null;
  if (feedbacks.length === limit) {
    const last = feedbacks[feedbacks.length - 1];
    nextCursor = `${last.rating}_${last._id}`;
  }
  return { feedbacks, nextCursor, hasMore: !!nextCursor, limit };
};

/**
 * Get feedbacks for a specific user (with cursor pagination)
 * @param {string|ObjectId} userId
 * @param {number} limit
 * @param {string} [cursor]
 * @returns {Promise<Object>}
 */
feedbackSchema.statics.getUserFeedbacks = async function(userId, limit = 20, cursor = null) {
  const query = { user: userId };
  if (cursor) query._id = { $lt: cursor };
  
  const feedbacks = await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('rating comment isApproved createdAt')
    .lean()
    .exec();
  
  const nextCursor = feedbacks.length === limit ? feedbacks[feedbacks.length - 1]._id : null;
  return { feedbacks, nextCursor, hasMore: !!nextCursor };
};

/**
 * Get average rating and total reviews (optimised aggregation)
 * Uses indexed `isApproved` for fast match.
 * @returns {Promise<Object>} { avgRating, totalReviews }
 */
feedbackSchema.statics.getAverageRating = async function() {
  const result = await this.aggregate([
    { $match: { isApproved: true } },
    { $group: { _id: null, avgRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } }
  ], { allowDiskUse: false }).exec();
  return result[0] || { avgRating: 0, totalReviews: 0 };
};

/**
 * Create a new feedback (atomic, lean)
 * @param {object} feedbackData
 * @returns {Promise<object>} lean created feedback
 */
feedbackSchema.statics.createFeedback = async function(feedbackData) {
  const feedback = new this(feedbackData);
  await feedback.save();
  return feedback.toJSON();
};

/**
 * Approve a feedback (atomic update, no separate find+save)
 * @param {string|ObjectId} feedbackId
 * @returns {Promise<object|null>} updated feedback (lean)
 */
feedbackSchema.statics.approveFeedback = async function(feedbackId) {
  return this.findByIdAndUpdate(
    feedbackId,
    { $set: { isApproved: true } },
    { new: true, lean: true, runValidators: false }
  ).exec();
};

/**
 * Bulk approve multiple feedbacks (admin utility)
 * @param {string[]} feedbackIds
 * @returns {Promise<object>} update result
 */
feedbackSchema.statics.bulkApprove = async function(feedbackIds) {
  return this.updateMany(
    { _id: { $in: feedbackIds }, isApproved: false },
    { $set: { isApproved: true } },
    { lean: true, runValidators: false }
  ).exec();
};

/**
 * Delete feedback by ID with ownership check
 * @param {string|ObjectId} feedbackId
 * @param {string|ObjectId} userId
 * @returns {Promise<object>} delete result
 */
feedbackSchema.statics.deleteUserFeedback = async function(feedbackId, userId) {
  return this.deleteOne({ _id: feedbackId, user: userId }).lean().exec();
};

// ========== INSTANCE METHODS (kept for backward compatibility, but static preferred) ==========
feedbackSchema.methods.approve = async function() {
  const updated = await this.constructor.approveFeedback(this._id);
  if (updated) {
    this.isApproved = updated.isApproved;
  }
  return this;
};

module.exports = mongoose.model('Feedback', feedbackSchema);