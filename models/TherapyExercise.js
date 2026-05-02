// const mongoose = require('mongoose');

// const therapySchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   type: { type: String, enum: ['hotpotato', 'forgiveness', 'selftalk', 'receiving'], required: true },
//   content: { type: String },
//   completed: { type: Boolean, default: false }, // optional, keep for legacy
//   date: { type: Date, default: Date.now },
//   count: { type: Number, default: 0 },           // total repetitions
//   repetitionDates: [{ type: Date }]              // dates when repetitions were added
// }, { timestamps: true });

// module.exports = mongoose.model('TherapyExercise', therapySchema);


const mongoose = require('mongoose');

// Validator for repetitionDates array size
const arrayLimit = (val) => val.length <= 500;

const therapySchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  type: { 
    type: String, 
    enum: ['hotpotato', 'forgiveness', 'selftalk', 'receiving'], 
    required: true,
    index: true
  },
  content: { 
    type: String, 
    maxlength: 5000, 
    trim: true,
    default: '' 
  },
  completed: { 
    type: Boolean, 
    default: false,
    index: true 
  }, // legacy, keep as is
  date: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  dateStr: { 
    type: String, 
    default: () => new Date().toISOString().split('T')[0],
    index: true
  },
  count: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  repetitionDates: {
    type: [Date],
    default: [],
    validate: [arrayLimit, 'Repetition dates cannot exceed 500 entries']
  }
}, { timestamps: true });

// Indexes
therapySchema.index({ user: 1, type: 1 });
therapySchema.index({ user: 1, date: -1 });
therapySchema.index({ user: 1, type: 1, date: -1 });
therapySchema.index({ type: 1, date: -1 }); // admin

// Static method to increment repetition count (atomic)
therapySchema.statics.addRepetition = async function(userId, exerciseType, options = {}) {
  const update = { $inc: { count: 1 } };
  
  if (options.addDate) {
    const dateToAdd = options.date || new Date();
    if (options.avoidDuplicates) {
      // Set time to midnight to avoid duplicate days
      const normalized = new Date(dateToAdd);
      normalized.setHours(0, 0, 0, 0);
      update.$addToSet = { repetitionDates: normalized };
    } else {
      update.$push = { repetitionDates: dateToAdd };
    }
  }
  
  return this.updateOne(
    { user: userId, type: exerciseType },
    update,
    { upsert: true }
  );
};

// Static method to get user's exercise progress
therapySchema.statics.getUserProgress = async function(userId) {
  const exercises = await this.find({ user: userId })
    .select('type count content date')
    .lean();
  return exercises;
};

// Instance method to add repetition without database round-trip (use when you already have doc)
therapySchema.methods.addRepetition = async function(date = new Date()) {
  this.count++;
  this.repetitionDates.push(date);
  await this.save();
  return this;
};

module.exports = mongoose.model('TherapyExercise', therapySchema);