// backend/models/CustomHourBlock.js
const mongoose = require('mongoose');

const customHourBlockSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },        // date only (start of day)
  blocks: [{ type: String, required: true }],  // e.g., ["22:00 - 00:00", "00:00 - 02:00"]
});

module.exports = mongoose.model('CustomHourBlock', customHourBlockSchema);