const mongoose = require('mongoose');

const dailyTrackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  // Activities completion
  silenceCompleted: { type: Boolean, default: false },
  affirmationCompleted: { type: Boolean, default: false },
  happinessCompleted: { type: Boolean, default: false },
  exerciseCompleted: { type: Boolean, default: false },
  readingCompleted: { type: Boolean, default: false },
  journalingCompleted: { type: Boolean, default: false },
  // User-written text
  affirmationText: { type: String, default: '' },
  journalingText: { type: String, default: '' },
  notes: { type: String, default: '' },
});

module.exports = mongoose.model('DailyEmotionalTracking', dailyTrackSchema);