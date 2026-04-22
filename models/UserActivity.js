const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  totalPoints: { type: Number, default: 0 },
  breakdown: {
    pageView: { type: Number, default: 0 },
    hourlyEmotion: { type: Number, default: 0 },
    emotionalCheckIn: { type: Number, default: 0 },
    gratitude: { type: Number, default: 0 },
    affirmation: { type: Number, default: 0 },
    growthHealing: { type: Number, default: 0 },
    letterToSelf: { type: Number, default: 0 },
    dailyTask: { type: Number, default: 0 },
    reactResponse: { type: Number, default: 0 },
    ikigaiItem: { type: Number, default: 0 },
  },
}, { timestamps: true });

userActivitySchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('UserActivity', userActivitySchema);