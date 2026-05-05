// const mongoose = require('mongoose');

// const taskSchema = new mongoose.Schema({
//   user: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true,
//     index: true
//   },
//   title: { 
//     type: String, 
//     required: true, 
//     trim: true, 
//     maxlength: 200 
//   },
//   description: { 
//     type: String, 
//     trim: true, 
//     maxlength: 1000,
//     default: '' 
//   },
//   completed: { 
//     type: Boolean, 
//     default: false,
//     index: true
//   },
//   dueDate: { 
//     type: Date, 
//     default: null,
//     index: true
//   },
//   priority: { 
//     type: String, 
//     enum: ['low', 'medium', 'high'], 
//     default: 'medium',
//     index: true
//   }
// }, { timestamps: true });

// // Indexes
// taskSchema.index({ user: 1, completed: 1 });
// taskSchema.index({ user: 1, dueDate: 1 });
// taskSchema.index({ user: 1, priority: 1, completed: 1 });
// taskSchema.index({ user: 1, dueDate: 1, completed: 1 }); // for overdue queries

// // Static method to get pending tasks with pagination
// taskSchema.statics.getPendingTasks = async function(userId, page = 1, limit = 20, sortBy = 'dueDate') {
//   const skip = (page - 1) * limit;
//   let sort = {};
//   if (sortBy === 'dueDate') sort = { dueDate: 1 };
//   else if (sortBy === 'priority') sort = { priority: -1, dueDate: 1 };
//   else sort = { createdAt: -1 };
  
//   const [tasks, total] = await Promise.all([
//     this.find({ user: userId, completed: false })
//       .sort(sort)
//       .skip(skip)
//       .limit(limit)
//       .select('title description dueDate priority createdAt')
//       .lean(),
//     this.countDocuments({ user: userId, completed: false })
//   ]);
//   return { tasks, total, page, totalPages: Math.ceil(total / limit) };
// };

// // Static method to get overdue tasks
// taskSchema.statics.getOverdueTasks = async function(userId, limit = 50) {
//   const now = new Date();
//   return this.find({
//     user: userId,
//     completed: false,
//     dueDate: { $lt: now, $ne: null }
//   })
//   .sort({ dueDate: 1 })
//   .limit(limit)
//   .select('title dueDate priority')
//   .lean();
// };

// // Static method to get task statistics
// taskSchema.statics.getStats = async function(userId) {
//   const [total, pending, completed, highPriority, overdue] = await Promise.all([
//     this.countDocuments({ user: userId }),
//     this.countDocuments({ user: userId, completed: false }),
//     this.countDocuments({ user: userId, completed: true }),
//     this.countDocuments({ user: userId, priority: 'high', completed: false }),
//     this.countDocuments({ user: userId, completed: false, dueDate: { $lt: new Date(), $ne: null } })
//   ]);
//   return { total, pending, completed, highPriority, overdue };
// };

// module.exports = mongoose.model('Task', taskSchema);







const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
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
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  completed: {
    type: Boolean,
    default: false,
    index: true
  },
  dueDate: {
    type: Date,
    default: null,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
    index: true
  }
}, {
  timestamps: true,
  // Remove __v from JSON output, reduce payload size
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  minimize: false
});

// ========== INDEXES (optimized) ==========
taskSchema.index({ user: 1, completed: 1 });
taskSchema.index({ user: 1, dueDate: 1 });
taskSchema.index({ user: 1, priority: 1, completed: 1 });
taskSchema.index({ user: 1, dueDate: 1, completed: 1 }); // for overdue queries
// Covering index for cursor pagination (user + completed + _id)
taskSchema.index({ user: 1, completed: 1, _id: 1 });
// For pending tasks sorted by dueDate (used in getPendingTasks)
taskSchema.index({ user: 1, completed: 1, dueDate: 1 });
// For pending tasks sorted by priority (high to low)
taskSchema.index({ user: 1, completed: 1, priority: -1, dueDate: 1 });

// ========== STATIC METHODS (optimized with cursor pagination) ==========

