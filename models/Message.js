// const mongoose = require('mongoose');

// const messageSchema = new mongoose.Schema({
//   sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   content: { type: String, default: '' },
//   imageUrl: { type: String, default: '' },
//   isRead: { type: Boolean, default: false },
//   readAt: { type: Date },
// }, { timestamps: true });

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
}, { timestamps: true });

// Indexes for conversation queries (both directions)
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, sender: 1, createdAt: -1 });

// Index for unread queries
messageSchema.index({ receiver: 1, isRead: 1, createdAt: -1 });

// Index for recent conversations list
messageSchema.index({ receiver: 1, createdAt: -1 });

// TTL index (optional) — delete messages after 1 year
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// Static method to get conversation between two users (paginated)
messageSchema.statics.getConversation = async function(userId1, userId2, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  const messages = await this.find({
    $or: [
      { sender: userId1, receiver: userId2 },
      { sender: userId2, receiver: userId1 }
    ]
  })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .lean();
  return messages.reverse(); // show oldest first for chat UI
};

// Static method to mark all as read
messageSchema.statics.markAsReadForUser = async function(userId, fromUserId = null) {
  const filter = { receiver: userId, isRead: false };
  if (fromUserId) {
    filter.sender = fromUserId;
  }
  return this.updateMany(filter, { $set: { isRead: true, readAt: new Date() } });
};

// Static method to get unread count
messageSchema.statics.getUnreadCount = async function(userId, fromUserId = null) {
  const filter = { receiver: userId, isRead: false };
  if (fromUserId) filter.sender = fromUserId;
  return this.countDocuments(filter);
};

module.exports = mongoose.model('Message', messageSchema);