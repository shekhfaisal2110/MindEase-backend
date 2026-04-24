const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
  date: { type: Date, required: true },
  duration: { type: Number, required: true }, // in minutes
  notes: { type: String, default: '' },
}, { timestamps: true });

timeEntrySchema.index({ user: 1, date: 1, person: 1 }, { unique: true });

module.exports = mongoose.model('TimeEntry', timeEntrySchema);