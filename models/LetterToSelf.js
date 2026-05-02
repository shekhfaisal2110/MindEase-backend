// const mongoose = require('mongoose');

// const letterSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   content: { type: String, required: true },
//   date: { type: Date, default: Date.now },
//   isRead: { type: Boolean, default: false },
// });

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
}, { timestamps: true }); // optional, adds createdAt, updatedAt

// Compound indexes
letterSchema.index({ user: 1, date: -1 });
letterSchema.index({ user: 1, isRead: 1 });

// TTL index for auto-deletion (optional, adjust seconds)
letterSchema.index({ date: 1 }, { expireAfterSeconds: 31536000 }); // 1 year

// Static method to get paginated letters (caching friendly)
letterSchema.statics.getPaginated = async function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [letters, total] = await Promise.all([
    this.find({ user: userId })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .select('content date isRead')
      .lean(),
    this.countDocuments({ user: userId })
  ]);
  return { letters, total, page, totalPages: Math.ceil(total / limit) };
};

// Static method to get unread count
letterSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ user: userId, isRead: false });
};

// Instance method to mark as read
letterSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    await this.save();
  }
  return this;
};

module.exports = mongoose.model('LetterToSelf', letterSchema);