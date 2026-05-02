// const mongoose = require('mongoose');

// const routineItemSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   completed: { type: Boolean, default: false }
// });

// const dailyRoutineSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   date: { type: Date, required: true },
//   mood: { type: Number, min: 1, max: 10 },
//   items: [routineItemSchema],
//   notes: { type: String }
// }, { timestamps: true });

// dailyRoutineSchema.index({ user: 1, date: 1 }, { unique: true });

// module.exports = mongoose.model('DailyRoutine', dailyRoutineSchema);






const mongoose = require('mongoose');

// Subdocument with index for name lookups (if needed)
const routineItemSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  completed: { type: Boolean, default: false }
});

const dailyRoutineSchema = new mongoose.Schema({
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
  mood: { 
    type: Number, 
    min: 1, 
    max: 10,
    validate: {
      validator: Number.isInteger,
      message: 'Mood must be an integer'
    }
  },
  items: {
    type: [routineItemSchema],
    default: [],
    validate: {
      validator: (v) => v.length <= 50,
      message: 'Cannot have more than 50 routine items per day'
    }
  },
  notes: { type: String, trim: true }
}, { timestamps: true });

// Indexes
dailyRoutineSchema.index({ user: 1, date: 1 }, { unique: true });
dailyRoutineSchema.index({ date: -1 });  // for reports

// Virtual for completion percentage
dailyRoutineSchema.virtual('completionPercentage').get(function() {
  if (!this.items.length) return 0;
  const completedCount = this.items.filter(item => item.completed).length;
  return Math.round((completedCount / this.items.length) * 100);
});

// Static method to get today's routine (caching friendly)
dailyRoutineSchema.statics.getToday = function(userId, excludeNotes = true) {
  const today = new Date().toISOString().split('T')[0];
  let projection = { mood: 1, items: 1 };
  if (excludeNotes) projection.notes = 0;
  return this.findOne({ user: userId, date: today }, projection).lean();
};

// Static method to toggle an item by name
dailyRoutineSchema.statics.toggleItem = async function(userId, date, itemName, completed) {
  return this.updateOne(
    { user: userId, date, "items.name": itemName },
    { $set: { "items.$.completed": completed } },
    { upsert: false }
  );
};

// Instance method to add new item (if not exists)
dailyRoutineSchema.methods.addItem = async function(itemName) {
  if (this.items.some(item => item.name === itemName)) return this;
  this.items.push({ name: itemName, completed: false });
  await this.save();
  return this;
};

module.exports = mongoose.model('DailyRoutine', dailyRoutineSchema);