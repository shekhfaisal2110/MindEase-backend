// const mongoose = require('mongoose');

// // Subdocument with index for name lookups (if needed)
// const routineItemSchema = new mongoose.Schema({
//   name: { type: String, required: true, index: true },
//   completed: { type: Boolean, default: false }
// });

// const dailyRoutineSchema = new mongoose.Schema({
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
//   mood: { 
//     type: Number, 
//     min: 1, 
//     max: 10,
//     validate: {
//       validator: Number.isInteger,
//       message: 'Mood must be an integer'
//     }
//   },
//   items: {
//     type: [routineItemSchema],
//     default: [],
//     validate: {
//       validator: (v) => v.length <= 50,
//       message: 'Cannot have more than 50 routine items per day'
//     }
//   },
//   notes: { type: String, trim: true }
// }, { timestamps: true });

// // Indexes
// dailyRoutineSchema.index({ user: 1, date: 1 }, { unique: true });
// dailyRoutineSchema.index({ date: -1 });  // for reports

// // Virtual for completion percentage
// dailyRoutineSchema.virtual('completionPercentage').get(function() {
//   if (!this.items.length) return 0;
//   const completedCount = this.items.filter(item => item.completed).length;
//   return Math.round((completedCount / this.items.length) * 100);
// });

// // Static method to get today's routine (caching friendly)
// dailyRoutineSchema.statics.getToday = function(userId, excludeNotes = true) {
//   const today = new Date().toISOString().split('T')[0];
//   let projection = { mood: 1, items: 1 };
//   if (excludeNotes) projection.notes = 0;
//   return this.findOne({ user: userId, date: today }, projection).lean();
// };

// // Static method to toggle an item by name
// dailyRoutineSchema.statics.toggleItem = async function(userId, date, itemName, completed) {
//   return this.updateOne(
//     { user: userId, date, "items.name": itemName },
//     { $set: { "items.$.completed": completed } },
//     { upsert: false }
//   );
// };

// // Instance method to add new item (if not exists)
// dailyRoutineSchema.methods.addItem = async function(itemName) {
//   if (this.items.some(item => item.name === itemName)) return this;
//   this.items.push({ name: itemName, completed: false });
//   await this.save();
//   return this;
// };

// module.exports = mongoose.model('DailyRoutine', dailyRoutineSchema);












const mongoose = require('mongoose');

// Subdocument schema for routine items (no virtuals, lean by default)
const routineItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  completed: {
    type: Boolean,
    default: false,
    index: true   // for queries like "find incomplete items"
  }
}, {
  _id: false,      // save storage, no need for subdocument _id
  minimize: false
});

const dailyRoutineSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String,    // 'YYYY-MM-DD'
    required: true,
    default: () => new Date().toISOString().split('T')[0],
    match: /^\d{4}-\d{2}-\d{2}$/,
    index: true
  },
  mood: {
    type: Number,
    min: 1,
    max: 10,
    validate: {
      validator: Number.isInteger,
      message: 'Mood must be an integer'
    }
  },
  items: {
    type: [routineItemSchema],
    default: [],
    validate: {
      validator: (v) => v.length <= 50,
      message: 'Cannot have more than 50 routine items per day'
    }
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true,
  // Remove __v from JSON output, reduce payload size
  toJSON: {
    transform: (doc, ret) => { delete ret.__v; return ret; },
    virtuals: true     // keep virtuals for client convenience
  },
  toObject: {
    transform: (doc, ret) => { delete ret.__v; return ret; },
    virtuals: true
  },
  minimize: false
});

// ========== INDEXES (optimized) ==========
// Unique compound index: one routine per user per date
dailyRoutineSchema.index({ user: 1, date: 1 }, { unique: true });

// Date range queries (reports, analytics)
dailyRoutineSchema.index({ date: -1 });

// Support for querying by item name + completion status (if needed)
dailyRoutineSchema.index({ 'items.name': 1, 'items.completed': 1 });

// Support for user + date + item name (for toggleItem)
dailyRoutineSchema.index({ user: 1, date: 1, 'items.name': 1 });

// ========== VIRTUAL (computed, not stored) ==========
dailyRoutineSchema.virtual('completionPercentage').get(function() {
  if (!this.items || this.items.length === 0) return 0;
  const completedCount = this.items.filter(item => item.completed).length;
  return Math.round((completedCount / this.items.length) * 100);
});

// ========== STATIC METHODS (optimized with lean & atomic ops) ==========

/**
 * Get today's routine (or any date) with projection
 * @param {string|ObjectId} userId
 * @param {string} [dateStr] - defaults to today
 * @param {boolean} excludeNotes - exclude `notes` field
 * @returns {Promise<object|null>} lean routine document
 */
dailyRoutineSchema.statics.getByDate = function(userId, dateStr = null, excludeNotes = true) {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  const projection = { mood: 1, items: 1 };
  if (excludeNotes) projection.notes = 0;
  else projection.notes = 1;
  return this.findOne({ user: userId, date: targetDate }, projection)
    .lean()
    .exec();
};

/**
 * Get today's routine (alias for getByDate)
 */
