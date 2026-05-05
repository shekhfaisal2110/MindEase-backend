// const mongoose = require('mongoose');

// const dailyTrackSchema = new mongoose.Schema({
//   user: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true,
//     index: true
//   },
//   date: { 
//     type: String,  // 'YYYY-MM-DD'
//     required: true,
//     default: () => new Date().toISOString().split('T')[0]
//   },
//   // Activities — grouped in sub-document for clarity
//   activities: {
//     silence: { type: Boolean, default: false },
//     affirmation: { type: Boolean, default: false },
//     happiness: { type: Boolean, default: false },
//     exercise: { type: Boolean, default: false },
//     reading: { type: Boolean, default: false },
//     journaling: { type: Boolean, default: false }
//   },
//   // User-written texts — can be large
//   affirmationText: { type: String, default: '' },
//   journalingText: { type: String, default: '' },
//   notes: { type: String, default: '' }
// }, { timestamps: true });

// // Unique compound index
// dailyTrackSchema.index({ user: 1, date: 1 }, { unique: true });

// // Date index for range queries
// dailyTrackSchema.index({ date: -1 });

// // Static method to get today's tracking (with optional projection)
// dailyTrackSchema.statics.getToday = function(userId, excludeText = true) {
//   const today = new Date().toISOString().split('T')[0];
//   let projection = {};
//   if (excludeText) {
//     projection = { affirmationText: 0, journalingText: 0, notes: 0 };
//   }
//   return this.findOne({ user: userId, date: today }, projection).lean();
// };

// // Static method to toggle an activity
// dailyTrackSchema.statics.toggleActivity = async function(userId, date, activityName) {
//   const update = { [`activities.${activityName}`]: true }; // assuming we only set true
//   return this.updateOne(
//     { user: userId, date },
//     { $set: update },
//     { upsert: true }
//   );
// };

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
    type: String,        // 'YYYY-MM-DD'
    required: true,
    default: () => new Date().toISOString().split('T')[0],
    match: /^\d{4}-\d{2}-\d{2}$/,
    index: true
  },
  // Activities — boolean flags for each habit
  activities: {
    silence: { type: Boolean, default: false },
    affirmation: { type: Boolean, default: false },
    happiness: { type: Boolean, default: false },
    exercise: { type: Boolean, default: false },
    reading: { type: Boolean, default: false },
    journaling: { type: Boolean, default: false }
  },
  // User-written texts (can be large, so usually excluded from frequent queries)
  affirmationText: { type: String, default: '', trim: true },
  journalingText: { type: String, default: '', trim: true },
  notes: { type: String, default: '', trim: true }
}, {
  timestamps: true,
  // Remove __v from JSON output, reduce payload size
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  // Minimize storage overhead
  minimize: false
});

// ========== INDEXES (optimized) ==========
// Unique compound index: one document per user per date
dailyTrackSchema.index({ user: 1, date: 1 }, { unique: true });

// Date range queries (e.g., weekly/monthly reports)
dailyTrackSchema.index({ date: -1 });

// Additional coverage for user + activities (when querying by activity flags)
dailyTrackSchema.index({ user: 1, 'activities.silence': 1 });
dailyTrackSchema.index({ user: 1, 'activities.affirmation': 1 });

// ========== STATIC METHODS (optimized with lean & atomic operations) ==========

/**
 * Get tracking record for a specific date (lean, with optional exclusion of large text fields)
 * @param {string|ObjectId} userId
 * @param {string} dateStr - 'YYYY-MM-DD' (defaults to today)
 * @param {boolean} excludeText - if true, exclude affirmationText, journalingText, notes
 * @returns {Promise<object|null>} lean record
 */
dailyTrackSchema.statics.getByDate = function(userId, dateStr = null, excludeText = true) {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  let projection = {};
  if (excludeText) {
    projection = { affirmationText: 0, journalingText: 0, notes: 0 };
  }
  return this.findOne({ user: userId, date: targetDate }, projection)
    .lean()
    .exec();
};

/**
 * Get today's tracking (alias for getByDate with today's date)
 * @param {string|ObjectId} userId
 * @param {boolean} excludeText
 * @returns {Promise<object|null>}
 */
dailyTrackSchema.statics.getToday = function(userId, excludeText = true) {
  return this.getByDate(userId, null, excludeText);
};

/**
 * Get tracking for a date range (e.g., weekly report)
 * @param {string|ObjectId} userId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {boolean} excludeText
 * @returns {Promise<Array>} lean records sorted by date
 */
dailyTrackSchema.statics.getRange = function(userId, startDate, endDate, excludeText = true) {
  let projection = {};
  if (excludeText) {
    projection = { affirmationText: 0, journalingText: 0, notes: 0 };
  }
  return this.find(
    { user: userId, date: { $gte: startDate, $lte: endDate } },
    projection
  )
    .sort({ date: 1 })
    .lean()
    .exec();
};

/**
 * Toggle an activity (true/false) – atomic, no read-modify-write
 * @param {string|ObjectId} userId
 * @param {string} dateStr
 * @param {string} activityName - one of: silence, affirmation, happiness, exercise, reading, journaling
 * @returns {Promise<object>} update result (has upserted flag if created)
 */
