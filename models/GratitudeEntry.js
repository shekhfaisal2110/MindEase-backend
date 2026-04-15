const mongoose = require('mongoose');

const gratitudeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  people: { type: String, default: '' },
  things: { type: String, default: '' },
  situations: { type: String, default: '' },
  notes: { type: String },
});

module.exports = mongoose.model('GratitudeEntry', gratitudeSchema);