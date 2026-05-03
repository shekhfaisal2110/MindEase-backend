const mongoose = require('mongoose');

const motivationThoughtSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  thought: { type: String, required: true, trim: true, maxlength: 500 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  approvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Compound index for admin queries
motivationThoughtSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('MotivationThought', motivationThoughtSchema);