const mongoose = require('mongoose');

const ikigaiSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  love: { type: [String], default: [] },        // things you love
  skill: { type: [String], default: [] },       // things you are good at
  worldNeed: { type: [String], default: [] },   // what the world needs
  earn: { type: [String], default: [] },        // what you can be paid for
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Ikigai', ikigaiSchema);