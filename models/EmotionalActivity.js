// const mongoose = require('mongoose');

// const emotionalSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   date: { type: Date, default: Date.now },
//   emotion: { type: String },      // e.g., happy, sad, anxious
//   intensity: { type: Number, min: 1, max: 10 },
//   note: { type: String },
// });

// module.exports = mongoose.model('EmotionalActivity', emotionalSchema);



const mongoose = require('mongoose');

const emotionalSchema = new mongoose.Schema({
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
  emotion: { 
  type: String, 
  required: true,
  enum: ['happy', 'sad', 'anxious', 'angry', 'calm', 'grateful', 'stressed', 'excited', 'frustrated', 'hopeful', 'tired', 'loved', 'lonely', 'peaceful'],
  lowercase: true,
  trim: true,
  index: true
},
  intensity: { 
    type: Number, 
    min: 1, 
    max: 10,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: 'Intensity must be an integer between 1 and 10'
    }
  },
  note: { 
    type: String, 
    maxlength: 500,
    trim: true,
    default: ''
  }
}, { timestamps: true });

// Indexes
emotionalSchema.index({ user: 1, date: -1 });
emotionalSchema.index({ user: 1, emotion: 1, date: -1 });
emotionalSchema.index({ date: -1 }); // for admin reports

// Static method to get last N days summary (caching friendly)
emotionalSchema.statics.getWeeklySummary = async function(userId, days = 7) {
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  const startStr = startDate.toISOString().split('T')[0];
  
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), date: { $gte: startStr, $lte: today } } },
    { $group: { _id: "$date", avgIntensity: { $avg: "$intensity" }, dominantEmotion: { $first: "$emotion" } } },
    { $sort: { _id: 1 } }
  ]);
};

// Static method to add multiple entries (batch)
emotionalSchema.statics.addBatch = async function(userId, entries) {
  const docs = entries.map(entry => ({
    user: userId,
    date: entry.date || new Date().toISOString().split('T')[0],
    emotion: entry.emotion,
    intensity: entry.intensity,
    note: entry.note || ''
  }));
  return this.insertMany(docs, { ordered: false });
};

module.exports = mongoose.model('EmotionalActivity', emotionalSchema);