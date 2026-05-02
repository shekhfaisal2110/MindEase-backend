// const mongoose = require('mongoose');

// const gratitudeSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   date: { type: Date, default: Date.now },
//   people: { type: String, default: '' },
//   things: { type: String, default: '' },
//   situations: { type: String, default: '' },
//   notes: { type: String },
// });

// module.exports = mongoose.model('GratitudeEntry', gratitudeSchema);


const mongoose = require('mongoose');

const gratitudeSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  date: { 
    type: String,  // 'YYYY-MM-DD'
    required: true,
    default: () => new Date().toISOString().split('T')[0]
  },
  people: { 
    type: String, 
    default: '', 
    trim: true, 
    maxlength: 500 
  },
  things: { 
    type: String, 
    default: '', 
    trim: true, 
    maxlength: 500 
  },
  situations: { 
    type: String, 
    default: '', 
    trim: true, 
    maxlength: 500 
  },
  notes: { 
    type: String, 
    default: '', 
    trim: true, 
    maxlength: 1000 
  }
}, { timestamps: true });

// Compound index: user + date descending (for latest entries)
gratitudeSchema.index({ user: 1, date: -1 });

// Optional: prevent duplicate entries per user per day
gratitudeSchema.index({ user: 1, date: 1 }, { unique: true });

// Static method to get entries for date range (with caching)
gratitudeSchema.statics.getEntriesForRange = async function(userId, startDateStr, endDateStr, excludeNotes = true) {
  let projection = { date: 1, people: 1, things: 1, situations: 1 };
  if (excludeNotes) projection.notes = 0;
  
  return this.find(
    { user: userId, date: { $gte: startDateStr, $lte: endDateStr } },
    projection
  )
  .sort({ date: -1 })
  .lean();
};

// Static method to get today's entry (or null)
gratitudeSchema.statics.getToday = async function(userId) {
  const today = new Date().toISOString().split('T')[0];
  return this.findOne({ user: userId, date: today }).lean();
};

// Static method to create or update today's entry (upsert)
gratitudeSchema.statics.upsertToday = async function(userId, data) {
  const today = new Date().toISOString().split('T')[0];
  return this.findOneAndUpdate(
    { user: userId, date: today },
    { $set: data },
    { upsert: true, new: true, lean: true }
  );
};

// Instance method to get word count (example utility)
gratitudeSchema.methods.getWordCount = function() {
  const text = `${this.people} ${this.things} ${this.situations} ${this.notes}`;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
};

module.exports = mongoose.model('GratitudeEntry', gratitudeSchema);