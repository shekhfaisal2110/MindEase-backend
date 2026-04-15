const mongoose = require('mongoose');

const therapySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['hotpotato', 'forgiveness', 'selftalk', 'receiving'], required: true },
  content: { type: String },      // e.g., "I am responsible for everything"
  completed: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TherapyExercise', therapySchema);