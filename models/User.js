// // const mongoose = require('mongoose');
// // const bcrypt = require('bcryptjs');

// // const userSchema = new mongoose.Schema({
// //   username: { type: String, required: true, unique: true, trim: true },
// //   email: { type: String, required: true, unique: true, lowercase: true },
// //   password: { type: String, required: true },
// //   isVerified: { type: Boolean, default: false },
// //   otp: { type: String },
// //   otpExpires: { type: Date },
// //   loginHistory: [{
// //     email: { type: String, required: true },
// //     timestamp: { type: Date, default: Date.now }
// //   }],
// //   refreshToken: { type: String, default: null },
// //   refreshTokenExpires: { type: Date, default: null },
// //   gratitudeChallengeTarget: { type: Number, default: 33 },
// //   pendingOTP: { type: String },
// //   pendingOTPExpires: { type: Date },
// //   otpVerifiedForPasswordChange: { type: Boolean, default: false },
// //   hideFromLeaderboard: { type: Boolean, default: true, }
// // }, { timestamps: true });

// // userSchema.pre('save', async function(next) {
// //   if (!this.isModified('password')) return next();
// //   this.password = await bcrypt.hash(this.password, 10);
// //   next();
// // });

// // userSchema.methods.comparePassword = async function(candidatePassword) {
// //   return await bcrypt.compare(candidatePassword, this.password);
// // };

// // module.exports = mongoose.model('User', userSchema);















// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// const userSchema = new mongoose.Schema({
//   username: { type: String, required: true, unique: true, trim: true },
//   email: { type: String, required: true, unique: true, lowercase: true },
//   password: { type: String, required: true },
//   isVerified: { type: Boolean, default: false },
//   otp: { type: String },
//   otpExpires: { type: Date },
//   loginHistory: [{
//     email: { type: String, required: true },
//     timestamp: { type: Date, default: Date.now }
//   }],
//   refreshToken: { type: String, default: null },
//   refreshTokenExpires: { type: Date, default: null },
//   gratitudeChallengeTarget: { type: Number, default: 33 },
//   pendingOTP: { type: String },
//   pendingOTPExpires: { type: Date },
//   otpVerifiedForPasswordChange: { type: Boolean, default: false },
//   // ✅ New users are HIDDEN from leaderboard by default
//   hideFromLeaderboard: { type: Boolean, default: true }
// }, { timestamps: true });

// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

// userSchema.methods.comparePassword = async function(candidatePassword) {
//   return await bcrypt.compare(candidatePassword, this.password);
// };

// module.exports = mongoose.model('User', userSchema);





const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^\S+@\S+\.\S+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 100
  },
  isVerified: { type: Boolean, default: false },
  
  // Simplified OTP (single source)
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  otpPurpose: { type: String, enum: ['verification', 'passwordReset'], default: 'verification' },
  
  // Capped login history (size controlled in controller via $slice)
  loginHistory: [{
    email: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Hashed refresh token
  refreshTokenHash: { type: String, default: null, sparse: true },
  refreshTokenExpires: { type: Date, default: null },
  
  gratitudeChallengeTarget: { type: Number, default: 33, min: 1, max: 365 },
  hideFromLeaderboard: { type: Boolean, default: true, index: true },
  lastReportNotifiedMonth: { type: String, default: null },
  lastMonthStartNotified: { type: String, default: null },
  welcomeNotificationSent: { type: Boolean, default: false, index: true }
}, { timestamps: true });

// Indexes
userSchema.index({ refreshTokenHash: 1 }, { sparse: true });
userSchema.index({ createdAt: -1 }); // for analytics
userSchema.index({ hideFromLeaderboard: 1, createdAt: -1 }); // for leaderboard

// Pre-save hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);