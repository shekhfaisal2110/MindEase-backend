const mongoose = require('mongoose');

const routineItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  completed: { type: Boolean, default: false }
});

const dailyRoutineSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  mood: { type: Number, min: 1, max: 10 },
  items: [routineItemSchema],
  notes: { type: String }
}, { timestamps: true });

dailyRoutineSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyRoutine', dailyRoutineSchema);