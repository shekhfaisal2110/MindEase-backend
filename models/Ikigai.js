// const mongoose = require('mongoose');

// const ikigaiSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   love: { type: [String], default: [] },        // things you love
//   skill: { type: [String], default: [] },       // things you are good at
//   worldNeed: { type: [String], default: [] },   // what the world needs
//   earn: { type: [String], default: [] },        // what you can be paid for
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model('Ikigai', ikigaiSchema);


const mongoose = require('mongoose');

// Array size validator
const arrayLimit = (val) => val.length <= 50;
const stringLengthLimit = (val) => val.length <= 100;

const ikigaiSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true,  // shortcut for unique index
    index: true
  },
  love: { 
    type: [String], 
    default: [],
    validate: [arrayLimit, 'Love array cannot exceed 50 items']
  },
  skill: { 
    type: [String], 
    default: [],
    validate: [arrayLimit, 'Skill array cannot exceed 50 items']
  },
  worldNeed: { 
    type: [String], 
    default: [],
    validate: [arrayLimit, 'WorldNeed array cannot exceed 50 items']
  },
  earn: { 
    type: [String], 
    default: [],
    validate: [arrayLimit, 'Earn array cannot exceed 50 items']
  }
}, { timestamps: true }); // auto createdAt, updatedAt

// Indexes for array searches (if needed)
ikigaiSchema.index({ love: 1 });
ikigaiSchema.index({ skill: 1 });

// Static method to get or create empty ikigai
ikigaiSchema.statics.getOrCreate = async function(userId) {
  let ikigai = await this.findOne({ user: userId }).lean();
  if (!ikigai) {
    ikigai = await this.create({ user: userId });
  }
  return ikigai;
};

// Instance method to add item to a category (with duplicate check)
ikigaiSchema.methods.addItem = async function(category, item) {
  if (!this[category]) return false;
  if (this[category].includes(item)) return false;
  this[category].push(item);
  await this.save();
  return true;
};

// Instance method to remove item from a category
ikigaiSchema.methods.removeItem = async function(category, item) {
  if (!this[category]) return false;
  this[category] = this[category].filter(i => i !== item);
  await this.save();
  return true;
};

module.exports = mongoose.model('Ikigai', ikigaiSchema);