// const mongoose = require('mongoose');

// const copingCardSchema = new mongoose.Schema({
//   title: { type: String, required: true, trim: true, index: true },
//   category: { type: String, required: true, index: true },
//   whenToUse: { type: String, required: true },
//   steps: [{ type: String, required: true }],
//   whyItHelps: { type: String, trim: true },
//   emergencyNote: { type: String, trim: true },
//   isPublic: { type: Boolean, default: true, index: true },
//   isCustom: { type: Boolean, default: false, index: true },
//   sharePublic: { type: Boolean, default: false },
//   sharedByUsername: { type: String, default: null },
//   approvedAt: { type: Date, default: null },
//   createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }
// }, { timestamps: true });

// copingCardSchema.index({ category: 1, isPublic: 1 });
// copingCardSchema.index({ createdBy: 1, isCustom: 1 });
// copingCardSchema.index({ title: 'text', whenToUse: 'text' });

// module.exports = mongoose.model('CopingCard', copingCardSchema);







const mongoose = require('mongoose');

const copingCardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true,
    maxlength: 200
  },
  category: {
    type: String,
    required: true,
    index: true,
    trim: true,
    lowercase: true
  },
  whenToUse: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  steps: [{
    type: String,
    required: true,
    trim: true
  }],
  whyItHelps: {
    type: String,
    trim: true,
    maxlength: 500
  },
  emergencyNote: {
    type: String,
    trim: true,
    maxlength: 300
  },
  isPublic: {
    type: Boolean,
    default: true,
    index: true
  },
  isCustom: {
    type: Boolean,
    default: false,
    index: true
  },
  sharePublic: {
    type: Boolean,
    default: false
  },
  sharedByUsername: {
    type: String,
    default: null,
    trim: true,
    index: true
  },
  approvedAt: {
    type: Date,
    default: null,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }
}, {
  timestamps: true,
  // Remove __v from JSON output, reduce payload size
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  // Minimize storage for empty objects
  minimize: false
});

// ========== COMPOUND INDEXES (critical for speed) ==========
// Most common query: public cards by category
copingCardSchema.index({ category: 1, isPublic: 1, createdAt: -1 });

// User's custom cards (including private)
copingCardSchema.index({ createdBy: 1, isCustom: 1, createdAt: -1 });

// Public cards that are approved (for dashboard)
copingCardSchema.index({ isPublic: 1, approvedAt: -1, createdAt: -1 });

// Shared cards by username
copingCardSchema.index({ sharedByUsername: 1, sharePublic: 1 });

// Full-text search indexes (title + whenToUse)
copingCardSchema.index({ title: 'text', whenToUse: 'text' }, {
  weights: { title: 10, whenToUse: 5 },
  name: 'text_search_index'
});

// Additional coverage for pagination
copingCardSchema.index({ isPublic: 1, createdAt: -1 });
copingCardSchema.index({ createdBy: 1, isCustom: 1, category: 1 });

// ========== STATIC METHODS (optimized with lean & projection) ==========

/**
 * Get public coping cards (paginated, cursor-based, lean)
 * @param {string} [category] - filter by category
 * @param {number} limit - default 20
 * @param {string} [cursor] - last _id for pagination
 * @returns {Promise<Object>} { cards, nextCursor, hasMore }
 */
copingCardSchema.statics.getPublicCards = async function(category = null, limit = 20, cursor = null) {
  const query = { isPublic: true, approvedAt: { $ne: null } };
  if (category) query.category = category;
  if (cursor) query._id = { $gt: cursor };

  const cards = await this.find(query)
    .select('title category whenToUse steps whyItHelps emergencyNote createdAt sharedByUsername')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()                     // 10x faster
    .exec();

  const nextCursor = cards.length === limit ? cards[cards.length - 1]._id : null;
  return { cards, nextCursor, hasMore: !!nextCursor };
};

