// // backend/models/CustomHourBlock.js
// const mongoose = require('mongoose');

// const customHourBlockSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   date: { type: Date, required: true },        // date only (start of day)
//   blocks: [{ type: String, required: true }],  // e.g., ["22:00 - 00:00", "00:00 - 02:00"]
// });

// module.exports = mongoose.model('CustomHourBlock', customHourBlockSchema);




const mongoose = require('mongoose');

const customHourBlockSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  date: { 
    type: String,  // 'YYYY-MM-DD' format
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  blocks: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return v.every(block => /^\d{2}:\d{2} - \d{2}:\d{2}$/.test(block));
      },
      message: 'Invalid time block format. Use "HH:MM - HH:MM"'
    }
  }
}, { timestamps: true });

// Unique compound index: ek user ki ek date par sirf ek document
customHourBlockSchema.index({ user: 1, date: 1 }, { unique: true });

// Date range queries ke liye
customHourBlockSchema.index({ date: -1 });

// Static method to get or create blank blocks for a date
customHourBlockSchema.statics.getOrCreate = async function(userId, dateStr, defaultBlocks = []) {
  let record = await this.findOne({ user: userId, date: dateStr }).lean();
  if (!record) {
    record = await this.create({ user: userId, date: dateStr, blocks: defaultBlocks });
  }
  return record;
};

// Instance method to update blocks
customHourBlockSchema.methods.updateBlocks = async function(newBlocks) {
  this.blocks = newBlocks;
  await this.save();
  return this;
};

module.exports = mongoose.model('CustomHourBlock', customHourBlockSchema);