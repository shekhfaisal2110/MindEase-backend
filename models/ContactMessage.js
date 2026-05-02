// const mongoose = require('mongoose');

// const contactMessageSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   username: { type: String, required: true },
//   email: { type: String, required: true },
//   subject: { type: String, required: true },
//   message: { type: String, required: true },
//   adminReply: { type: String, default: '' },
//   status: { type: String, enum: ['pending', 'replied'], default: 'pending' },
//   createdAt: { type: Date, default: Date.now },
//   repliedAt: { type: Date },
// });

// module.exports = mongoose.model('ContactMessage', contactMessageSchema);




const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  username: { type: String, required: true }, // snapshot at time of message
  email: { type: String, required: true },    // snapshot
  subject: { type: String, required: true },
  message: { type: String, required: true },
  adminReply: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'replied'], default: 'pending', index: true },
  createdAt: { type: Date, default: Date.now, index: true },
  repliedAt: { type: Date }
}, { timestamps: true }); // timestamps automatically add createdAt & updatedAt, but we already have createdAt

// Remove duplicate createdAt if using timestamps: true, otherwise keep as is.
// Actually timestamps adds createdAt and updatedAt. So we can remove manual createdAt.
// Better: use timestamps only.

// Improved schema (using timestamps)
const contactMessageSchemaOptimized = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  adminReply: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'replied'], default: 'pending' },
  repliedAt: { type: Date }
}, { timestamps: true }); // createdAt, updatedAt auto

// Indexes
contactMessageSchemaOptimized.index({ status: 1, createdAt: -1 });
contactMessageSchemaOptimized.index({ user: 1, createdAt: -1 });
contactMessageSchemaOptimized.index({ createdAt: -1 });

// TTL index to delete messages after 1 year (optional)
contactMessageSchemaOptimized.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// Static method for admin dashboard
contactMessageSchemaOptimized.statics.getPendingMessages = function(limit = 50) {
  return this.find({ status: 'pending' })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
};

// Instance method to reply
contactMessageSchemaOptimized.methods.reply = async function(replyText) {
  this.adminReply = replyText;
  this.status = 'replied';
  this.repliedAt = new Date();
  await this.save();
};

module.exports = mongoose.model('ContactMessage', contactMessageSchemaOptimized);