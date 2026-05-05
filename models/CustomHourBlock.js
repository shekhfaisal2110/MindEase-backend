// const mongoose = require('mongoose');

// const customHourBlockSchema = new mongoose.Schema({
//   user: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true,
//     index: true
//   },
//   date: { 
//     type: String,  // 'YYYY-MM-DD' format
//     required: true,
//     match: /^\d{4}-\d{2}-\d{2}$/
//   },
//   blocks: {
//     type: [String],
//     required: true,
//     validate: {
//       validator: function(v) {
//         return v.every(block => /^\d{2}:\d{2} - \d{2}:\d{2}$/.test(block));
//       },
//       message: 'Invalid time block format. Use "HH:MM - HH:MM"'
//     }
//   }
// }, { timestamps: true });

// // Unique compound index: ek user ki ek date par sirf ek document
// customHourBlockSchema.index({ user: 1, date: 1 }, { unique: true });

// // Date range queries ke liye
// customHourBlockSchema.index({ date: -1 });

// // Static method to get or create blank blocks for a date
// customHourBlockSchema.statics.getOrCreate = async function(userId, dateStr, defaultBlocks = []) {
//   let record = await this.findOne({ user: userId, date: dateStr }).lean();
//   if (!record) {
//     record = await this.create({ user: userId, date: dateStr, blocks: defaultBlocks });
//   }
//   return record;
// };

// // Instance method to update blocks
// customHourBlockSchema.methods.updateBlocks = async function(newBlocks) {
//   this.blocks = newBlocks;
//   await this.save();
//   return this;
// };

// module.exports = mongoose.model('CustomHourBlock', customHourBlockSchema);





const mongoose = require('mongoose');

const customHourBlockSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String,        // 'YYYY-MM-DD' format
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
    index: true
  },
  blocks: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return v.every(block => /^\d{2}:\d{2} - \d{2}:\d{2}$/.test(block));
      },
      message: 'Invalid time block format. Use "HH:MM - HH:MM"'
    },
    default: []   // provide default empty array
  }
}, {
  timestamps: true,
  // Remove __v from JSON output, reduce payload size
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  // Minimize storage
  minimize: false
});

// ========== INDEXES (optimized) ==========
// Unique compound index: one document per user per date
customHourBlockSchema.index({ user: 1, date: 1 }, { unique: true });

// Date range queries (e.g., get all blocks for a week)
customHourBlockSchema.index({ date: -1 });

// Additional coverage for user+date queries (already covered by unique index)

// ========== STATIC METHODS (optimized with lean & atomic operations) ==========

/**
 * Get or create blocks for a date (atomic upsert, no race condition)
 * @param {string|ObjectId} userId
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {string[]} [defaultBlocks=[]] - default blocks if creation needed
 * @returns {Promise<object>} lean record
 */
customHourBlockSchema.statics.getOrCreate = async function(userId, dateStr, defaultBlocks = []) {
  // Use findOneAndUpdate with upsert – atomic and avoids separate find+create race
  const record = await this.findOneAndUpdate(
    { user: userId, date: dateStr },
    { $setOnInsert: { user: userId, date: dateStr, blocks: defaultBlocks } },
    { upsert: true, new: true, lean: true, runValidators: true }
  ).exec();
  
  return record;
};

/**
 * Get blocks for a single date (lean, projection only needed field)
 * @param {string|ObjectId} userId
 * @param {string} dateStr
 * @returns {Promise<object|null>} { blocks } or null
 */
customHourBlockSchema.statics.getBlocksForDate = function(userId, dateStr) {
  return this.findOne({ user: userId, date: dateStr })
    .select('blocks -_id')      // only return blocks array
    .lean()
    .exec();
};

/**
 * Update blocks for a specific date (atomic, no read-modify-write)
 * @param {string|ObjectId} userId
 * @param {string} dateStr
 * @param {string[]} newBlocks
 * @returns {Promise<object|null>} updated record (lean)
 */
customHourBlockSchema.statics.updateBlocksForDate = async function(userId, dateStr, newBlocks) {
  return this.findOneAndUpdate(
    { user: userId, date: dateStr },
    { $set: { blocks: newBlocks } },
    { new: true, lean: true, runValidators: true }
  ).exec();
};

/**
 * Bulk upsert multiple dates' blocks (e.g., for weekly schedule sync)
 * @param {string|ObjectId} userId
 * @param {Array<{date: string, blocks: string[]}>} dateBlocksArray
 * @returns {Promise<Array>} list of upserted records (lean)
 */
customHourBlockSchema.statics.bulkUpsert = async function(userId, dateBlocksArray) {
  const operations = dateBlocksArray.map(({ date, blocks }) => ({
    updateOne: {
      filter: { user: userId, date },
      update: { $set: { blocks } },
      upsert: true
    }
  }));
  
  const result = await this.bulkWrite(operations, { ordered: false });
  return result;
};

/**
 * Get date range of blocks for a user (e.g., for calendar view)
 * @param {string|ObjectId} userId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array>} array of { date, blocks }
 */
customHourBlockSchema.statics.getBlocksForDateRange = function(userId, startDate, endDate) {
  return this.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate }
  })
    .select('date blocks')
    .sort({ date: 1 })
    .lean()
    .exec();
};

/**
 * Delete blocks for a specific date (if needed)
 * @param {string|ObjectId} userId
 * @param {string} dateStr
 * @returns {Promise<object>} delete result
 */
customHourBlockSchema.statics.deleteBlocksForDate = function(userId, dateStr) {
  return this.deleteOne({ user: userId, date: dateStr }).lean().exec();
};

// ========== INSTANCE METHODS (kept for backward compatibility but use static for speed) ==========
customHourBlockSchema.methods.updateBlocks = async function(newBlocks) {
  // Use static method to avoid separate save
  const updated = await this.constructor.updateBlocksForDate(this.user, this.date, newBlocks);
  this.blocks = updated.blocks;
  return this;
};

module.exports = mongoose.model('CustomHourBlock', customHourBlockSchema);