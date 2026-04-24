const mongoose = require('mongoose');

const therapySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['hotpotato', 'forgiveness', 'selftalk', 'receiving'], required: true },
  content: { type: String },
  completed: { type: Boolean, default: false }, // optional, keep for legacy
  date: { type: Date, default: Date.now },
  count: { type: Number, default: 0 },           // total repetitions
  repetitionDates: [{ type: Date }]              // dates when repetitions were added
}, { timestamps: true });

module.exports = mongoose.model('TherapyExercise', therapySchema);