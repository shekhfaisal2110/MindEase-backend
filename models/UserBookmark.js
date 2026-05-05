// const mongoose = require('mongoose');

// const userBookmarkSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
//   card: { type: mongoose.Schema.Types.ObjectId, ref: 'CopingCard', required: true },
//   savedAt: { type: Date, default: Date.now }
// });

// userBookmarkSchema.index({ user: 1, card: 1 }, { unique: true });

// module.exports = mongoose.model('UserBookmark', userBookmarkSchema);



const mongoose = require('mongoose');

const userBookmarkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CopingCard',
    required: true,
    index: true
  },
  savedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false,
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } }
});

// ========== INDEXES (optimized) ==========
userBookmarkSchema.index({ user: 1, card: 1 }, { unique: true });
userBookmarkSchema.index({ user: 1, savedAt: -1 });          // for paginated bookmarks (newest first)
userBookmarkSchema.index({ user: 1, savedAt: -1, _id: -1 }); // covering index for cursor pagination

// ========== STATIC METHODS (optimized, lean, atomic) ==========

/**
 * Add a bookmark for a user (atomic, prevents duplicates)
 * @param {string|ObjectId} userId
 * @param {string|ObjectId} cardId
 * @returns {Promise<object|null>} the bookmark (lean) or null if already exists
 */
userBookmarkSchema.statics.addBookmark = async function(userId, cardId) {
  const bookmark = await this.findOneAndUpdate(
    { user: userId, card: cardId },
    { $setOnInsert: { savedAt: new Date() } },
    { upsert: true, new: true, lean: true, runValidators: false }
  ).exec();
  return bookmark;
};

/**
 * Remove a bookmark (atomic)
 * @param {string|ObjectId} userId
 * @param {string|ObjectId} cardId
 * @returns {Promise<object>} delete result
 */
userBookmarkSchema.statics.removeBookmark = async function(userId, cardId) {
  return this.deleteOne({ user: userId, card: cardId }).lean().exec();
};

/**
 * Check if a user has bookmarked a specific card (lean, fast)
 * @param {string|ObjectId} userId
 * @param {string|ObjectId} cardId
 * @returns {Promise<boolean>}
 */
userBookmarkSchema.statics.isBookmarked = async function(userId, cardId) {
  const exists = await this.exists({ user: userId, card: cardId }).lean();
  return !!exists;
};

/**
 * Get paginated bookmarks for a user, with card details using aggregation ($lookup)
 * More efficient than .populate() because it's a single pipeline stage.
 * @param {string|ObjectId} userId
 * @param {number} limit - default 20
 * @param {string} [cursor] - last bookmark _id from previous page (optional)
 * @returns {Promise<Object>} { bookmarks, nextCursor, hasMore }
 */
userBookmarkSchema.statics.getUserBookmarks = async function(userId, limit = 20, cursor = null) {
  const query = { user: userId };
  if (cursor) query._id = { $lt: cursor };   // because sorted by savedAt descending, _id descending
  
  // First, fetch bookmark IDs and metadata
  const bookmarks = await this.find(query)
    .sort({ savedAt: -1, _id: -1 })
    .limit(limit)
    .select('card savedAt')
    .lean()
    .exec();
  
  if (bookmarks.length === 0) {
    return { bookmarks: [], nextCursor: null, hasMore: false };
  }
  
  // Extract card IDs
  const cardIds = bookmarks.map(b => b.card);
  
  // Fetch the actual coping cards (assuming CopingCard model exists)
  const CopingCard = mongoose.model('CopingCard');
  const cards = await CopingCard.find({ _id: { $in: cardIds } })
    .select('title category whenToUse steps whyItHelps emergencyNote')
    .lean()
    .exec();
  
  // Create a map for O(1) lookup
  const cardMap = new Map(cards.map(c => [c._id.toString(), c]));
  
  // Merge bookmark metadata with card data
  const enrichedBookmarks = bookmarks.map(b => ({
    _id: b._id,
    savedAt: b.savedAt,
    card: cardMap.get(b.card.toString()) || null
  }));
  
  const nextCursor = bookmarks.length === limit ? bookmarks[bookmarks.length - 1]._id : null;
  return {
    bookmarks: enrichedBookmarks,
    nextCursor,
    hasMore: !!nextCursor,
    limit
  };
};

/**
 * Alternative: get bookmarks with aggregation pipeline (single query, but slightly more complex)
 * This version uses $lookup to join CopingCard in the database – ideal for large datasets.
 */
userBookmarkSchema.statics.getUserBookmarksAggregated = async function(userId, limit = 20, cursor = null) {
  const match = { user: mongoose.Types.ObjectId(userId) };
  if (cursor) match._id = { $lt: mongoose.Types.ObjectId(cursor) };
  
  const pipeline = [
    { $match: match },
    { $sort: { savedAt: -1, _id: -1 } },
    { $limit: limit },
    { $lookup: {
        from: 'copingcards',
        localField: 'card',
        foreignField: '_id',
        as: 'cardDetails'
      } },
    { $unwind: { path: '$cardDetails', preserveNullAndEmptyArrays: false } },
    { $project: {
        _id: 1,
        savedAt: 1,
        card: {
          _id: '$cardDetails._id',
          title: '$cardDetails.title',
          category: '$cardDetails.category',
          whenToUse: '$cardDetails.whenToUse',
          steps: '$cardDetails.steps',
          whyItHelps: '$cardDetails.whyItHelps',
          emergencyNote: '$cardDetails.emergencyNote'
        }
      } }
  ];
  
  const bookmarks = await this.aggregate(pipeline, { allowDiskUse: false }).exec();
  const nextCursor = bookmarks.length === limit ? bookmarks[bookmarks.length - 1]._id : null;
  return { bookmarks, nextCursor, hasMore: !!nextCursor };
};

module.exports = mongoose.model('UserBookmark', userBookmarkSchema);