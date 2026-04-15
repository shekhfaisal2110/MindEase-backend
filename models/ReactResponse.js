const mongoose = require('mongoose');

const reactResponseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  emotion: { type: String, default: 'angry' },
  choice: { type: String, enum: ['react', 'response'], required: true },
  situation: { type: String, default: '' }, // optional description
  outcome: { type: String, default: '' },   // optional how it felt after
}, { timestamps: true });

module.exports = mongoose.model('ReactResponse', reactResponseSchema);