// const mongoose = require('mongoose');

// const feedbackSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   username: { type: String, required: true },
//   rating: { type: Number, required: true, min: 1, max: 5 },
//   comment: { type: String, required: true },
//   isApproved: { type: Boolean, default: false },
//   createdAt: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model('Feedback', feedbackSchema);


const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  username: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be an integer between 1 and 5'
    }
  },
  comment: { 
    type: String, 
    required: true, 
    maxlength: 2000,
    trim: true
  },
  isApproved: { 
    type: Boolean, 
    default: false,
    index: true
  }
}, { timestamps: true }); // adds createdAt and updatedAt automatically

// Compound indexes for common queries
feedbackSchema.index({ isApproved: 1, createdAt: -1 });
feedbackSchema.index({ user: 1, createdAt: -1 });
feedbackSchema.index({ isApproved: 1, rating: -1, createdAt: -1 });

// Static method to get approved feedbacks with pagination (caching friendly)
feedbackSchema.statics.getApprovedFeedbacks = async function(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [feedbacks, total] = await Promise.all([
    this.find({ isApproved: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('username rating comment createdAt') // projection
      .lean(),
    this.countDocuments({ isApproved: true })
  ]);
  return { feedbacks, total, page, totalPages: Math.ceil(total / limit) };
};

// Static method to get average rating (with cache invalidation in mind)
feedbackSchema.statics.getAverageRating = async function() {
  const result = await this.aggregate([
    { $match: { isApproved: true } },
    { $group: { _id: null, avgRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } }
  ]);
  return result[0] || { avgRating: 0, totalReviews: 0 };
};

// Instance method to approve (admin action)
feedbackSchema.methods.approve = async function() {
  this.isApproved = true;
  await this.save();
  // Invalidate caches in controller after calling this
  return this;
};

module.exports = mongoose.model('Feedback', feedbackSchema);