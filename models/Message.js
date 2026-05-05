// const mongoose = require('mongoose');

// const messageSchema = new mongoose.Schema({
//   sender: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true,
//     index: true
//   },
//   receiver: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true,
//     index: true
//   },
//   content: { 
//     type: String, 
//     default: '', 
//     maxlength: 2000,
//     trim: true 
//   },
//   imageUrl: { 
//     type: String, 
//     default: '',
//     maxlength: 500
//   },
//   isRead: { 
//     type: Boolean, 
//     default: false,
//     index: true
//   },
//   readAt: { 
//     type: Date,
//     default: null
//   }
// }, { timestamps: true });

// // Indexes for conversation queries (both directions)
// messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
// messageSchema.index({ receiver: 1, sender: 1, createdAt: -1 });

// // Index for unread queries
// messageSchema.index({ receiver: 1, isRead: 1, createdAt: -1 });

// // Index for recent conversations list
// messageSchema.index({ receiver: 1, createdAt: -1 });

// // TTL index (optional) — delete messages after 1 year
// messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// // Static method to get conversation between two users (paginated)
// messageSchema.statics.getConversation = async function(userId1, userId2, page = 1, limit = 50) {
//   const skip = (page - 1) * limit;
//   const messages = await this.find({
//     $or: [
//       { sender: userId1, receiver: userId2 },
//       { sender: userId2, receiver: userId1 }
//     ]
//   })
//   .sort({ createdAt: -1 })
//   .skip(skip)
//   .limit(limit)
//   .lean();
//   return messages.reverse(); // show oldest first for chat UI
// };

// // Static method to mark all as read
// messageSchema.statics.markAsReadForUser = async function(userId, fromUserId = null) {
//   const filter = { receiver: userId, isRead: false };
//   if (fromUserId) {
//     filter.sender = fromUserId;
//   }
//   return this.updateMany(filter, { $set: { isRead: true, readAt: new Date() } });
// };

// // Static method to get unread count
// messageSchema.statics.getUnreadCount = async function(userId, fromUserId = null) {
//   const filter = { receiver: userId, isRead: false };
//   if (fromUserId) filter.sender = fromUserId;
//   return this.countDocuments(filter);
// };

// module.exports = mongoose.model('Message', messageSchema);

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    default: '',
    maxlength: 2000,
    trim: true
  },
  imageUrl: {
    type: String,
    default: '',
    maxlength: 500
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  // Remove __v from JSON output, reduce payload size
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } }
});

// ========== INDEXES (optimized) ==========
// Conversation queries (both directions) – used for pagination
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, sender: 1, createdAt: -1 });

// Unread messages count and marking as read
messageSchema.index({ receiver: 1, isRead: 1, createdAt: -1 });

// Recent conversations list (for inbox)
messageSchema.index({ receiver: 1, createdAt: -1 });

// TTL index: auto‑delete messages after 1 year (optional)
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// Covering index for cursor pagination on conversation (uses _id as cursor)
messageSchema.index({ sender: 1, receiver: 1, _id: 1 });
messageSchema.index({ receiver: 1, sender: 1, _id: 1 });

// ========== STATIC METHODS (optimized with lean & cursor pagination) ==========

/**
 * Get conversation between two users using cursor‑based pagination (no skip/limit)
 * Avoids O(N) skip and uses index on (sender, receiver, _id) or (receiver, sender, _id)
 * @param {string|ObjectId} userId1
 * @param {string|ObjectId} userId2
 * @param {number} limit - messages per page (default 50)
 * @param {string} [cursor] - last message _id from previous page (optional)
 * @returns {Promise<Object>} { messages, nextCursor, hasMore }
 */
messageSchema.statics.getConversation = async function(userId1, userId2, limit = 50, cursor = null) {
  const query = {
    $or: [
      { sender: userId1, receiver: userId2 },
      { sender: userId2, receiver: userId1 }
    ]
  };
  if (cursor) query._id = { $lt: cursor };   // because we sort by createdAt descending (newest first), _id descending correlates

  const messages = await this.find(query)
    .sort({ createdAt: -1, _id: -1 })        // newest first for efficient pagination
    .limit(limit)
    .select('sender receiver content imageUrl isRead readAt createdAt')  // projection
    .lean()                                  // 10x faster
    .exec();

  // Reverse to show oldest first in UI (client can also handle)
  const reversed = messages.slice().reverse();
  const nextCursor = messages.length === limit ? messages[messages.length - 1]._id : null;
  return {
    messages: reversed,
    nextCursor,
    hasMore: !!nextCursor,
    limit
  };
};

/**
 * Mark messages as read (atomic updateMany)
 * @param {string|ObjectId} userId - receiver
 * @param {string|ObjectId} [fromUserId] - optional, only mark from a specific sender
 * @returns {Promise<object>} update result
 */
messageSchema.statics.markAsReadForUser = async function(userId, fromUserId = null) {
  const filter = { receiver: userId, isRead: false };
  if (fromUserId) filter.sender = fromUserId;
  return this.updateMany(
    filter,
    { $set: { isRead: true, readAt: new Date() } },
    { lean: true, runValidators: false }
  ).exec();
};

/**
 * Get unread message count for a user (or from a specific sender)
 * @param {string|ObjectId} userId
 * @param {string|ObjectId} [fromUserId]
 * @returns {Promise<number>}
 */
messageSchema.statics.getUnreadCount = async function(userId, fromUserId = null) {
  const filter = { receiver: userId, isRead: false };
  if (fromUserId) filter.sender = fromUserId;
  return this.countDocuments(filter).lean().exec();
};

/**
 * Send a new message (create and return lean document)
 * @param {object} messageData - { sender, receiver, content, imageUrl? }
 * @returns {Promise<object>} lean created message
 */
messageSchema.statics.sendMessage = async function(messageData) {
  const message = new this(messageData);
  await message.save();
  return message.toJSON();
};

/**
 * Get the latest conversation message between two users (for preview)
 * @param {string|ObjectId} userId1
 * @param {string|ObjectId} userId2
 * @returns {Promise<object|null>} latest message (lean)
 */
messageSchema.statics.getLatestMessage = async function(userId1, userId2) {
  return this.findOne({
    $or: [
      { sender: userId1, receiver: userId2 },
      { sender: userId2, receiver: userId1 }
    ]
  })
    .sort({ createdAt: -1 })
    .select('sender receiver content createdAt isRead')
    .lean()
    .exec();
};

/**
 * Delete a message (with ownership check – only sender can delete)
 * @param {string|ObjectId} messageId
 * @param {string|ObjectId} senderId
 * @returns {Promise<object>} delete result
 */
messageSchema.statics.deleteMessage = async function(messageId, senderId) {
  return this.deleteOne({ _id: messageId, sender: senderId })
    .lean()
    .exec();
};

module.exports = mongoose.model('Message', messageSchema);