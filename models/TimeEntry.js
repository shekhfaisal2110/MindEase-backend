// const mongoose = require('mongoose');

// const timeEntrySchema = new mongoose.Schema({
//   user: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true,
//     index: true
//   },
//   person: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'Person', 
//     required: true,
//     index: true
//   },
//   date: { 
//     type: String,  // 'YYYY-MM-DD'
//     required: true,
//     match: /^\d{4}-\d{2}-\d{2}$/
//   },
//   duration: { 
//     type: Number, 
//     required: true, 
//     min: 0, 
//     max: 1440  // minutes in a day
//   },
//   notes: { 
//     type: String, 
//     default: '', 
//     trim: true, 
//     maxlength: 500 
//   }
// }, { timestamps: true });

// // Indexes
// timeEntrySchema.index({ user: 1, date: 1, person: 1 }, { unique: true });
// timeEntrySchema.index({ user: 1, person: 1, date: -1 });
// timeEntrySchema.index({ user: 1, date: -1 });

// // Optional TTL for old entries (1 year)
// timeEntrySchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// // Static method to get total time per person for a date range
// timeEntrySchema.statics.getTotalPerPerson = async function(userId, startDateStr, endDateStr) {
//   const result = await this.aggregate([
//     { $match: { user: mongoose.Types.ObjectId(userId), date: { $gte: startDateStr, $lte: endDateStr } } },
//     { $group: { _id: "$person", totalMinutes: { $sum: "$duration" } } },
//     { $sort: { totalMinutes: -1 } }
//   ]);
//   return result;
// };

// // Static method to get daily total (for a specific day)
// timeEntrySchema.statics.getDailyTotal = async function(userId, dateStr) {
//   const entries = await this.find({ user: userId, date: dateStr })
//     .populate('person', 'name')
//     .lean();
//   const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);
//   return { entries, totalMinutes };
// };

// // Static method to upsert time entry
// timeEntrySchema.statics.upsertEntry = async function(userId, personId, dateStr, duration, notes = '') {
//   return this.updateOne(
//     { user: userId, date: dateStr, person: personId },
//     { $set: { duration, notes } },
//     { upsert: true }
//   );
// };

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
    required: true
  },
  date: {
    type: String,        // YYYY-MM-DD
    required: true,
    index: true
  },
  duration: {
    type: Number,        // minutes
    required: true,
    min: 1
  },
  notes: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true,
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } }
});

// Unique compound index: one entry per user per person per day
timeEntrySchema.index({ user: 1, person: 1, date: 1 }, { unique: true });

// Static method: get entries + total minutes for a specific date
timeEntrySchema.statics.getDailyTotal = async function(userId, dateStr) {
  const entries = await this.find({ user: userId, date: dateStr })
    .populate('person', 'name type')
    .sort({ createdAt: -1 })
    .lean();
  
  const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);
  return { entries, totalMinutes };
};

// Static method: upsert an entry (create or update)
timeEntrySchema.statics.upsertEntry = function(userId, personId, dateStr, duration, notes = '') {
  return this.findOneAndUpdate(
    { user: userId, person: personId, date: dateStr },
    { $set: { duration, notes } },
    { upsert: true, new: true, lean: true }
  );
};

// Static method: get paginated entries (cursor‑based)
timeEntrySchema.statics.getPaginatedEntries = async function(userId, limit, cursor = null) {
  const query = { user: userId };
  if (cursor) query._id = { $lt: cursor };
  
  const entries = await this.find(query)
    .sort({ _id: -1 })
    .limit(limit)
    .populate('person', 'name type')
    .lean();
  
  const nextCursor = entries.length === limit ? entries[entries.length - 1]._id : null;
  return { entries, nextCursor, hasMore: !!nextCursor };
};

// Static method: delete an entry for a user
timeEntrySchema.statics.deleteEntry = function(entryId, userId) {
  return this.deleteOne({ _id: entryId, user: userId }).lean();
};

module.exports = mongoose.model('TimeEntry', timeEntrySchema);