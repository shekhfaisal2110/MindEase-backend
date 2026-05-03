const mongoose = require('mongoose');

const thoughtRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true, index: true }, // YYYY-MM-DD
  situation: { type: String, required: true, trim: true, maxlength: 1000 },
  automaticThoughts: { type: String, required: true, trim: true, maxlength: 1500 },
  feelings: [{
    emotion: { type: String, required: true },
    intensity: { type: Number, min: 0, max: 10, required: true }
  }],
  cognitiveDistortions: [{ type: String }], // e.g., 'all-or-nothing', 'overgeneralization', etc.
  balancedResponse: { type: String, trim: true, maxlength: 2000 },
  outcomeEmotions: [{
    emotion: { type: String, required: true },
    intensity: { type: Number, min: 0, max: 10, required: true }
  }],
  createdAt: { type: Date, default: Date.now }
});

// Indexes for fast querying
thoughtRecordSchema.index({ user: 1, date: -1 });
thoughtRecordSchema.index({ "feelings.emotion": 1 });
thoughtRecordSchema.index({ "outcomeEmotions.emotion": 1 });

module.exports = mongoose.model('ThoughtRecord', thoughtRecordSchema);