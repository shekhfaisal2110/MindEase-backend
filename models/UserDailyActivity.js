// const mongoose = require('mongoose');

// const userDailyActivitySchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   date: { type: Date, required: true },
//   pageViews: {
//     dashboard: { type: Boolean, default: false },
//     affirmations: { type: Boolean, default: false },
//     gratitude: { type: Boolean, default: false },
//     emotional: { type: Boolean, default: false },
//     therapy: { type: Boolean, default: false },
//     letters: { type: Boolean, default: false },
//     dailytracker: { type: Boolean, default: false },
//     hourlyEmotion: { type: Boolean, default: false },
//     reactResponse: { type: Boolean, default: false },
//     ikigai: { type: Boolean, default: false },
//     growthHealing: { type: Boolean, default: false },
//   },
//   taskCompletions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
//   routineItems: [{ type: String }],
//   hourlyEmotionBlocks: [{ type: String }],
// }, { timestamps: true });

// userDailyActivitySchema.index({ user: 1, date: 1 }, { unique: true });

// module.exports = mongoose.model('UserDailyActivity', userDailyActivitySchema);



const mongoose = require('mongoose');

// Validators
const routineItemsLimit = (val) => val.length <= 50;
const hourlyEmotionBlocksLimit = (val) => val.length <= 24;
const taskCompletionsLimit = (val) => val.length <= 500; // soft limit, but use $slice for better performance

const userDailyActivitySchema = new mongoose.Schema({
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
  // Use numbers (counts) instead of booleans if you need frequency
  pageViews: {
    dashboard: { type: Number, default: 0, min: 0 },
    affirmations: { type: Number, default: 0, min: 0 },
    gratitude: { type: Number, default: 0, min: 0 },
    emotional: { type: Number, default: 0, min: 0 },
    therapy: { type: Number, default: 0, min: 0 },
    letters: { type: Number, default: 0, min: 0 },
    dailytracker: { type: Number, default: 0, min: 0 },
    hourlyEmotion: { type: Number, default: 0, min: 0 },
    reactResponse: { type: Number, default: 0, min: 0 },
    ikigai: { type: Number, default: 0, min: 0 },
    growthHealing: { type: Number, default: 0, min: 0 }
  },
  taskCompletions: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    default: []
    // No validation; we'll use $slice on updates to cap size
  },
  routineItems: {
    type: [String],
    default: [],
    validate: [routineItemsLimit, 'Routine items cannot exceed 50']
  },
  hourlyEmotionBlocks: {
    type: [String],
    default: [],
    validate: [hourlyEmotionBlocksLimit, 'Hourly emotion blocks cannot exceed 24']
  }
}, { timestamps: true });

// Indexes
userDailyActivitySchema.index({ user: 1, date: 1 }, { unique: true });
userDailyActivitySchema.index({ date: -1 }); // optional

// Static method to increment page view count
userDailyActivitySchema.statics.incrementPageView = async function(userId, pageName) {
  const today = new Date().toISOString().split('T')[0];
  const update = { $inc: {} };
  update.$inc[`pageViews.${pageName}`] = 1;
  return this.updateOne(
    { user: userId, date: today },
    update,
    { upsert: true }
  );
};

// Static method to add task completion (keeps last 100)
userDailyActivitySchema.statics.addTaskCompletion = async function(userId, taskId) {
  const today = new Date().toISOString().split('T')[0];
  return this.updateOne(
    { user: userId, date: today },
    { $push: { taskCompletions: { $each: [taskId], $slice: -100 } } },
    { upsert: true }
  );
};

// Static method to add routine item (no duplicates)
userDailyActivitySchema.statics.addRoutineItem = async function(userId, item) {
  const today = new Date().toISOString().split('T')[0];
  return this.updateOne(
    { user: userId, date: today },
    { $addToSet: { routineItems: item } },
    { upsert: true }
  );
};

// Static method to get today's activity summary
userDailyActivitySchema.statics.getToday = async function(userId) {
  const today = new Date().toISOString().split('T')[0];
  return this.findOne({ user: userId, date: today })
    .select('pageViews taskCompletions routineItems hourlyEmotionBlocks')
    .lean();
};

module.exports = mongoose.model('UserDailyActivity', userDailyActivitySchema);