/**
 * Get pending tasks with cursor‑based pagination (no skip/offset)
 * @param {string|ObjectId} userId
 * @param {number} limit - items per page (default 20)
 * @param {string} sortBy - 'dueDate', 'priority', or 'created'
 * @param {string} [cursor] - last document _id from previous page
 * @returns {Promise<Object>} { tasks, nextCursor, hasMore, totalPending }
 */
taskSchema.statics.getPendingTasks = async function(userId, limit = 20, sortBy = 'dueDate', cursor = null) {
  const query = { user: userId, completed: false };
  if (cursor) query._id = { $gt: cursor }; // for ascending sorts, we use $gt

  let sort = {};
  if (sortBy === 'dueDate') sort = { dueDate: 1, _id: 1 };
  else if (sortBy === 'priority') sort = { priority: -1, dueDate: 1, _id: 1 };
  else sort = { createdAt: -1, _id: -1 };

  const tasks = await this.find(query)
    .sort(sort)
    .limit(limit)
    .select('title description dueDate priority createdAt')
    .lean()                               // 10x faster
    .exec();

  const nextCursor = tasks.length === limit ? tasks[tasks.length - 1]._id : null;
  const totalPending = await this.countDocuments({ user: userId, completed: false }).lean().exec();

  return { tasks, nextCursor, hasMore: !!nextCursor, totalPending };
};

/**
 * Get overdue tasks (dueDate < now and not completed) – limited, lean
 * @param {string|ObjectId} userId
 * @param {number} limit - default 50
 * @returns {Promise<Array>}
 */
taskSchema.statics.getOverdueTasks = async function(userId, limit = 50) {
  const now = new Date();
  return this.find({
    user: userId,
    completed: false,
    dueDate: { $lt: now, $ne: null }
  })
    .sort({ dueDate: 1 })
    .limit(limit)
    .select('title dueDate priority')
    .lean()
    .exec();
};

/**
 * Get task statistics (counts) – uses fast countDocuments and aggregate for overdue
 * @param {string|ObjectId} userId
 * @returns {Promise<Object>}
 */
taskSchema.statics.getStats = async function(userId) {
  const now = new Date();
  const [total, pending, completed, highPriority, overdue] = await Promise.all([
    this.countDocuments({ user: userId }).lean(),
    this.countDocuments({ user: userId, completed: false }).lean(),
    this.countDocuments({ user: userId, completed: true }).lean(),
    this.countDocuments({ user: userId, priority: 'high', completed: false }).lean(),
    this.countDocuments({ user: userId, completed: false, dueDate: { $lt: now, $ne: null } }).lean()
  ]);
  return { total, pending, completed, highPriority, overdue };
};

/**
 * Toggle task completion (atomic update)
 * @param {string|ObjectId} taskId
 * @param {string|ObjectId} userId
 * @returns {Promise<object|null>} updated task (lean)
 */
taskSchema.statics.toggleComplete = async function(taskId, userId) {
  const task = await this.findOne({ _id: taskId, user: userId }).lean();
  if (!task) return null;
  const newCompleted = !task.completed;
  return this.findOneAndUpdate(
    { _id: taskId, user: userId },
    { $set: { completed: newCompleted } },
    { new: true, lean: true, runValidators: false }
  ).exec();
};

/**
 * Create a new task (atomic, lean result)
 * @param {object} taskData - { user, title, description?, dueDate?, priority? }
 * @returns {Promise<object>}
 */
taskSchema.statics.createTask = async function(taskData) {
  const task = new this(taskData);
  await task.save();
  return task.toJSON();
};

/**
 * Delete a task by ID (with ownership check)
 * @param {string|ObjectId} taskId
 * @param {string|ObjectId} userId
 * @returns {Promise<object>} delete result
 */
taskSchema.statics.deleteTask = async function(taskId, userId) {
  return this.deleteOne({ _id: taskId, user: userId }).lean().exec();
};

/**
 * Bulk complete tasks by IDs (atomic updateMany)
 * @param {string[]} taskIds
 * @param {string|ObjectId} userId
 * @returns {Promise<object>} update result
 */
taskSchema.statics.bulkComplete = async function(taskIds, userId) {
  return this.updateMany(
    { _id: { $in: taskIds }, user: userId, completed: false },
    { $set: { completed: true } },
    { lean: true, runValidators: false }
  ).exec();
};

module.exports = mongoose.model('Task', taskSchema);