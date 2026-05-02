// const mongoose = require('mongoose');

// const userActivitySchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   date: { type: Date, required: true },
//   totalPoints: { type: Number, default: 0 },
//   breakdown: {
//     pageView: { type: Number, default: 0 },
//     hourlyEmotion: { type: Number, default: 0 },
//     emotionalCheckIn: { type: Number, default: 0 },
//     gratitude: { type: Number, default: 0 },
//     affirmation: { type: Number, default: 0 },
//     growthHealing: { type: Number, default: 0 },
//     letterToSelf: { type: Number, default: 0 },
//     dailyTask: { type: Number, default: 0 },
//     reactResponse: { type: Number, default: 0 },
//     ikigaiItem: { type: Number, default: 0 },
//   },
// }, { timestamps: true });

// userActivitySchema.index({ user: 1, date: 1 }, { unique: true });

// module.exports = mongoose.model('UserActivity', userActivitySchema);



const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
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
  totalPoints: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  breakdown: {
    pageView: { type: Number, default: 0, min: 0 },
    hourlyEmotion: { type: Number, default: 0, min: 0 },
    emotionalCheckIn: { type: Number, default: 0, min: 0 },
    gratitude: { type: Number, default: 0, min: 0 },
    affirmation: { type: Number, default: 0, min: 0 },
    growthHealing: { type: Number, default: 0, min: 0 },
    letterToSelf: { type: Number, default: 0, min: 0 },
    dailyTask: { type: Number, default: 0, min: 0 },
    reactResponse: { type: Number, default: 0, min: 0 },
    ikigaiItem: { type: Number, default: 0, min: 0 }
  }
}, { timestamps: true });

// Indexes
userActivitySchema.index({ user: 1, date: 1 }, { unique: true });
userActivitySchema.index({ date: -1 });
userActivitySchema.index({ totalPoints: -1 }); // for leaderboard

// Static method to increment activity point
userActivitySchema.statics.incrementActivity = async function(userId, activityType, points = 1) {
  const today = new Date().toISOString().split('T')[0];
  const update = {
    $inc: { totalPoints: points }
  };
  update.$inc[`breakdown.${activityType}`] = 1;
  
  return this.updateOne(
    { user: userId, date: today },
    update,
    { upsert: true }
  );
};

// Static method to get today's points
userActivitySchema.statics.getTodayPoints = async function(userId) {
  const today = new Date().toISOString().split('T')[0];
  const data = await this.findOne(
    { user: userId, date: today },
    { totalPoints: 1, breakdown: 1, _id: 0 }
  ).lean();
  return data || { totalPoints: 0, breakdown: {} };
};

// Static method to get weekly points (last 7 days)
userActivitySchema.statics.getWeeklyPoints = async function(userId) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  const startStr = start.toISOString().split('T')[0];
  const endStr = today.toISOString().split('T')[0];
  
  return this.find(
    { user: userId, date: { $gte: startStr, $lte: endStr } },
    { date: 1, totalPoints: 1 }
  )
  .sort({ date: 1 })
  .lean();
};

module.exports = mongoose.model('UserActivity', userActivitySchema);