const crypto = require('crypto');

// Hash OTP with SHA‑256 (store hashed, never plain)
const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

// Verify OTP against hashed value
const verifyOtp = (plainOtp, hashedOtp) => {
  return hashOtp(plainOtp) === hashedOtp;
};

// Generate refresh token (random string) and its hash for storage
const generateRefreshToken = () => {
  const raw = crypto.randomBytes(64).toString('hex');
  const hashed = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hashed };
};

module.exports = { hashOtp, verifyOtp, generateRefreshToken };