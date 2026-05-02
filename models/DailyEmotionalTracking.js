// const mongoose = require('mongoose');

// const dailyTrackSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   date: { type: Date, default: Date.now },
//   // Activities completion
//   silenceCompleted: { type: Boolean, default: false },
//   affirmationCompleted: { type: Boolean, default: false },
//   happinessCompleted: { type: Boolean, default: false },
//   exerciseCompleted: { type: Boolean, default: false },
//   readingCompleted: { type: Boolean, default: false },
//   journalingCompleted: { type: Boolean, default: false },
//   // User-written text
//   affirmationText: { type: String, default: '' },
//   journalingText: { type: String, default: '' },
//   notes: { type: String, default: '' },
// });

// module.exports = mongoose.model('DailyEmotionalTracking', dailyTrackSchema);





const mongoose = require('mongoose');

const dailyTrackSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  date: { 
    type: String,  // 'YYYY-MM-DD'
    required: true,
    default: () => new Date().toISOString().split('T')[0]
  },
  // Activities — grouped in sub-document for clarity
  activities: {
    silence: { type: Boolean, default: false },
    affirmation: { type: Boolean, default: false },
    happiness: { type: Boolean, default: false },
    exercise: { type: Boolean, default: false },
    reading: { type: Boolean, default: false },
    journaling: { type: Boolean, default: false }
  },
  // User-written texts — can be large
  affirmationText: { type: String, default: '' },
  journalingText: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

// Unique compound index
dailyTrackSchema.index({ user: 1, date: 1 }, { unique: true });

// Date index for range queries
dailyTrackSchema.index({ date: -1 });

// Static method to get today's tracking (with optional projection)
dailyTrackSchema.statics.getToday = function(userId, excludeText = true) {
  const today = new Date().toISOString().split('T')[0];
  let projection = {};
  if (excludeText) {
    projection = { affirmationText: 0, journalingText: 0, notes: 0 };
  }
  return this.findOne({ user: userId, date: today }, projection).lean();
};

// Static method to toggle an activity
dailyTrackSchema.statics.toggleActivity = async function(userId, date, activityName) {
  const update = { [`activities.${activityName}`]: true }; // assuming we only set true
  return this.updateOne(
    { user: userId, date },
    { $set: update },
    { upsert: true }
  );
};

module.exports = mongoose.model('DailyEmotionalTracking', dailyTrackSchema);