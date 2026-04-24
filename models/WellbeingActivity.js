const mongoose = require('mongoose');

const wellbeingActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['happiness', 'stress_relief'], required: true },
  stressReductionPercent: { type: Number, default: 0, min: 0, max: 100 },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('WellbeingActivity', wellbeingActivitySchema);