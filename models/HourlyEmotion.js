const mongoose = require('mongoose');

const hourlyEmotionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true }, // date only (without time)
  hourBlock: { type: String, required: true }, // e.g., "6-8", "8-10"
  emotion: { type: String, enum: ['positive', 'negative', 'neutral'], required: true },
}, { timestamps: true });

// Unique per user per date per hourBlock
hourlyEmotionSchema.index({ user: 1, date: 1, hourBlock: 1 }, { unique: true });

module.exports = mongoose.model('HourlyEmotion', hourlyEmotionSchema);