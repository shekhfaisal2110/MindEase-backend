// const mongoose = require('mongoose');

// const behavioralTaskSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
//   title: { type: String, required: true, trim: true, maxlength: 200 },
//   category: { type: String, enum: ['self-care', 'movement', 'sleep', 'social', 'productivity', 'relaxation'], required: true, index: true },
//   estimatedMinutes: { type: Number, min: 1, max: 240, default: 15 },
//   difficulty: { type: String, enum: ['easy', 'medium'], default: 'easy' },
//   scheduledFor: { type: String, required: true, index: true }, // YYYY-MM-DD
//   status: { type: String, enum: ['planned', 'completed', 'skipped'], default: 'planned', index: true },
//   moodBefore: { type: Number, min: 1, max: 5 },
//   moodAfter: { type: Number, min: 1, max: 5 },
//   note: { type: String, trim: true, maxlength: 500 },
// }, { timestamps: true });

// // Indexes for fast queries
// behavioralTaskSchema.index({ user: 1, scheduledFor: 1, status: 1 });
// behavioralTaskSchema.index({ user: 1, createdAt: -1 });
// behavioralTaskSchema.index({ user: 1, status: 1 });

// module.exports = mongoose.model('BehavioralTask', behavioralTaskSchema);








const mongoose = require('mongoose');

const behavioralTaskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  category: {
    type: String,
    enum: ['self-care', 'movement', 'sleep', 'social', 'productivity', 'relaxation'],
    required: true,
    index: true
  },
  estimatedMinutes: {
    type: Number,
    min: 1,
    max: 240,
    default: 15
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium'],
    default: 'easy'
  },
  scheduledFor: {
    type: String,     // YYYY-MM-DD
    required: true,
    index: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  status: {
    type: String,
    enum: ['planned', 'completed', 'skipped'],
    default: 'planned',
    index: true
  },
  moodBefore: {
    type: Number,
    min: 1,
    max: 5
  },
  moodAfter: {
    type: Number,
    min: 1,
    max: 5
  },
  note: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true,
  // Remove __v from JSON responses, reduce payload size
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  // Prevent empty object storage overhead
  minimize: false
});

// ========== COMPOUND INDEXES (critical for speed) ==========
// Most common query: get tasks for a user on a specific date, optionally by status
behavioralTaskSchema.index({ user: 1, scheduledFor: 1, status: 1 });

// Recent tasks (e.g., dashboard)
behavioralTaskSchema.index({ user: 1, createdAt: -1 });

// Status-based filtering (e.g., all pending tasks)
behavioralTaskSchema.index({ user: 1, status: 1 });

// Additional coverage for date range queries (e.g., weekly view)
behavioralTaskSchema.index({ user: 1, scheduledFor: 1 });

// ========== STATIC METHODS (optimized with lean & projection) ==========

/**
 * Get tasks for a specific day (fastest possible)
 * @param {string|ObjectId} userId
 * @param {string} date - 'YYYY-MM-DD'
 * @param {string} [status] - optional filter: 'planned', 'completed', 'skipped'
 * @returns {Promise<Array>} lean objects
 */
behavioralTaskSchema.statics.getTasksForDate = function(userId, date, status = null) {
  const query = { user: userId, scheduledFor: date };
  if (status) query.status = status;
  
  return this.find(query)
    .select('title category estimatedMinutes difficulty status moodBefore moodAfter note scheduledFor')
    .lean()                           // 10x faster
    .sort({ createdAt: 1 })           // natural order by creation
    .exec();
};

/**
 * Get task by ID for a user (permission check built-in)
 * @param {string|ObjectId} taskId
 * @param {string|ObjectId} userId
 * @returns {Promise<object|null>} lean task or null
 */
behavioralTaskSchema.statics.getUserTask = function(taskId, userId) {
  return this.findOne({ _id: taskId, user: userId })
    .lean()
    .exec();
};

/**
 * Update task status atomically (no read-modify-write)
 * @param {string|ObjectId} taskId
 * @param {string|ObjectId} userId
 * @param {string} newStatus - 'completed', 'skipped', or 'planned'
 * @param {object} additionalData - e.g., { moodAfter: 4, note: "felt great" }
 * @returns {Promise<object|null>} updated lean task
 */
behavioralTaskSchema.statics.updateStatus = function(taskId, userId, newStatus, additionalData = {}) {
  const update = { $set: { status: newStatus, ...additionalData } };
  return this.findOneAndUpdate(
    { _id: taskId, user: userId },
    update,
    { new: true, lean: true, runValidators: false }   // lean + skip validation for speed
  ).exec();
};

/**
 * Bulk complete tasks for a date range (e.g., end of week)
 * @param {string|ObjectId} userId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {object} updateData - e.g., { status: 'completed', moodAfter: 4 }
 * @returns {Promise<object>} update result
 */
behavioralTaskSchema.statics.bulkUpdateByDateRange = function(userId, startDate, endDate, updateData) {
  return this.updateMany(
    { user: userId, scheduledFor: { $gte: startDate, $lte: endDate }, status: 'planned' },
    { $set: updateData },
    { lean: true, runValidators: false }
  ).exec();
};

/**
 * Get task completion summary for a date range (aggregation, lean)
 * @param {string|ObjectId} userId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array>} daily completion stats
 */
behavioralTaskSchema.statics.getCompletionSummary = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        scheduledFor: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { date: "$scheduledFor", status: "$status" },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.date": 1 } }
  ]).option({ allowDiskUse: false });   // in-memory for speed
};

/**
 * Get pending tasks count for today (useful for badges)
 * @param {string|ObjectId} userId
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<number>}
 */
behavioralTaskSchema.statics.getPendingCount = function(userId, date) {
  return this.countDocuments({ user: userId, scheduledFor: date, status: 'planned' })
    .lean()
    .exec();
};

/**
 * Create a new task (with minimal validation)
 * @param {object} taskData
 * @returns {Promise<object>} lean created task
 */
behavioralTaskSchema.statics.createTask = async function(taskData) {
  const task = new this(taskData);
  await task.save();
  return task.toJSON();   // lean output
};

module.exports = mongoose.model('BehavioralTask', behavioralTaskSchema);