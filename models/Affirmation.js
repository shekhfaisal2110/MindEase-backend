const mongoose = require('mongoose');

const affirmationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },       // e.g., "I am very happy"
  category: { type: String, default: 'positive' },
  count: { type: Number, default: 0 },          // how many times repeated
  targetCount: { type: Number, default: 33 },   // monthly target
  month: { type: String, required: true },      // YYYY-MM
}, { timestamps: true });

module.exports = mongoose.model('Affirmation', affirmationSchema);