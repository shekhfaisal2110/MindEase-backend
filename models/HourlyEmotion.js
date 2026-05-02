// const mongoose = require('mongoose');

// const hourlyEmotionSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   date: { type: Date, required: true }, // date only (without time)
//   hourBlock: { type: String, required: true }, // e.g., "6-8", "8-10"
//   emotion: { type: String, enum: ['positive', 'negative', 'neutral'], required: true },
// }, { timestamps: true });

// // Unique per user per date per hourBlock
// hourlyEmotionSchema.index({ user: 1, date: 1, hourBlock: 1 }, { unique: true });

// module.exports = mongoose.model('HourlyEmotion', hourlyEmotionSchema);


const mongoose = require('mongoose');

const hourlyEmotionSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  date: { 
    type: String,  // 'YYYY-MM-DD'
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  hourBlock: { 
    type: String, 
    required: true,
    match: /^([0-9]|1[0-9]|2[0-3])-([0-9]|1[0-9]|2[0-3])$/,
    validate: {
      validator: function(v) {
        const [start, end] = v.split('-').map(Number);
        return start < end && start >= 0 && end <= 24;
      },
      message: 'Invalid hour block. Use format like "6-8" or "10-12"'
    }
  },
  emotion: { 
    type: String, 
    enum: ['positive', 'negative', 'neutral'], 
    required: true 
  }
}, { timestamps: true });

// Indexes
hourlyEmotionSchema.index({ user: 1, date: 1, hourBlock: 1 }, { unique: true });
hourlyEmotionSchema.index({ user: 1, date: -1 }); // for date range

// Static method to get today's full schedule (mapped object)
hourlyEmotionSchema.statics.getTodaySchedule = async function(userId) {
  const today = new Date().toISOString().split('T')[0];
  const records = await this.find(
    { user: userId, date: today },
    { hourBlock: 1, emotion: 1, _id: 0 }
  ).lean();
  
  const schedule = {};
  records.forEach(r => { schedule[r.hourBlock] = r.emotion; });
  return schedule;
};

// Static method to upsert an emotion for a specific hour block
hourlyEmotionSchema.statics.setEmotion = async function(userId, dateStr, hourBlock, emotion) {
  return this.updateOne(
    { user: userId, date: dateStr, hourBlock },
    { $set: { emotion } },
    { upsert: true }
  );
};

module.exports = mongoose.model('HourlyEmotion', hourlyEmotionSchema);