const rateLimit = require('express-rate-limit');

// Helper: key generator using IP
const keyGenerator = (req) => req.ip;

// OTP limiter – 3 per hour per IP
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator,
  message: { message: 'Too many OTP requests. Try after an hour.' },
});

// Login limiter – 5 per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  keyGenerator,
  message: { message: 'Too many login attempts. Try after 15 minutes.' },
});

// Registration limiter – 3 per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator,
  message: { message: 'Too many registration attempts. Try later.' },
});

module.exports = { otpLimiter, loginLimiter, registerLimiter };