dailyRoutineSchema.statics.getToday = function(userId, excludeNotes = true) {
  return this.getByDate(userId, null, excludeNotes);
};

/**
 * Get routine for a date range (e.g., weekly report)
 * @param {string|ObjectId} userId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {boolean} excludeNotes - default true
 * @returns {Promise<Array>} lean routines sorted by date
 */
dailyRoutineSchema.statics.getRange = function(userId, startDate, endDate, excludeNotes = true) {
  const projection = { mood: 1, items: 1, date: 1 };
  if (!excludeNotes) projection.notes = 1;
  return this.find(
    { user: userId, date: { $gte: startDate, $lte: endDate } },
    projection
  )
    .sort({ date: 1 })
    .lean()
    .exec();
};

/**
 * Set mood for a specific date (atomic upsert)
 * @param {string|ObjectId} userId
 * @param {string} dateStr
 * @param {number} moodValue (1-10 integer)
 * @returns {Promise<object>} update result
 */
dailyRoutineSchema.statics.setMood = function(userId, dateStr, moodValue) {
  return this.updateOne(
    { user: userId, date: dateStr },
    { $set: { mood: moodValue } },
    { upsert: true, runValidators: true }
  ).exec();
};

/**
 * Toggle an item's completed status (atomic, uses array filter)
 * If the item does not exist, optionally add it with completed = false.
 * @param {string|ObjectId} userId
 * @param {string} dateStr
 * @param {string} itemName
 * @param {boolean} completed - desired state (true/false)
 * @param {boolean} addIfMissing - create item if not present
 * @returns {Promise<object>} update result or updated document (if addIfMissing)
 */
dailyRoutineSchema.statics.toggleItem = async function(userId, dateStr, itemName, completed, addIfMissing = false) {
  const update = { $set: { "items.$.completed": completed } };
  // First try to update existing item
  const result = await this.updateOne(
    { user: userId, date: dateStr, "items.name": itemName },
    update,
    { runValidators: false }
  ).exec();

  // If item not found and addIfMissing, push a new item
  if (result.matchedCount === 0 && addIfMissing) {
    const pushResult = await this.updateOne(
      { user: userId, date: dateStr },
      { $push: { items: { name: itemName, completed: false } } },
      { upsert: true, runValidators: true }
    ).exec();
    // Optionally, if we wanted to set the completed flag to true immediately,
    // we could do a second update, but we'll return the push result.
    // For simplicity, we just add with false.
    return pushResult;
  }
  return result;
};

/**
 * Add a new item to the routine (atomic $push, avoid duplicate names)
 * @param {string|ObjectId} userId
 * @param {string} dateStr
 * @param {string} itemName
 * @returns {Promise<object>} update result
 */
dailyRoutineSchema.statics.addItem = async function(userId, dateStr, itemName) {
  // Use $push with $ne to avoid duplicates (requires MongoDB 4.2+)
  // Alternative: use $addToSet, but that would compare the whole object. Use $push with a filter.
  // Simpler: try to update only if not exists using $push with $not? Actually $addToSet works on entire object.
  // To avoid duplicates by name, we need a two-step approach or a unique index on (user,date,items.name) – heavy.
  // Safe approach: atomic update with $push if the item doesn't exist using $in? Not directly.
  // We'll use a simple update with $push and rely on application-level check (or ignore if duplicate).
  // But to be safe, we'll attempt to add only if the item's name is not already in the array.
  const result = await this.updateOne(
    { user: userId, date: dateStr, "items.name": { $ne: itemName } },
    { $push: { items: { name: itemName, completed: false } } },
    { upsert: true, runValidators: true }
  ).exec();
  return result;
};

/**
 * Update notes for a specific date (atomic upsert, lean result)
 * @param {string|ObjectId} userId
 * @param {string} dateStr
 * @param {string} notesText
 * @returns {Promise<object|null>} updated document (lean) if found/created
 */
dailyRoutineSchema.statics.updateNotes = async function(userId, dateStr, notesText) {
  return this.findOneAndUpdate(
    { user: userId, date: dateStr },
    { $set: { notes: notesText } },
    { upsert: true, new: true, lean: true, runValidators: false }
  ).exec();
};

/**
 * Get completion percentage for a date (without loading full document)
 * Uses aggregation to compute ratio directly in DB.
 * @param {string|ObjectId} userId
 * @param {string} dateStr
 * @returns {Promise<number>} completion percentage (0-100)
 */
dailyRoutineSchema.statics.getCompletionPercentage = async function(userId, dateStr) {
  const result = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), date: dateStr } },
    { $project: {
        totalItems: { $size: "$items" },
        completedItems: { $size: { $filter: { input: "$items", cond: "$$this.completed" } } }
      }
    },
    { $project: {
        percentage: {
          $cond: [
            { $eq: ["$totalItems", 0] },
            0,
            { $multiply: [{ $divide: ["$completedItems", "$totalItems"] }, 100] }
          ]
        }
      }
    }
  ]).exec();
  return result.length ? Math.round(result[0].percentage) : 0;
};

module.exports = mongoose.model('DailyRoutine', dailyRoutineSchema);