// const mongoose = require('mongoose');

// const personSchema = new mongoose.Schema({
//   user: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true,
//     index: true
//   },
//   name: { 
//     type: String, 
//     required: true, 
//     trim: true, 
//     maxlength: 50
//   },
//   type: { 
//     type: String, 
//     enum: ['family', 'friend'], 
//     required: true
//   },
//   createdAt: { 
//     type: Date, 
//     default: Date.now 
//   }
// }, { timestamps: true }); // adds createdAt & updatedAt

// // Indexes
// personSchema.index({ user: 1, type: 1 });
// personSchema.index({ user: 1, createdAt: -1 });
// personSchema.index({ user: 1, name: 1 }, { unique: true }); // prevent duplicate name per user

// // Static method to get all persons grouped by type
// personSchema.statics.getGroupedByType = async function(userId) {
//   const persons = await this.find({ user: userId })
//     .select('name type')
//     .lean();
  
//   const grouped = { family: [], friend: [] };
//   persons.forEach(p => {
//     grouped[p.type].push(p.name);
//   });
//   return grouped;
// };

// // Static method to add a person (avoid duplicates)
// personSchema.statics.addPerson = async function(userId, name, type) {
//   return this.findOneAndUpdate(
//     { user: userId, name: name.trim(), type },
//     { $setOnInsert: { createdAt: new Date() } },
//     { upsert: true, new: true, lean: true }
//   );
// };

// // Static method to remove a person
// personSchema.statics.removePerson = async function(userId, name, type) {
//   return this.deleteOne({ user: userId, name: name.trim(), type });
// };

// module.exports = mongoose.model('Person', personSchema);




const mongoose = require('mongoose');

const personSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    enum: ['family', 'friend'],
    required: true
  }
}, {
  timestamps: true,
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } }
});

// Unique index: one person per user with the same name
personSchema.index({ user: 1, name: 1 }, { unique: true });

// Static method: get all persons for a user (sorted by name)
personSchema.statics.getPersons = function(userId) {
  return this.find({ user: userId })
    .sort({ name: 1 })
    .lean()
    .exec();
};

// Static method: add a new person
personSchema.statics.addPerson = function(userId, name, type) {
  return this.create({ user: userId, name: name.trim(), type });
};

module.exports = mongoose.model('Person', personSchema);