/**
 * Get custom cards for a specific user
 * @param {string|ObjectId} userId
 * @param {number} limit
 * @param {string} [cursor]
 * @returns {Promise<Object>}
 */
copingCardSchema.statics.getUserCustomCards = async function(userId, limit = 20, cursor = null) {
  const query = { createdBy: userId, isCustom: true };
  if (cursor) query._id = { $gt: cursor };

  const cards = await this.find(query)
    .select('title category whenToUse steps whyItHelps emergencyNote sharePublic sharedByUsername createdAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .exec();

  const nextCursor = cards.length === limit ? cards[cards.length - 1]._id : null;
  return { cards, nextCursor, hasMore: !!nextCursor };
};

/**
 * Search public cards using text index (fastest full-text search)
 * @param {string} searchTerm
 * @param {number} limit
 * @returns {Promise<Array>}
 */
copingCardSchema.statics.searchPublicCards = function(searchTerm, limit = 20) {
  return this.find(
    { $text: { $search: searchTerm }, isPublic: true, approvedAt: { $ne: null } },
    { score: { $meta: 'textScore' } }   // include relevance score
  )
    .select('title category whenToUse steps whyItHelps emergencyNote')
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean()
    .exec();
};

/**
 * Get a single coping card by ID (with access control)
 * @param {string|ObjectId} cardId
 * @param {string|ObjectId} [userId] - if provided, checks ownership for custom cards
 * @returns {Promise<object|null>}
 */
copingCardSchema.statics.getCardById = async function(cardId, userId = null) {
  const query = { _id: cardId };
  // If user is not admin, only show public approved cards or their own custom cards
  if (userId) {
    query.$or = [
      { isPublic: true, approvedAt: { $ne: null } },
      { createdBy: userId, isCustom: true }
    ];
  } else {
    query.isPublic = true;
    query.approvedAt = { $ne: null };
  }
  return this.findOne(query).lean().exec();
};

/**
 * Create a custom coping card (user-generated)
 * @param {object} cardData
 * @returns {Promise<object>} lean created card
 */
copingCardSchema.statics.createCustomCard = async function(cardData) {
  const card = new this({
    ...cardData,
    isCustom: true,
    isPublic: false,
    approvedAt: null
  });
  await card.save();
  return card.toJSON();
};

/**
 * Share a custom card publicly (atomic update)
 * @param {string|ObjectId} cardId
 * @param {string|ObjectId} userId
 * @param {string} username
 * @returns {Promise<object|null>}
 */
copingCardSchema.statics.sharePublicly = async function(cardId, userId, username) {
  return this.findOneAndUpdate(
    { _id: cardId, createdBy: userId, isCustom: true },
    {
      $set: {
        sharePublic: true,
        sharedByUsername: username,
        isPublic: true,
        approvedAt: new Date()   // if auto-approve user content; else set null and admin approves later
      }
    },
    { new: true, lean: true, runValidators: false }
  ).exec();
};

/**
 * Admin: approve a custom card to become public
 * @param {string|ObjectId} cardId
 * @returns {Promise<object|null>}
 */
copingCardSchema.statics.approveCard = async function(cardId) {
  return this.findByIdAndUpdate(
    cardId,
    {
      $set: {
        isPublic: true,
        approvedAt: new Date(),
        sharePublic: true   // if shared, mark as shareable
      }
    },
    { new: true, lean: true, runValidators: false }
  ).exec();
};

/**
 * Get distinct categories (for filters) – fast using distinct on indexed field
 * @param {boolean} includePublicOnly - if true, only from public approved cards
 * @returns {Promise<Array>}
 */
copingCardSchema.statics.getDistinctCategories = async function(includePublicOnly = true) {
  const match = includePublicOnly ? { isPublic: true, approvedAt: { $ne: null } } : {};
  return this.distinct('category', match).lean().exec();
};

module.exports = mongoose.model('CopingCard', copingCardSchema);