dailyTrackSchema.statics.toggleActivity = async function(userId, dateStr, activityName) {
  const validActivities = ['silence', 'affirmation', 'happiness', 'exercise', 'reading', 'journaling'];
  if (!validActivities.includes(activityName)) {
    throw new Error(`Invalid activity name. Must be one of: ${validActivities.join(', ')}`);
  }

  // First get current value (atomic using findOneAndUpdate with $not? simpler: two-step but still atomic with transaction? 
  // Use findOneAndUpdate with a conditional update: if currently true → set false, else set true.
  // But MongoDB doesn't have a toggle operator. We'll use the aggregation pipeline in update (MongoDB 4.2+)
  const collection = this.collection; // native driver for pipeline update
  const path = `activities.${activityName}`;
  const result = await collection.findOneAndUpdate(
    { user: userId, date: dateStr },
    [
      {
        $set: {
          [path]: { $eq: [false, `$${path}`] }   // if current is false → true; if true → false
        }
      }
    ],
    { upsert: true, returnDocument: 'after', projection: { [path]: 1, _id: 0 } }
  );
  
  // If using Mongoose, fallback to simple update without pipeline (older MongoDB)
  // Alternatively, we can use findOneAndUpdate with $bit? No. Simpler: get current then update.
  // But to keep atomic and avoid race, we'll use the pipeline method which works on MongoDB 4.2+.
  // For compatibility, we provide a fallback using two operations but with retry logic? Better to use the pipeline.
  
  // However, the user may have older MongoDB. I'll provide a safe, atomic toggle using $set with a computed value
  // using the aggregation pipeline (recommended). Wrap in try-catch and fallback to two-step? No, keep simple.
  
  // Final clean version using Mongoose's updateOne with aggregation pipeline:
  const Model = this;
  const updateRes = await Model.updateOne(
    { user: userId, date: dateStr },
    [
      {
        $set: {
          [path]: { $eq: [false, `$${path}`] }
        }
      }
    ],
    { upsert: true }
  );
  
  // Now fetch the updated document to return the new state (optional)
  const updatedDoc = await Model.findOne({ user: userId, date: dateStr })
    .select(`activities.${activityName}`)
    .lean()
    .exec();
  
  return { 
    toggledTo: updatedDoc?.activities?.[activityName],
    upserted: updateRes.upsertedCount > 0,
    modified: updateRes.modifiedCount > 0
  };
};

/**
 * Set an activity to a specific boolean value (atomic)
 * @param {string|ObjectId} userId
 * @param {string} dateStr
 * @param {string} activityName
 * @param {boolean} value
 * @returns {Promise<object>} update result
 */
dailyTrackSchema.statics.setActivity = async function(userId, dateStr, activityName, value) {
  const validActivities = ['silence', 'affirmation', 'happiness', 'exercise', 'reading', 'journaling'];
  if (!validActivities.includes(activityName)) {
    throw new Error(`Invalid activity name.`);
  }
  const update = { [`activities.${activityName}`]: value };
  const result = await this.updateOne(
    { user: userId, date: dateStr },
    { $set: update },
    { upsert: true, runValidators: false }
  ).exec();
  return result;
};

/**
 * Update text fields (affirmationText, journalingText, notes) – atomic update
 * @param {string|ObjectId} userId
 * @param {string} dateStr
 * @param {object} textData - { affirmationText?, journalingText?, notes? }
 * @returns {Promise<object|null>} updated document (lean)
 */
dailyTrackSchema.statics.updateTexts = async function(userId, dateStr, textData) {
  const allowedFields = ['affirmationText', 'journalingText', 'notes'];
  const update = {};
  for (const field of allowedFields) {
    if (textData[field] !== undefined) {
      update[field] = textData[field];
    }
  }
  if (Object.keys(update).length === 0) return null;
  
  return this.findOneAndUpdate(
    { user: userId, date: dateStr },
    { $set: update },
    { upsert: true, new: true, lean: true, runValidators: false }
  ).exec();
};

/**
 * Get completion summary for a user over a date range (count of activities done)
 * @param {string|ObjectId} userId
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Promise<object>} summary per activity
 */
dailyTrackSchema.statics.getActivitySummary = function(userId, startDate, endDate) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), date: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: null,
        silence: { $sum: { $cond: ['$activities.silence', 1, 0] } },
        affirmation: { $sum: { $cond: ['$activities.affirmation', 1, 0] } },
        happiness: { $sum: { $cond: ['$activities.happiness', 1, 0] } },
        exercise: { $sum: { $cond: ['$activities.exercise', 1, 0] } },
        reading: { $sum: { $cond: ['$activities.reading', 1, 0] } },
        journaling: { $sum: { $cond: ['$activities.journaling', 1, 0] } },
        totalDays: { $sum: 1 }
      }
    }
  ]).option({ allowDiskUse: false }).exec();
};

// ========== INSTANCE METHODS (kept for convenience, but use static for speed) ==========
dailyTrackSchema.methods.toggleActivity = async function(activityName) {
  const updated = await this.constructor.toggleActivity(this.user, this.date, activityName);
  this.activities[activityName] = updated.toggledTo;
  return this;
};

module.exports = mongoose.model('DailyEmotionalTracking', dailyTrackSchema);