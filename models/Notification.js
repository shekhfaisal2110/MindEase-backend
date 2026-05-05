// const mongoose = require('mongoose');

// const notificationSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
//   title: { type: String, required: true, trim: true, maxlength: 100 },
//   message: { type: String, required: true, trim: true, maxlength: 1000 },
//   type: { type: String, enum: ['info', 'success', 'warning', 'system'], default: 'info' },
//   isRead: { type: Boolean, default: false, index: true },
//   createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
// }, { timestamps: true });

// notificationSchema.index({ user: 1, createdAt: -1 });
// notificationSchema.index({ user: 1, isRead: 1 });

// module.exports = mongoose.model('Notification', notificationSchema);




const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'system'],
    default: 'info',
    index: true     // for filtering by type
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  // Remove __v from JSON output, reduce payload size
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  minimize: false
});

// ========== COMPOUND INDEXES (critical for speed) ==========
// Most common query: user's notifications sorted newest first
notificationSchema.index({ user: 1, createdAt: -1 });

// Unread notifications count and retrieval
notificationSchema.index({ user: 1, isRead: 1 });

// Covering index for cursor pagination (user + createdAt + _id)
notificationSchema.index({ user: 1, createdAt: -1, _id: 1 });

// Optional: global index for admin (by type, createdAt)
notificationSchema.index({ type: 1, createdAt: -1 });

// TTL index for auto‑deletion (optional, e.g., delete after 3 months)
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// ========== STATIC METHODS (optimized with lean & cursor pagination) ==========

/**
 * Get user's notifications with cursor‑based pagination (no skip)
 * @param {string|ObjectId} userId
 * @param {number} limit - items per page (default 20)
 * @param {string} [cursor] - last document's _id from previous page
 * @param {boolean} [onlyUnread] - filter only unread notifications
 * @returns {Promise<Object>} { notifications, nextCursor, hasMore, unreadCount }
 */
notificationSchema.statics.getUserNotifications = async function(userId, limit = 20, cursor = null, onlyUnread = false) {
  const query = { user: userId };
  if (onlyUnread) query.isRead = false;
  if (cursor) query._id = { $lt: cursor };   // because sorted by createdAt descending

  const notifications = await this.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .select('title message type isRead createdAt createdBy')
    .lean()                                  // 10x faster
    .exec();

  const nextCursor = notifications.length === limit ? notifications[notifications.length - 1]._id : null;
  const unreadCount = await this.getUnreadCount(userId);
  return {
    notifications,
    nextCursor,
    hasMore: !!nextCursor,
    unreadCount,
    limit
  };
};

/**
 * Get unread notifications count (lean, fast)
 * @param {string|ObjectId} userId
 * @returns {Promise<number>}
 */
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ user: userId, isRead: false })
    .lean()
    .exec();
};

/**
 * Mark a single notification as read (atomic update)
 * @param {string|ObjectId} notificationId
 * @param {string|ObjectId} userId
 * @returns {Promise<object|null>} updated notification (lean)
 */
notificationSchema.statics.markAsRead = async function(notificationId, userId) {
  return this.findOneAndUpdate(
    { _id: notificationId, user: userId, isRead: false },
    { $set: { isRead: true } },
    { new: true, lean: true, runValidators: false }
  ).exec();
};

/**
 * Mark all notifications for a user as read (atomic bulk update)
 * @param {string|ObjectId} userId
 * @returns {Promise<object>} update result
 */
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { user: userId, isRead: false },
    { $set: { isRead: true } },
    { lean: true, runValidators: false }
  ).exec();
};

/**
 * Create a new notification (atomic, lean result)
 * @param {object} notificationData - { user, title, message, type?, createdBy? }
 * @returns {Promise<object>} created notification (lean)
 */
notificationSchema.statics.createNotification = async function(notificationData) {
  const notification = new this(notificationData);
  await notification.save();
  return notification.toJSON();
};

/**
 * Bulk create notifications for multiple users (admin broadcast)
 * @param {Array<{user: string|ObjectId, title: string, message: string, type?: string}>} notifications
 * @returns {Promise<Array>} inserted documents (lean)
 */
notificationSchema.statics.bulkCreate = async function(notifications) {
  const docs = notifications.map(n => ({
    user: n.user,
    title: n.title,
    message: n.message,
    type: n.type || 'info'
  }));
  const inserted = await this.insertMany(docs, { ordered: false, lean: true });
  return inserted;
};

/**
 * Delete old notifications for a user (e.g., clear all read notifications)
 * @param {string|ObjectId} userId
 * @param {boolean} [onlyRead] - if true, delete only read notifications
 * @returns {Promise<object>} delete result
 */
notificationSchema.statics.deleteOld = async function(userId, onlyRead = true) {
  const filter = { user: userId };
  if (onlyRead) filter.isRead = true;
  return this.deleteMany(filter).lean().exec();
};

module.exports = mongoose.model('Notification', notificationSchema);