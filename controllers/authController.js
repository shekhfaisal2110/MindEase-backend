// const User = require('../models/User');
// const jwt = require('jsonwebtoken');
// const crypto = require('crypto');
// const { generateOTP, sendOTPEmail } = require('../utils/emailService');

// const generateToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
// const hashValue = (value) => crypto.createHash('sha256').update(value).digest('hex');

// // -------------------- REGISTRATION --------------------
// exports.register = async (req, res) => {
//   try {
//     const { username, email, password, confirmPassword } = req.body;
//     if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });
//     if (password.length < 6) return res.status(400).json({ message: 'Password too short' });
//     if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return res.status(400).json({ message: 'Invalid username' });

//     // Check existing verified user
//     const existingVerified = await User.findOne({ $or: [{ email, isVerified: true }, { username, isVerified: true }] });
//     if (existingVerified) {
//       if (existingVerified.email === email) return res.status(400).json({ message: 'Email already registered' });
//       if (existingVerified.username === username) return res.status(400).json({ message: 'Username taken' });
//     }

//     // Delete unverified records with same email/username
//     await User.deleteMany({ $or: [{ email, isVerified: false }, { username, isVerified: false }] });

//     const otp = generateOTP();
//     const hashedOtp = hashValue(otp);
//     const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

//     const user = new User({ username, email, password, otp: hashedOtp, otpExpires, isVerified: false });
//     await user.save();

//     // Send OTP email (will log OTP if fails)
//     await sendOTPEmail(email, otp, username, 'verification');

//     console.log(`🔐 REGISTRATION OTP for ${email}: ${otp}`); // always visible in server logs

//     res.status(201).json({ message: 'OTP sent to email. Please verify.', userId: user._id });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // -------------------- VERIFY OTP --------------------
// exports.verifyOTP = async (req, res) => {
//   try {
//     const { userId, otp } = req.body;
//     const user = await User.findOne({ _id: userId, isVerified: false });
//     if (!user) return res.status(404).json({ message: 'User not found or already verified' });
//     if (!user.otp || hashValue(otp) !== user.otp) return res.status(400).json({ message: 'Invalid OTP' });
//     if (user.otpExpires < new Date()) return res.status(400).json({ message: 'OTP expired' });

//     await User.updateOne({ _id: userId }, { $set: { isVerified: true }, $unset: { otp: "", otpExpires: "" } });
//     const token = generateToken(user._id);
//     res.json({ message: 'Account verified successfully', token, user: { id: user._id, username: user.username, email: user.email } });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // -------------------- RESEND OTP --------------------
// exports.resendOTP = async (req, res) => {
//   try {
//     const { email } = req.body;
//     const user = await User.findOne({ email, isVerified: false });
//     if (!user) return res.status(404).json({ message: 'User not found or already verified' });

//     const otp = generateOTP();
//     const hashedOtp = hashValue(otp);
//     await User.updateOne({ _id: user._id }, { $set: { otp: hashedOtp, otpExpires: new Date(Date.now() + 10 * 60 * 1000) } });

//     await sendOTPEmail(email, otp, user.username, 'verification');
//     console.log(`🔐 RESEND OTP for ${email}: ${otp}`);

//     res.json({ message: 'New OTP sent', userId: user._id });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // -------------------- LOGIN --------------------
// exports.login = async (req, res) => {
//   try {
//     const { email, password, rememberMe } = req.body;
//     const user = await User.findOne({ email, isVerified: true }).select('+password');
//     if (!user) return res.status(401).json({ message: 'Invalid credentials' });
//     const valid = await user.comparePassword(password);
//     if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

//     const accessToken = generateToken(user._id);
//     let refreshTokenRaw = null;

//     if (rememberMe) {
//       refreshTokenRaw = crypto.randomBytes(40).toString('hex');
//       const hashedRefresh = hashValue(refreshTokenRaw);
//       await User.updateOne({ _id: user._id }, { $set: { refreshToken: hashedRefresh, refreshTokenExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } });
//     } else {
//       await User.updateOne({ _id: user._id }, { $unset: { refreshToken: "", refreshTokenExpires: "" } });
//     }

//     // Add login history
//     await User.updateOne(
//       { _id: user._id },
//       { $push: { loginHistory: { $each: [{ email, timestamp: new Date() }], $slice: -5 } } }
//     );

//     res.json({
//       message: 'Login successful',
//       accessToken,
//       refreshToken: refreshTokenRaw,
//       user: { id: user._id, username: user.username, email: user.email }
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // -------------------- FORGOT PASSWORD (Send Reset OTP) --------------------
// exports.forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;
//     const user = await User.findOne({ email, isVerified: true });
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     const otp = generateOTP();
//     const hashedOtp = hashValue(otp);
//     await User.updateOne({ _id: user._id }, { $set: { otp: hashedOtp, otpExpires: new Date(Date.now() + 10 * 60 * 1000) } });

//     await sendOTPEmail(email, otp, user.username, 'reset');
//     console.log(`🔐 PASSWORD RESET OTP for ${email}: ${otp}`);

