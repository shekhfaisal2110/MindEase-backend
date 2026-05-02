// const mongoose = require('mongoose');

// const timeEntrySchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   person: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
//   date: { type: Date, required: true },
//   duration: { type: Number, required: true }, // in minutes
//   notes: { type: String, default: '' },
// }, { timestamps: true });

// timeEntrySchema.index({ user: 1, date: 1, person: 1 }, { unique: true });

// module.exports = mongoose.model('TimeEntry', timeEntrySchema);


const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  person: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Person', 
    required: true,
    index: true
  },
  date: { 
    type: String,  // 'YYYY-MM-DD'
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  duration: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 1440  // minutes in a day
  },
  notes: { 
    type: String, 
    default: '', 
    trim: true, 
    maxlength: 500 
  }
}, { timestamps: true });

// Indexes
timeEntrySchema.index({ user: 1, date: 1, person: 1 }, { unique: true });
timeEntrySchema.index({ user: 1, person: 1, date: -1 });
timeEntrySchema.index({ user: 1, date: -1 });

// Optional TTL for old entries (1 year)
timeEntrySchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// Static method to get total time per person for a date range
timeEntrySchema.statics.getTotalPerPerson = async function(userId, startDateStr, endDateStr) {
  const result = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), date: { $gte: startDateStr, $lte: endDateStr } } },
    { $group: { _id: "$person", totalMinutes: { $sum: "$duration" } } },
    { $sort: { totalMinutes: -1 } }
  ]);
  return result;
};

// Static method to get daily total (for a specific day)
timeEntrySchema.statics.getDailyTotal = async function(userId, dateStr) {
  const entries = await this.find({ user: userId, date: dateStr })
    .populate('person', 'name')
    .lean();
  const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);
  return { entries, totalMinutes };
};

// Static method to upsert time entry
timeEntrySchema.statics.upsertEntry = async function(userId, personId, dateStr, duration, notes = '') {
  return this.updateOne(
    { user: userId, date: dateStr, person: personId },
    { $set: { duration, notes } },
    { upsert: true }
  );
};

module.exports = mongoose.model('TimeEntry', timeEntrySchema);