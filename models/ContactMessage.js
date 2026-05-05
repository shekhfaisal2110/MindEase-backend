// const mongoose = require('mongoose');

// const contactMessageSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
//   username: { type: String, required: true }, // snapshot at time of message
//   email: { type: String, required: true },    // snapshot
//   subject: { type: String, required: true },
//   message: { type: String, required: true },
//   adminReply: { type: String, default: '' },
//   status: { type: String, enum: ['pending', 'replied'], default: 'pending', index: true },
//   createdAt: { type: Date, default: Date.now, index: true },
//   repliedAt: { type: Date }
// }, { timestamps: true }); // timestamps automatically add createdAt & updatedAt, but we already have createdAt

// // Remove duplicate createdAt if using timestamps: true, otherwise keep as is.
// // Actually timestamps adds createdAt and updatedAt. So we can remove manual createdAt.
// // Better: use timestamps only.

// // Improved schema (using timestamps)
// const contactMessageSchemaOptimized = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   username: { type: String, required: true },
//   email: { type: String, required: true },
//   subject: { type: String, required: true },
//   message: { type: String, required: true },
//   adminReply: { type: String, default: '' },
//   status: { type: String, enum: ['pending', 'replied'], default: 'pending' },
//   repliedAt: { type: Date }
// }, { timestamps: true }); // createdAt, updatedAt auto

// // Indexes
// contactMessageSchemaOptimized.index({ status: 1, createdAt: -1 });
// contactMessageSchemaOptimized.index({ user: 1, createdAt: -1 });
// contactMessageSchemaOptimized.index({ createdAt: -1 });

// // TTL index to delete messages after 1 year (optional)
// contactMessageSchemaOptimized.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// // Static method for admin dashboard
// contactMessageSchemaOptimized.statics.getPendingMessages = function(limit = 50) {
//   return this.find({ status: 'pending' })
//     .sort({ createdAt: 1 })
//     .limit(limit)
//     .lean();
// };

// // Instance method to reply
// contactMessageSchemaOptimized.methods.reply = async function(replyText) {
//   this.adminReply = replyText;
//   this.status = 'replied';
//   this.repliedAt = new Date();
//   await this.save();
// };

// module.exports = mongoose.model('ContactMessage', contactMessageSchemaOptimized);




const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
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
    index: true   // for searching by username
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true   // for searching by email
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  adminReply: {
    type: String,
    default: '',
    trim: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['pending', 'replied'],
    default: 'pending',
    index: true
  },
  repliedAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,   // adds createdAt & updatedAt automatically
  // Remove __v from JSON output, reduce payload size
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } }
});

// ========== COMPOUND INDEXES (critical for speed) ==========
// Most common admin query: pending messages, oldest first
contactMessageSchema.index({ status: 1, createdAt: 1 });

// User's message history (most recent first)
contactMessageSchema.index({ user: 1, createdAt: -1 });

// Global recent messages (admin dashboard)
contactMessageSchema.index({ createdAt: -1 });

// Searching by email or username with date sorting
contactMessageSchema.index({ email: 1, createdAt: -1 });
contactMessageSchema.index({ username: 1, createdAt: -1 });

// TTL index: auto-delete messages after 1 year (optional, reduces storage)
contactMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// ========== STATIC METHODS (optimized with lean & projection) ==========

/**
 * Get pending messages for admin (lean, paginated, cursor-based)
 * @param {number} limit - max messages per page
 * @param {string} [cursor] - last message _id for pagination
 * @returns {Promise<Object>} { messages, nextCursor }
 */
contactMessageSchema.statics.getPendingMessages = async function(limit = 50, cursor = null) {
  const query = { status: 'pending' };
  if (cursor) query._id = { $gt: cursor };
  
  const messages = await this.find(query)
    .select('user username email subject message createdAt')  // only needed fields
    .sort({ createdAt: 1 })   // oldest first
    .limit(limit)
    .lean()                   // 10x faster
    .exec();
  
  const nextCursor = messages.length === limit ? messages[messages.length - 1]._id : null;
  return { messages, nextCursor, hasMore: !!nextCursor };
};

/**
 * Get messages for a specific user (paginated, most recent first)
 * @param {string|ObjectId} userId
 * @param {number} limit
 * @param {string} [cursor]
 * @returns {Promise<Object>}
 */
contactMessageSchema.statics.getUserMessages = async function(userId, limit = 20, cursor = null) {
  const query = { user: userId };
  if (cursor) query._id = { $lt: cursor };  // because sorted by -createdAt
  
  const messages = await this.find(query)
    .select('subject message adminReply status createdAt repliedAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .exec();
  
  const nextCursor = messages.length === limit ? messages[messages.length - 1]._id : null;
  return { messages, nextCursor, hasMore: !!nextCursor };
};

/**
 * Get a single message by ID (with user ownership check)
 * @param {string|ObjectId} messageId
 * @param {string|ObjectId} [userId] - if provided, ensures user owns it
 * @returns {Promise<object|null>}
 */
contactMessageSchema.statics.getMessageById = function(messageId, userId = null) {
  const query = { _id: messageId };
  if (userId) query.user = userId;
  return this.findOne(query).lean().exec();
};

/**
 * Reply to a message (atomic update, no separate find+save)
 * @param {string|ObjectId} messageId
 * @param {string} replyText
 * @returns {Promise<object|null>} updated message (lean)
 */
contactMessageSchema.statics.replyToMessage = async function(messageId, replyText) {
  return this.findByIdAndUpdate(
    messageId,
    {
      $set: {
        adminReply: replyText,
        status: 'replied',
        repliedAt: new Date()
      }
    },
    { new: true, lean: true, runValidators: false }   // skip validation for speed
  ).exec();
};

/**
 * Bulk update status for multiple messages (e.g., mark as replied)
 * @param {string[]} messageIds
 * @param {string} newStatus
 * @returns {Promise<object>} update result
 */
contactMessageSchema.statics.bulkUpdateStatus = function(messageIds, newStatus) {
  return this.updateMany(
    { _id: { $in: messageIds }, status: { $ne: newStatus } },
    { $set: { status: newStatus, repliedAt: newStatus === 'replied' ? new Date() : null } },
    { lean: true, runValidators: false }
  ).exec();
};

/**
 * Count pending messages (for badge/notification)
 * @returns {Promise<number>}
 */
contactMessageSchema.statics.countPending = function() {
  return this.countDocuments({ status: 'pending' }).lean().exec();
};

/**
 * Create a new contact message (with minimal validation)
 * @param {object} messageData
 * @returns {Promise<object>} lean created message
 */
contactMessageSchema.statics.createMessage = async function(messageData) {
  const message = new this(messageData);
  await message.save();
  return message.toJSON();   // lean output
};

// ========== INSTANCE METHODS (kept for convenience but static preferred) ==========
contactMessageSchema.methods.reply = async function(replyText) {
  // Use static method for atomic update
  const updated = await this.constructor.replyToMessage(this._id, replyText);
  Object.assign(this, updated);
  return this;
};

module.exports = mongoose.model('ContactMessage', contactMessageSchema);