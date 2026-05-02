// const mongoose = require('mongoose');

// const reactResponseSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   date: { type: Date, default: Date.now },
//   emotion: { type: String, default: 'angry' },
//   choice: { type: String, enum: ['react', 'response'], required: true },
//   situation: { type: String, default: '' }, // optional description
//   outcome: { type: String, default: '' },   // optional how it felt after
// }, { timestamps: true });

// module.exports = mongoose.model('ReactResponse', reactResponseSchema);


const mongoose = require('mongoose');

const reactResponseSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
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
  emotion: { 
    type: String, 
    default: 'angry',
    enum: ['angry', 'sad', 'anxious', 'frustrated', 'happy', 'calm', 'grateful', 'neutral'],
    lowercase: true,
    trim: true
  },
  choice: { 
    type: String, 
    enum: ['react', 'response'], 
    required: true,
    index: true
  },
  situation: { 
    type: String, 
    default: '', 
    maxlength: 500, 
    trim: true 
  },
  outcome: { 
    type: String, 
    default: '', 
    maxlength: 500, 
    trim: true 
  }
}, { timestamps: true });

// Indexes
reactResponseSchema.index({ user: 1, date: -1 });
reactResponseSchema.index({ user: 1, choice: 1, date: -1 });
reactResponseSchema.index({ user: 1, dateStr: 1 });  // for daily grouping
reactResponseSchema.index({ emotion: 1 });

// TTL index (optional) – delete after 1 year
reactResponseSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// Static method to get recent entries with pagination
reactResponseSchema.statics.getRecent = async function(userId, limit = 20, skip = 0) {
  return this.find({ user: userId })
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit)
    .select('emotion choice situation outcome date')
    .lean();
};

// Static method to get daily summary (react vs response counts for last N days)
reactResponseSchema.statics.getDailySummary = async function(userId, days = 7) {
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - days + 1);
  const startStr = startDate.toISOString().split('T')[0];
  
  const result = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), dateStr: { $gte: startStr } } },
    { $group: { _id: { date: "$dateStr", choice: "$choice" }, count: { $sum: 1 } } },
    { $sort: { "_id.date": 1 } }
  ]);
  return result;
};

// Static method to get choice stats (total react vs response)
reactResponseSchema.statics.getChoiceStats = async function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$choice", count: { $sum: 1 } } }
  ]);
};

module.exports = mongoose.model('ReactResponse', reactResponseSchema);