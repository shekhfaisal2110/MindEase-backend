// const mongoose = require('mongoose');

// // Array size validator
// const arrayLimit = (val) => val.length <= 50;
// const stringLengthLimit = (val) => val.length <= 100;

// const ikigaiSchema = new mongoose.Schema({
//   user: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true,
//     unique: true,  // shortcut for unique index
//     index: true
//   },
//   love: { 
//     type: [String], 
//     default: [],
//     validate: [arrayLimit, 'Love array cannot exceed 50 items']
//   },
//   skill: { 
//     type: [String], 
//     default: [],
//     validate: [arrayLimit, 'Skill array cannot exceed 50 items']
//   },
//   worldNeed: { 
//     type: [String], 
//     default: [],
//     validate: [arrayLimit, 'WorldNeed array cannot exceed 50 items']
//   },
//   earn: { 
//     type: [String], 
//     default: [],
//     validate: [arrayLimit, 'Earn array cannot exceed 50 items']
//   }
// }, { timestamps: true }); // auto createdAt, updatedAt

// // Indexes for array searches (if needed)
// ikigaiSchema.index({ love: 1 });
// ikigaiSchema.index({ skill: 1 });

// // Static method to get or create empty ikigai
// ikigaiSchema.statics.getOrCreate = async function(userId) {
//   let ikigai = await this.findOne({ user: userId }).lean();
//   if (!ikigai) {
//     ikigai = await this.create({ user: userId });
//   }
//   return ikigai;
// };

// // Instance method to add item to a category (with duplicate check)
// ikigaiSchema.methods.addItem = async function(category, item) {
//   if (!this[category]) return false;
//   if (this[category].includes(item)) return false;
//   this[category].push(item);
//   await this.save();
//   return true;
// };

// // Instance method to remove item from a category
// ikigaiSchema.methods.removeItem = async function(category, item) {
//   if (!this[category]) return false;
//   this[category] = this[category].filter(i => i !== item);
//   await this.save();
//   return true;
// };

// module.exports = mongoose.model('Ikigai', ikigaiSchema);


const mongoose = require('mongoose');

// Array size validator
const arrayLimit = (val) => val.length <= 50;
const stringLengthLimit = (val) => val.length <= 100;

const ikigaiSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,        // shortcut for unique index (fastest lookup)
    index: true
  },
  love: {
    type: [String],
    default: [],
    validate: [arrayLimit, 'Love array cannot exceed 50 items']
  },
  skill: {
    type: [String],
    default: [],
    validate: [arrayLimit, 'Skill array cannot exceed 50 items']
  },
  worldNeed: {
    type: [String],
    default: [],
    validate: [arrayLimit, 'WorldNeed array cannot exceed 50 items']
  },
  earn: {
    type: [String],
    default: [],
    validate: [arrayLimit, 'Earn array cannot exceed 50 items']
  }
}, {
  timestamps: true,      // createdAt, updatedAt
  // Remove __v from JSON output, reduce payload size
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  minimize: false
});

// ========== INDEXES (optimized) ==========
// Unique index on user is already set (unique: true). Additional array indexes for searches:
ikigaiSchema.index({ love: 1 });      // for searching users by "love" items
ikigaiSchema.index({ skill: 1 });     // for searching users by "skill" items

// Optional: compound index for user + any field – not needed because user is unique

// ========== STATIC METHODS (optimized, atomic, lean) ==========

/**
 * Get or create an Ikigai document for a user (atomic upsert)
 * @param {string|ObjectId} userId
 * @returns {Promise<object>} lean Ikigai document
 */
ikigaiSchema.statics.getOrCreate = async function(userId) {
  const result = await this.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, love: [], skill: [], worldNeed: [], earn: [] } },
    { upsert: true, new: true, lean: true, runValidators: false }
  ).exec();
  return result;
};

/**
 * Get an Ikigai document for a user (lean, fast)
 * @param {string|ObjectId} userId
 * @returns {Promise<object|null>} lean document
 */
ikigaiSchema.statics.getByUser = function(userId) {
  return this.findOne({ user: userId }).lean().exec();
};

/**
 * Atomically add an item to a category (if not already present)
 * Uses $push with $ne (adds only if not exists) to avoid duplicates.
 * @param {string|ObjectId} userId
 * @param {string} category - 'love' | 'skill' | 'worldNeed' | 'earn'
 * @param {string} item - item to add
 * @returns {Promise<object>} update result
 */
ikigaiSchema.statics.addItem = async function(userId, category, item) {
  const validCategories = ['love', 'skill', 'worldNeed', 'earn'];
  if (!validCategories.includes(category)) {
    throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
  }
  if (!item || item.length > 100) {
    throw new Error('Item must be non-empty and ≤100 characters');
  }

  // Use $push with $ne (addToSet) to avoid duplicates atomically
  const result = await this.updateOne(
    { user: userId },
    { $addToSet: { [category]: item } },
    { upsert: true, runValidators: false }
  ).exec();
  return result;
};

/**
 * Atomically remove an item from a category
 * @param {string|ObjectId} userId
 * @param {string} category
 * @param {string} item
 * @returns {Promise<object>} update result
 */
ikigaiSchema.statics.removeItem = async function(userId, category, item) {
  const validCategories = ['love', 'skill', 'worldNeed', 'earn'];
  if (!validCategories.includes(category)) {
    throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
  }
  return this.updateOne(
    { user: userId },
    { $pull: { [category]: item } },
    { runValidators: false }
  ).exec();
};

/**
 * Replace entire category array (set new array)
 * @param {string|ObjectId} userId
 * @param {string} category
 * @param {string[]} newArray
 * @returns {Promise<object>} update result
 */
ikigaiSchema.statics.setCategory = async function(userId, category, newArray) {
  const validCategories = ['love', 'skill', 'worldNeed', 'earn'];
  if (!validCategories.includes(category)) {
    throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
  }
  if (newArray.length > 50) {
    throw new Error(`Category array cannot exceed 50 items`);
  }
  return this.updateOne(
    { user: userId },
    { $set: { [category]: newArray } },
    { upsert: true, runValidators: true }
  ).exec();
};

// ========== INSTANCE METHODS (kept for backward compatibility, but static are faster) ==========
ikigaiSchema.methods.addItem = async function(category, item) {
  const result = await this.constructor.addItem(this.user, category, item);
  // Optionally refresh the array in the instance (but not needed for performance)
  if (result.modifiedCount > 0) {
    const updated = await this.constructor.getByUser(this.user);
    if (updated) this[category] = updated[category];
  }
  return result.modifiedCount > 0;
};

ikigaiSchema.methods.removeItem = async function(category, item) {
  const result = await this.constructor.removeItem(this.user, category, item);
  if (result.modifiedCount > 0) {
    const updated = await this.constructor.getByUser(this.user);
    if (updated) this[category] = updated[category];
  }
  return result.modifiedCount > 0;
};

module.exports = mongoose.model('Ikigai', ikigaiSchema);