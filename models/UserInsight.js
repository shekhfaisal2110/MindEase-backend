// models/UserInsight.js
const mongoose = require('mongoose');

const userInsightSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true }, // YYYY-MM-DD (the day insights were generated)
  insights: [{
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['positive', 'warning', 'neutral'], default: 'neutral' },
    metric: { type: String }, // e.g., 'mood', 'sleep'
  }],
  
}, { timestamps: true });

userInsightSchema.index({ user: 1, date: -1 });
userInsightSchema.index({ "insights.type": 1 });
userInsightSchema.index({ "insights.metric": 1 });
module.exports = mongoose.model('UserInsight', userInsightSchema);