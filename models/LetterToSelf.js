// const mongoose = require('mongoose');

// const letterSchema = new mongoose.Schema({
//   user: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true,
//     index: true
//   },
//   content: { 
//     type: String, 
//     required: true, 
//     maxlength: 10000,
//     trim: true 
//   },
//   date: { 
//     type: Date, 
//     default: Date.now,
//     index: true
//   },
//   isRead: { 
//     type: Boolean, 
//     default: false,
//     index: true
//   }
// }, { timestamps: true }); // optional, adds createdAt, updatedAt

// // Compound indexes
// letterSchema.index({ user: 1, date: -1 });
// letterSchema.index({ user: 1, isRead: 1 });

// // TTL index for auto-deletion (optional, adjust seconds)
// letterSchema.index({ date: 1 }, { expireAfterSeconds: 31536000 }); // 1 year

// // Static method to get paginated letters (caching friendly)
// letterSchema.statics.getPaginated = async function(userId, page = 1, limit = 20) {
//   const skip = (page - 1) * limit;
//   const [letters, total] = await Promise.all([
//     this.find({ user: userId })
//       .sort({ date: -1 })
//       .skip(skip)
//       .limit(limit)
//       .select('content date isRead')
//       .lean(),
//     this.countDocuments({ user: userId })
//   ]);
//   return { letters, total, page, totalPages: Math.ceil(total / limit) };
// };

// // Static method to get unread count
// letterSchema.statics.getUnreadCount = async function(userId) {
//   return this.countDocuments({ user: userId, isRead: false });
// };

// // Instance method to mark as read
// letterSchema.methods.markAsRead = async function() {
//   if (!this.isRead) {
//     this.isRead = true;
//     await this.save();
//   }
//   return this;
// };

// module.exports = mongoose.model('LetterToSelf', letterSchema);





const mongoose = require('mongoose');

const letterSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,   // adds createdAt, updatedAt
  // Remove __v from JSON output, reduce payload size
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } }
});

// ========== INDEXES (optimized) ==========
// Most common query: user's letters sorted by date (newest first)
letterSchema.index({ user: 1, date: -1 });

// Query unread letters for a user
letterSchema.index({ user: 1, isRead: 1 });

// TTL index for auto-deletion after 1 year (optional)
letterSchema.index({ date: 1 }, { expireAfterSeconds: 31536000 });

// Additional covering index for cursor pagination (uses _id as cursor)
letterSchema.index({ user: 1, _id: 1 });

// ========== STATIC METHODS (optimized with lean & cursor pagination) ==========

/**
 * Get paginated letters using cursor‑based pagination (no skip/limit)
 * Much faster for large collections because it uses index directly.
 * @param {string|ObjectId} userId
 * @param {number} limit - items per page (default 20)
 * @param {string} [cursor] - last document's _id from previous page (optional)
 * @returns {Promise<Object>} { letters, nextCursor, hasMore }
 */
letterSchema.statics.getPaginated = async function(userId, limit = 20, cursor = null) {
  const query = { user: userId };
  if (cursor) query._id = { $lt: cursor };   // because sorted by date descending (newest first), we use _id cursor with descending order

  const letters = await this.find(query)
    .sort({ date: -1, _id: -1 })   // newest first, then by _id descending
    .limit(limit)
    .select('content date isRead createdAt')   // projection: only needed fields
    .lean()                                    // 10x faster
    .exec();

  const nextCursor = letters.length === limit ? letters[letters.length - 1]._id : null;
  return {
    letters,
    nextCursor,
    hasMore: !!nextCursor,
    limit
  };
};

/**
 * Get unread letters count for a user (lean, fast)
 * @param {string|ObjectId} userId
 * @returns {Promise<number>}
 */
letterSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ user: userId, isRead: false })
    .lean()
    .exec();
};

/**
 * Get a single letter by ID with user ownership check (lean)
 * @param {string|ObjectId} letterId
 * @param {string|ObjectId} userId
 * @returns {Promise<object|null>}
 */
letterSchema.statics.getById = async function(letterId, userId) {
  return this.findOne({ _id: letterId, user: userId })
    .lean()
    .exec();
};

/**
 * Mark a letter as read (atomic update, no separate find+save)
 * @param {string|ObjectId} letterId
 * @param {string|ObjectId} userId
 * @returns {Promise<object|null>} updated letter (lean)
 */
letterSchema.statics.markAsRead = async function(letterId, userId) {
  return this.findOneAndUpdate(
    { _id: letterId, user: userId, isRead: false },
    { $set: { isRead: true } },
    { new: true, lean: true, runValidators: false }
  ).exec();
};

/**
 * Mark all letters for a user as read (atomic bulk update)
 * @param {string|ObjectId} userId
 * @returns {Promise<object>} update result
 */
letterSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { user: userId, isRead: false },
    { $set: { isRead: true } },
    { lean: true, runValidators: false }
  ).exec();
};

/**
 * Create a new letter (atomic, lean result)
 * @param {string|ObjectId} userId
 * @param {string} content
 * @returns {Promise<object>} created letter (lean)
 */
letterSchema.statics.createLetter = async function(userId, content) {
  const letter = new this({ user: userId, content });
  await letter.save();
  return letter.toJSON();
};

/**
 * Delete a letter by ID with ownership check (atomic)
 * @param {string|ObjectId} letterId
 * @param {string|ObjectId} userId
 * @returns {Promise<object>} delete result
 */
letterSchema.statics.deleteLetter = async function(letterId, userId) {
  return this.deleteOne({ _id: letterId, user: userId })
    .lean()
    .exec();
};

// ========== INSTANCE METHOD (kept for convenience, but static preferred) ==========
letterSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    const updated = await this.constructor.markAsRead(this._id, this.user);
    if (updated) {
      this.isRead = updated.isRead;
    }
  }
  return this;
};

module.exports = mongoose.model('LetterToSelf', letterSchema);