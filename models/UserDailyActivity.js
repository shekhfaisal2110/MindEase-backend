const mongoose = require('mongoose');

const userDailyActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  pageViews: {
    dashboard: { type: Boolean, default: false },
    affirmations: { type: Boolean, default: false },
    gratitude: { type: Boolean, default: false },
    emotional: { type: Boolean, default: false },
    therapy: { type: Boolean, default: false },
    letters: { type: Boolean, default: false },
    dailytracker: { type: Boolean, default: false },
    hourlyEmotion: { type: Boolean, default: false },
    reactResponse: { type: Boolean, default: false },
    ikigai: { type: Boolean, default: false },
    growthHealing: { type: Boolean, default: false },
  },
  taskCompletions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  routineItems: [{ type: String }],
  hourlyEmotionBlocks: [{ type: String }],
}, { timestamps: true });

userDailyActivitySchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('UserDailyActivity', userDailyActivitySchema);