//     res.json({ message: 'Password reset OTP sent to your email', userId: user._id });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // -------------------- RESET PASSWORD (Verify OTP + Set new password) --------------------
// exports.resetPassword = async (req, res) => {
//   try {
//     const { userId, otp, newPassword, confirmPassword } = req.body;
//     if (newPassword !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });
//     if (newPassword.length < 6) return res.status(400).json({ message: 'Password too short' });

//     const user = await User.findOne({ _id: userId, isVerified: true });
//     if (!user) return res.status(404).json({ message: 'User not found' });
//     if (!user.otp || hashValue(otp) !== user.otp) return res.status(400).json({ message: 'Invalid OTP' });
//     if (user.otpExpires < new Date()) return res.status(400).json({ message: 'OTP expired' });

//     user.password = newPassword;
//     user.otp = undefined;
//     user.otpExpires = undefined;
//     await user.save();

//     res.json({ message: 'Password reset successful. Please login.' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };


// // Refresh token - compare hashed
// exports.refreshToken = async (req, res) => {
//   try {
//     const { refreshToken, email } = req.body;
//     if (!refreshToken || !email) return res.status(400).json({ message: 'Missing data' });
    
//     const user = await User.findOne({ email, refreshTokenExpires: { $gt: new Date() } });
//     if (!user) return res.status(401).json({ message: 'Invalid or expired refresh token' });
    
//     if (hashValue(refreshToken) !== user.refreshToken) return res.status(401).json({ message: 'Invalid token' });
    
//     const newAccessToken = generateToken(user._id);
//     res.json({ accessToken: newAccessToken });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Get login history
// exports.getLoginHistory = async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id).select('loginHistory');
//     res.json(user.loginHistory);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Check email exists
// exports.checkEmail = async (req, res) => {
//   try {
//     const { email } = req.params;
//     const user = await User.findOne({ email }).select('loginHistory isVerified');
//     if (!user) return res.json({ exists: false });
//     const recentLogins = user.loginHistory ? user.loginHistory.slice(0, 5) : [];
//     res.json({ exists: true, isVerified: user.isVerified, recentLogins });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Forgot password - uses separate OTP (but same field, we clear after use)
// exports.forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;
//     const user = await User.findOne({ email, isVerified: true });
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     const otp = generateOTP();
//     const hashedOtp = hashValue(otp);
//     await User.updateOne({ _id: user._id }, { $set: { otp: hashedOtp, otpExpires: new Date(Date.now() + 10 * 60 * 1000) } });

//     await sendOTPEmail(email, otp, user.username);
//     res.json({ message: 'OTP sent for password reset', userId: user._id });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Reset password
// exports.resetPassword = async (req, res) => {
//   try {
//     const { userId, otp, newPassword } = req.body;
//     const user = await User.findOne({ _id: userId, otp: { $exists: true } });
//     if (!user) return res.status(404).json({ message: 'User not found' });
//     if (hashValue(otp) !== user.otp) return res.status(400).json({ message: 'Invalid OTP' });
//     if (user.otpExpires < new Date()) return res.status(400).json({ message: 'OTP expired' });

//     user.password = newPassword;
//     user.otp = undefined;
//     user.otpExpires = undefined;
//     await user.save();

//     res.json({ message: 'Password reset successful' });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Get admin
// exports.getAdmin = async (req, res) => {
//   try {
//     const adminEmail = process.env.ADMIN_EMAIL;
//     if (!adminEmail) return res.status(500).json({ message: 'Admin email not configured' });
//     const admin = await User.findOne({ email: adminEmail }).select('_id username email');
//     if (!admin) return res.status(404).json({ message: 'Admin user not found' });
//     res.json({ id: admin._id, username: admin.username, email: admin.email });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };







const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { generateOTP, sendOTPEmail } = require('../utils/emailService');

const generateToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
const hashValue = (value) => crypto.createHash('sha256').update(value).digest('hex');

