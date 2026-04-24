const mongoose = require('mongoose');

const affirmationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  category: { type: String, default: 'positive' },
  count: { type: Number, default: 0 },
  targetCount: { type: Number, default: 33 },
  month: { type: String, required: true },
  completionDates: [{ type: Date }]
}, { timestamps: true });

module.exports = mongoose.model('Affirmation', affirmationSchema);