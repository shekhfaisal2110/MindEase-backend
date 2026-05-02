// const mongoose = require('mongoose');

// const affirmationSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   text: { type: String, required: true },
//   category: { type: String, default: 'positive' },
//   count: { type: Number, default: 0 },
//   targetCount: { type: Number, default: 33 },
//   month: { type: String, required: true },
//   completionDates: [{ type: Date }]
// }, { timestamps: true });

// module.exports = mongoose.model('Affirmation', affirmationSchema);


const mongoose = require('mongoose');

const affirmationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, required: true },
  category: { type: String, default: 'positive', index: true },
  count: { type: Number, default: 0 },
  targetCount: { type: Number, default: 33 },
  month: { type: String, required: true, index: true },
  completionDates: [{ type: String }] // YYYY-MM-DD format, duplicate nahi hoga $addToSet se
}, { timestamps: true });

// Compound indexes
affirmationSchema.index({ user: 1, month: 1 });
affirmationSchema.index({ user: 1, category: 1 });

// Static method for commonly used query
affirmationSchema.statics.findByUserAndMonth = function(userId, month, projection = {}) {
  return this.findOne({ user: userId, month }, projection).lean();
};

module.exports = mongoose.model('Affirmation', affirmationSchema);