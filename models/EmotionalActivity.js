const mongoose = require('mongoose');

const emotionalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  emotion: { type: String },      // e.g., happy, sad, anxious
  intensity: { type: Number, min: 1, max: 10 },
  note: { type: String },
});

module.exports = mongoose.model('EmotionalActivity', emotionalSchema);