// -------------------- REGISTRATION --------------------
exports.register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });
    if (password.length < 6) return res.status(400).json({ message: 'Password too short' });
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return res.status(400).json({ message: 'Invalid username' });

    // Check existing verified user (lean, projection)
    const existing = await User.findOne({
      $or: [{ email, isVerified: true }, { username, isVerified: true }]
    }, { _id: 1, email: 1, username: 1 }).lean();
    if (existing) {
      if (existing.email === email) return res.status(400).json({ message: 'Email already registered' });
      if (existing.username === username) return res.status(400).json({ message: 'Username taken' });
    }

    // Delete unverified records with same email/username (atomic)
    await User.deleteMany({ $or: [{ email }, { username }], isVerified: false });

    const otp = generateOTP();
    const hashedOtp = hashValue(otp);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = new User({ username, email, password, otp: hashedOtp, otpExpires, isVerified: false });
    await user.save();

    await sendOTPEmail(email, otp, username, 'verification');
    console.log(`🔐 REGISTRATION OTP for ${email}: ${otp}`);

    res.status(201).json({ message: 'OTP sent to email. Please verify.', userId: user._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// -------------------- VERIFY OTP (atomic) --------------------
exports.verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const hashedOtp = hashValue(otp);
    const user = await User.findOneAndUpdate(
      { _id: userId, isVerified: false, otp: hashedOtp, otpExpires: { $gt: new Date() } },
      { $set: { isVerified: true }, $unset: { otp: "", otpExpires: "" } },
      { new: true, lean: true, projection: { _id: 1, username: 1, email: 1 } }
    );
    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

    const token = generateToken(user._id);
    res.json({ message: 'Account verified', token, user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// -------------------- RESEND OTP --------------------
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email, isVerified: false }, { _id: 1 }).lean();
    if (!user) return res.status(404).json({ message: 'User not found or already verified' });

    const otp = generateOTP();
    const hashedOtp = hashValue(otp);
    await User.updateOne(
      { _id: user._id },
      { $set: { otp: hashedOtp, otpExpires: new Date(Date.now() + 10 * 60 * 1000) } },
      { runValidators: false }
    );

    await sendOTPEmail(email, otp, user.username, 'verification');
    console.log(`🔐 RESEND OTP for ${email}: ${otp}`);
    res.json({ message: 'New OTP sent', userId: user._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// -------------------- LOGIN (atomic refresh token & login history) --------------------
exports.login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const user = await User.findOne({ email, isVerified: true }).select('+password _id username email').lean();
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await require('bcryptjs').compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const accessToken = generateToken(user._id);
    let refreshTokenRaw = null;
    const updateOps = {};

    if (rememberMe) {
      refreshTokenRaw = crypto.randomBytes(40).toString('hex');
      const hashedRefresh = hashValue(refreshTokenRaw);
      updateOps.refreshTokenHash = hashedRefresh;
      updateOps.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else {
      updateOps.$unset = { refreshTokenHash: "", refreshTokenExpires: "" };
    }

    // Add login history with capped array ($push, $slice) in one update
    await User.updateOne(
      { _id: user._id },
      {
        $push: { loginHistory: { $each: [{ email, timestamp: new Date() }], $slice: -5 } },
        ...(updateOps.$unset ? updateOps : { $set: updateOps })
      },
      { runValidators: false }
    );

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken: refreshTokenRaw,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// -------------------- FORGOT PASSWORD (Send Reset OTP) --------------------
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email, isVerified: true }, { _id: 1, username: 1 }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = generateOTP();
    const hashedOtp = hashValue(otp);
    await User.updateOne(
      { _id: user._id },
      { $set: { otp: hashedOtp, otpExpires: new Date(Date.now() + 10 * 60 * 1000) } },
      { runValidators: false }
    );

    await sendOTPEmail(email, otp, user.username, 'reset');
    console.log(`🔐 PASSWORD RESET OTP for ${email}: ${otp}`);
    res.json({ message: 'Password reset OTP sent', userId: user._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// -------------------- RESET PASSWORD (Verify OTP + atomic password update) --------------------
exports.resetPassword = async (req, res) => {
  try {
    const { userId, otp, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'Password too short' });

    const hashedOtp = hashValue(otp);
    // Find user with valid OTP and atomic update (set password and clear otp)
    const user = await User.findOneAndUpdate(
      { _id: userId, isVerified: true, otp: hashedOtp, otpExpires: { $gt: new Date() } },
      { $set: { password: newPassword }, $unset: { otp: "", otpExpires: "" } },
      { new: false, lean: true, runValidators: true }
    );
    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

    res.json({ message: 'Password reset successful. Please login.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// -------------------- REFRESH TOKEN (atomic check) --------------------
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken, email } = req.body;
    if (!refreshToken || !email) return res.status(400).json({ message: 'Missing data' });

    const hashedRefresh = hashValue(refreshToken);
    const user = await User.findOne(
      { email, refreshTokenHash: hashedRefresh, refreshTokenExpires: { $gt: new Date() } },
      { _id: 1 }
    ).lean();
    if (!user) return res.status(401).json({ message: 'Invalid or expired refresh token' });

    const newAccessToken = generateToken(user._id);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// -------------------- GET LOGIN HISTORY (lean, projection) --------------------
exports.getLoginHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id, { loginHistory: 1 }).lean();
    res.json(user?.loginHistory || []);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// -------------------- CHECK EMAIL EXISTS (lean) --------------------
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email }, { loginHistory: 1, isVerified: 1 }).lean();
    if (!user) return res.json({ exists: false });
    const recentLogins = user.loginHistory ? user.loginHistory.slice(0, 5) : [];
    res.json({ exists: true, isVerified: user.isVerified, recentLogins });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// -------------------- GET ADMIN (lean) --------------------
exports.getAdmin = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return res.status(500).json({ message: 'Admin email not configured' });
    const admin = await User.findOne({ email: adminEmail }, { _id: 1, username: 1, email: 1 }).lean();
    if (!admin) return res.status(404).json({ message: 'Admin user not found' });
    res.json({ id: admin._id, username: admin.username, email: admin.email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};