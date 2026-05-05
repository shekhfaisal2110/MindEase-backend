// const mongoose = require('mongoose');

// const sleepLogSchema = new mongoose.Schema({
//   user: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true,
//     index: true
//   },
//   date: { 
//     type: String,  // 'YYYY-MM-DD'
//     required: true,
//     match: /^\d{4}-\d{2}-\d{2}$/
//   },
//   bedtime: { 
//     type: String, 
//     required: true,
//     match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
//   },
//   wakeTime: { 
//     type: String, 
//     required: true,
//     match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
//   },
//   duration: { 
//     type: Number, 
//     required: true, 
//     min: 0, 
//     max: 24 
//   },
//   quality: { 
//     type: Number, 
//     required: true, 
//     min: 1, 
//     max: 5,
//     validate: { validator: Number.isInteger, message: 'Quality must be integer' }
//   },
//   notes: { 
//     type: String, 
//     default: '', 
//     trim: true, 
//     maxlength: 500 
//   }
// }, { timestamps: true });

// // Indexes
// sleepLogSchema.index({ user: 1, date: 1 }, { unique: true });
// sleepLogSchema.index({ user: 1, date: -1 });
// sleepLogSchema.index({ date: -1 }); // for cross-user reports

// // Pre-save hook to auto-calculate duration (optional, if not provided)
// sleepLogSchema.pre('save', function(next) {
//   if (this.isModified('bedtime') || this.isModified('wakeTime')) {
//     const [bedHour, bedMin] = this.bedtime.split(':').map(Number);
//     const [wakeHour, wakeMin] = this.wakeTime.split(':').map(Number);
    
//     let bedTotal = bedHour * 60 + bedMin;
//     let wakeTotal = wakeHour * 60 + wakeMin;
    
//     if (wakeTotal < bedTotal) wakeTotal += 24 * 60;
    
//     const durationMinutes = wakeTotal - bedTotal;
//     this.duration = +(durationMinutes / 60).toFixed(1);
//   }
//   next();
// });

// // Static method to get sleep logs for date range
// sleepLogSchema.statics.getRange = async function(userId, startDate, endDate, limit = 100) {
//   return this.find(
//     { user: userId, date: { $gte: startDate, $lte: endDate } },
//     { bedtime: 1, wakeTime: 1, duration: 1, quality: 1, notes: 1 }
//   )
//   .sort({ date: -1 })
//   .limit(limit)
//   .lean();
// };

// // Static method to get average quality for last N days
// sleepLogSchema.statics.getAverageQuality = async function(userId, days = 7) {
//   const startDate = new Date();
//   startDate.setDate(startDate.getDate() - days + 1);
//   const startStr = startDate.toISOString().split('T')[0];
  
//   const result = await this.aggregate([
//     { $match: { user: mongoose.Types.ObjectId(userId), date: { $gte: startStr } } },
//     { $group: { _id: null, avgQuality: { $avg: "$quality" }, avgDuration: { $avg: "$duration" }, totalLogs: { $sum: 1 } } }
//   ]);
//   return result[0] || { avgQuality: 0, avgDuration: 0, totalLogs: 0 };
// };

// module.exports = mongoose.model('SleepLog', sleepLogSchema);






const mongoose = require('mongoose');

const sleepLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String,        // YYYY-MM-DD
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  bedtime: {
    type: String,        // HH:MM (24h)
    required: true,
    match: /^([01]\d|2[0-3]):[0-5]\d$/
  },
  wakeTime: {
    type: String,
    required: true,
    match: /^([01]\d|2[0-3]):[0-5]\d$/
  },
  duration: {
    type: Number,        // hours (decimal)
    default: 0
  },
  quality: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  notes: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true,
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; return ret; } }
});

// Unique index: one log per user per day
sleepLogSchema.index({ user: 1, date: 1 }, { unique: true });

// Pre‑save hook: ensure duration is recalculated
sleepLogSchema.pre('save', function(next) {
  if (this.isModified('bedtime') || this.isModified('wakeTime')) {
    const [bedHour, bedMin] = this.bedtime.split(':').map(Number);
    const [wakeHour, wakeMin] = this.wakeTime.split(':').map(Number);
    let bed = bedHour * 60 + bedMin;
    let wake = wakeHour * 60 + wakeMin;
    if (wake < bed) wake += 24 * 60;
    this.duration = (wake - bed) / 60;
  }
  next();
});

module.exports = mongoose.model('SleepLog', sleepLogSchema);