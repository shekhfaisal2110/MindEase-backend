// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// const userSchema = new mongoose.Schema({
//   username: {
//     type: String,
//     required: true,
//     unique: true,
//     trim: true,
//     minlength: 3,
//     maxlength: 30,
//     match: /^[a-zA-Z0-9_]+$/
//   },
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//     lowercase: true,
//     trim: true,
//     match: /^\S+@\S+\.\S+$/
//   },
//   password: {
//     type: String,
//     required: true,
//     minlength: 6,
//     maxlength: 100
//   },
//   isVerified: { type: Boolean, default: false },
  
//   // Simplified OTP (single source)
//   otp: { type: String, default: null },
//   otpExpires: { type: Date, default: null },
//   otpPurpose: { type: String, enum: ['verification', 'passwordReset'], default: 'verification' },
  
//   // Capped login history (size controlled in controller via $slice)
//   loginHistory: [{
//     email: { type: String, required: true },
//     timestamp: { type: Date, default: Date.now }
//   }],
  
//   // Hashed refresh token
//   refreshTokenHash: { type: String, default: null, sparse: true },
//   refreshTokenExpires: { type: Date, default: null },
  
//   gratitudeChallengeTarget: { type: Number, default: 33, min: 1, max: 365 },
//   hideFromLeaderboard: { type: Boolean, default: true, index: true },
//   lastReportNotifiedMonth: { type: String, default: null },
//   lastMonthStartNotified: { type: String, default: null },
//   welcomeNotificationSent: { type: Boolean, default: false, index: true }
// }, { timestamps: true });

// // Indexes
// userSchema.index({ refreshTokenHash: 1 }, { sparse: true });
// userSchema.index({ createdAt: -1 }); // for analytics
// userSchema.index({ hideFromLeaderboard: 1, createdAt: -1 }); // for leaderboard

// // Pre-save hash password
// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

// userSchema.methods.comparePassword = async function(candidatePassword) {
//   return bcrypt.compare(candidatePassword, this.password);
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
    match: /^[a-zA-Z0-9_]+$/,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^\S+@\S+\.\S+$/,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 100
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  otpPurpose: {
    type: String,
    enum: ['verification', 'passwordReset'],
    default: 'verification'
  },
  loginHistory: [{
    email: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  refreshTokenHash: {
    type: String,
    default: null,
    sparse: true,
    index: true
  },
  refreshTokenExpires: { type: Date, default: null },
  gratitudeChallengeTarget: {
    type: Number,
    default: 33,
    min: 1,
    max: 365
  },
  hideFromLeaderboard: {
    type: Boolean,
    default: true,
    index: true
  },
  lastReportNotifiedMonth: { type: String, default: null },
  lastMonthStartNotified: { type: String, default: null },
  welcomeNotificationSent: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  // Remove __v from JSON output
  toJSON: { transform: (doc, ret) => { delete ret.__v; delete ret.password; delete ret.refreshTokenHash; delete ret.otp; return ret; } },
  toObject: { transform: (doc, ret) => { delete ret.__v; delete ret.password; delete ret.refreshTokenHash; delete ret.otp; return ret; } }
});

// ========== INDEXES (optimized) ==========
// Unique indexes already on username and email
// Compound indexes for common queries
userSchema.index({ email: 1, isVerified: 1 });       // for login/verification checks
userSchema.index({ refreshTokenHash: 1 }, { sparse: true });
userSchema.index({ createdAt: -1 });                 // for analytics
userSchema.index({ hideFromLeaderboard: 1, createdAt: -1 }); // for leaderboard

// ========== PRE‑SAVE HOOK (keep but efficient) ==========
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ========== INSTANCE METHODS ==========
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ========== STATIC METHODS (optimized, lean, atomic) ==========

/**
 * Find user by email, select minimal fields (lean)
 * @param {string} email
 * @returns {Promise<object|null>}
 */
