// // const mongoose = require('mongoose');

// // const therapySchema = new mongoose.Schema({
// //   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
// //   type: { type: String, enum: ['hotpotato', 'forgiveness', 'selftalk', 'receiving'], required: true },
// //   content: { type: String },
// //   completed: { type: Boolean, default: false }, // optional, keep for legacy
// //   date: { type: Date, default: Date.now },
// //   count: { type: Number, default: 0 },           // total repetitions
// //   repetitionDates: [{ type: Date }]              // dates when repetitions were added
// // }, { timestamps: true });

// // module.exports = mongoose.model('TherapyExercise', therapySchema);


// const mongoose = require('mongoose');

// // Validator for repetitionDates array size
// const arrayLimit = (val) => val.length <= 500;

// const therapySchema = new mongoose.Schema({
//   user: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true,
//     index: true
//   },
//   type: { 
//     type: String, 
//     enum: ['hotpotato', 'forgiveness', 'selftalk', 'receiving'], 
//     required: true,
//     index: true
//   },
//   content: { 
//     type: String, 
//     maxlength: 5000, 
//     trim: true,
//     default: '' 
//   },
//   completed: { 
//     type: Boolean, 
//     default: false,
//     index: true 
//   }, // legacy, keep as is
//   date: { 
//     type: Date, 
//     default: Date.now,
//     index: true
//   },
//   dateStr: { 
//     type: String, 
//     default: () => new Date().toISOString().split('T')[0],
//     index: true
//   },
//   count: { 
//     type: Number, 
//     default: 0, 
//     min: 0 
//   },
//   repetitionDates: {
//     type: [Date],
//     default: [],
//     validate: [arrayLimit, 'Repetition dates cannot exceed 500 entries']
//   }
// }, { timestamps: true });

// // Indexes
// therapySchema.index({ user: 1, type: 1 });
// therapySchema.index({ user: 1, date: -1 });
// therapySchema.index({ user: 1, type: 1, date: -1 });
// therapySchema.index({ type: 1, date: -1 }); // admin

// // Static method to increment repetition count (atomic)
// therapySchema.statics.addRepetition = async function(userId, exerciseType, options = {}) {
//   const update = { $inc: { count: 1 } };
  
//   if (options.addDate) {
//     const dateToAdd = options.date || new Date();
//     if (options.avoidDuplicates) {
//       // Set time to midnight to avoid duplicate days
//       const normalized = new Date(dateToAdd);
//       normalized.setHours(0, 0, 0, 0);
//       update.$addToSet = { repetitionDates: normalized };
//     } else {
//       update.$push = { repetitionDates: dateToAdd };
//     }
//   }
  
//   return this.updateOne(
//     { user: userId, type: exerciseType },
//     update,
//     { upsert: true }
//   );
// };

// // Static method to get user's exercise progress
// therapySchema.statics.getUserProgress = async function(userId) {
//   const exercises = await this.find({ user: userId })
//     .select('type count content date')
//     .lean();
//   return exercises;
// };

// // Instance method to add repetition without database round-trip (use when you already have doc)
// therapySchema.methods.addRepetition = async function(date = new Date()) {
//   this.count++;
//   this.repetitionDates.push(date);
//   await this.save();
//   return this;
// };

// module.exports = mongoose.model('TherapyExercise', therapySchema);







const mongoose = require('mongoose');

// Validator for repetitionDates array size
const arrayLimit = (val) => val.length <= 500;

const therapySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['hotpotato', 'forgiveness', 'selftalk', 'receiving'],
    required: true,
    index: true
  },
  content: {
    type: String,
    maxlength: 5000,
    trim: true,
    default: ''
  },
  completed: {
    type: Boolean,
    default: false,
    index: true
  }, // legacy, keep as is
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  dateStr: {
    type: String,
    default: () => new Date().toISOString().split('T')[0],
    index: true
  },
  count: {
    type: Number,
    default: 0,
    min: 0
  },
  repetitionDates: {
    type: [Date],
    default: [],
    validate: [arrayLimit, 'Repetition dates cannot exceed 500 entries']
  }
}, {
  timestamps: true,
  // Remove __v from JSON output
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  minimize: false
});

