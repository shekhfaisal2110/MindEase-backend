const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  adminReply: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'replied'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  repliedAt: { type: Date },
});

module.exports = mongoose.model('ContactMessage', contactMessageSchema);