userSchema.statics.findByEmail = function(email, includeSensitive = false) {
  const projection = includeSensitive
    ? 'username email password isVerified refreshTokenHash refreshTokenExpires'
    : 'username email isVerified createdAt hideFromLeaderboard gratitudeChallengeTarget';
  return this.findOne({ email }, projection).lean().exec();
};

/**
 * Find user by ID (lean, with optional projection)
 * @param {string|ObjectId} userId
 * @returns {Promise<object|null>}
 */
userSchema.statics.findByIdLean = function(userId, projection = 'username email isVerified createdAt') {
  return this.findById(userId, projection).lean().exec();
};

/**
 * Create a new user (auto‑hashes password via pre‑save)
 * @param {object} userData
 * @returns {Promise<object>} lean user (without password)
 */
userSchema.statics.createUser = async function(userData) {
  const user = new this(userData);
  await user.save();
  return user.toJSON();
};

/**
 * Atomic update: set OTP and expiry (for verification or reset)
 * @param {string} email
 * @param {string} otp
 * @param {number} expiryMinutes
 * @param {string} purpose
 * @returns {Promise<object>} update result
 */
userSchema.statics.setOtp = async function(email, otp, expiryMinutes = 10, purpose = 'verification') {
  const expires = new Date(Date.now() + expiryMinutes * 60 * 1000);
  return this.updateOne(
    { email },
    { $set: { otp, otpExpires: expires, otpPurpose: purpose } },
    { runValidators: false }
  ).lean().exec();
};

/**
 * Verify OTP and clear it atomically (if valid)
 * @param {string} email
 * @param {string} otp
 * @param {string} [purpose] - optional, check purpose
 * @returns {Promise<object|null>} user document (lean) if verified, else null
 */
userSchema.statics.verifyOtp = async function(email, otp, purpose = null) {
  const query = { email, otp, otpExpires: { $gt: new Date() } };
  if (purpose) query.otpPurpose = purpose;
  const user = await this.findOneAndUpdate(
    query,
    { $unset: { otp: "", otpExpires: "", otpPurpose: "" } },
    { new: true, lean: true }
  ).exec();
  return user;
};

/**
 * Atomic: set refresh token hash and expiry
 * @param {string|ObjectId} userId
 * @param {string} refreshTokenHash
 * @param {number} expiresInDays
 * @returns {Promise<object>}
 */
userSchema.statics.setRefreshToken = async function(userId, refreshTokenHash, expiresInDays = 7) {
  const expires = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  return this.updateOne(
    { _id: userId },
    { $set: { refreshTokenHash, refreshTokenExpires: expires } },
    { runValidators: false }
  ).exec();
};

/**
 * Clear refresh token (logout)
 * @param {string|ObjectId} userId
 * @returns {Promise<object>}
 */
userSchema.statics.clearRefreshToken = async function(userId) {
  return this.updateOne(
    { _id: userId },
    { $unset: { refreshTokenHash: "", refreshTokenExpires: "" } },
    { runValidators: false }
  ).exec();
};

/**
 * Add login history entry (capped – keep only last 20 entries)
 * Uses $push with $slice to maintain array size without loading the whole document.
 * @param {string|ObjectId} userId
 * @param {string} email
 * @returns {Promise<object>}
 */
userSchema.statics.addLoginHistory = async function(userId, email) {
  return this.updateOne(
    { _id: userId },
    {
      $push: {
        loginHistory: {
          $each: [{ email, timestamp: new Date() }],
          $slice: -20    // keep only last 20 entries
        }
      }
    },
    { runValidators: false }
  ).exec();
};

/**
 * Increment gratitude challenge target (atomic)
 * @param {string|ObjectId} userId
 * @param {number} increment
 * @returns {Promise<object>}
 */
userSchema.statics.incrementGratitudeTarget = async function(userId, increment = 1) {
  return this.updateOne(
    { _id: userId },
    { $inc: { gratitudeChallengeTarget: increment } },
    { runValidators: true }
  ).exec();
};

module.exports = mongoose.model('User', userSchema);