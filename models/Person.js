const mongoose = require('mongoose');

const personSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['family', 'friend'], required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Person', personSchema);