// ========== INDEXES (optimized) ==========
therapySchema.index({ user: 1, type: 1 });
therapySchema.index({ user: 1, date: -1 });
therapySchema.index({ user: 1, type: 1, date: -1 });
therapySchema.index({ type: 1, date: -1 }); // admin

// Additional covering indexes for cursor pagination and fast count
therapySchema.index({ user: 1, type: 1, _id: 1 });
therapySchema.index({ user: 1, date: -1, _id: 1 });

// ========== STATIC METHODS (optimized, atomic) ==========

/**
 * Atomic increment of repetition count and optionally add a repetition date
 * @param {string|ObjectId} userId
 * @param {string} exerciseType - one of: hotpotato, forgiveness, selftalk, receiving
 * @param {object} options - { addDate: boolean, date: Date, avoidDuplicates: boolean }
 * @returns {Promise<object>} update result
 */
therapySchema.statics.addRepetition = async function(userId, exerciseType, options = {}) {
  const update = { $inc: { count: 1 } };

  if (options.addDate) {
    const dateToAdd = options.date || new Date();
    if (options.avoidDuplicates) {
      // Normalize to midnight UTC for day‑based deduplication
      const normalized = new Date(dateToAdd);
      normalized.setUTCHours(0, 0, 0, 0);
      update.$addToSet = { repetitionDates: normalized };
    } else {
      update.$push = { repetitionDates: dateToAdd };
    }
  }

  return this.updateOne(
    { user: userId, type: exerciseType },
    update,
    { upsert: true, runValidators: false }   // skip validation for speed
  ).lean().exec();
};

/**
 * Get user's progress for all exercise types (lean, projected)
 * @param {string|ObjectId} userId
 * @returns {Promise<Array>} exercises with type, count, content, date
 */
therapySchema.statics.getUserProgress = async function(userId) {
  return this.find({ user: userId })
    .select('type count content date')
    .lean()                    // 10x faster
    .exec();
};

/**
 * Get progress for a specific exercise type (paginated, cursor‑based)
 * @param {string|ObjectId} userId
 * @param {string} exerciseType
 * @param {number} limit - default 10
 * @param {string} [cursor] - last document _id from previous page
 * @returns {Promise<Object>} { exercises, nextCursor, hasMore }
 */
therapySchema.statics.getExerciseHistory = async function(userId, exerciseType, limit = 10, cursor = null) {
  const query = { user: userId, type: exerciseType };
  if (cursor) query._id = { $lt: cursor };   // sorted by date descending

  const exercises = await this.find(query)
    .sort({ date: -1, _id: -1 })
    .limit(limit)
    .select('content count repetitionDates date dateStr')
    .lean()
    .exec();

  const nextCursor = exercises.length === limit ? exercises[exercises.length - 1]._id : null;
  return { exercises, nextCursor, hasMore: !!nextCursor };
};

/**
 * Get a single exercise document by user and type (lean)
 * @param {string|ObjectId} userId
 * @param {string} exerciseType
 * @returns {Promise<object|null>}
 */
therapySchema.statics.getByUserAndType = async function(userId, exerciseType) {
  return this.findOne({ user: userId, type: exerciseType })
    .lean()
    .exec();
};

/**
 * Create or update the content of an exercise (atomic upsert)
 * @param {string|ObjectId} userId
 * @param {string} exerciseType
 * @param {string} content
 * @returns {Promise<object>} updated document (lean)
 */
therapySchema.statics.setContent = async function(userId, exerciseType, content) {
  return this.findOneAndUpdate(
    { user: userId, type: exerciseType },
    { $set: { content, date: new Date(), dateStr: new Date().toISOString().split('T')[0] } },
    { upsert: true, new: true, lean: true, runValidators: true }
  ).exec();
};

module.exports = mongoose.model('TherapyExercise', therapySchema);