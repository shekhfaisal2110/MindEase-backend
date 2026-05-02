// const mongoose = require('mongoose');

// const taskSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   title: { type: String, required: true, trim: true },
//   description: { type: String, trim: true },
//   completed: { type: Boolean, default: false },
//   dueDate: { type: Date },
//   priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
// }, { timestamps: true });

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
}, { timestamps: true });

// Indexes
taskSchema.index({ user: 1, completed: 1 });
taskSchema.index({ user: 1, dueDate: 1 });
taskSchema.index({ user: 1, priority: 1, completed: 1 });
taskSchema.index({ user: 1, dueDate: 1, completed: 1 }); // for overdue queries

// Static method to get pending tasks with pagination
taskSchema.statics.getPendingTasks = async function(userId, page = 1, limit = 20, sortBy = 'dueDate') {
  const skip = (page - 1) * limit;
  let sort = {};
  if (sortBy === 'dueDate') sort = { dueDate: 1 };
  else if (sortBy === 'priority') sort = { priority: -1, dueDate: 1 };
  else sort = { createdAt: -1 };
  
  const [tasks, total] = await Promise.all([
    this.find({ user: userId, completed: false })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('title description dueDate priority createdAt')
      .lean(),
    this.countDocuments({ user: userId, completed: false })
  ]);
  return { tasks, total, page, totalPages: Math.ceil(total / limit) };
};

// Static method to get overdue tasks
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
  .lean();
};

// Static method to get task statistics
taskSchema.statics.getStats = async function(userId) {
  const [total, pending, completed, highPriority, overdue] = await Promise.all([
    this.countDocuments({ user: userId }),
    this.countDocuments({ user: userId, completed: false }),
    this.countDocuments({ user: userId, completed: true }),
    this.countDocuments({ user: userId, priority: 'high', completed: false }),
    this.countDocuments({ user: userId, completed: false, dueDate: { $lt: new Date(), $ne: null } })
  ]);
  return { total, pending, completed, highPriority, overdue };
};

module.exports = mongoose.model('Task', taskSchema);