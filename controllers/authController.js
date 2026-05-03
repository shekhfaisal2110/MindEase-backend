// // const User = require('../models/User');
// // const jwt = require('jsonwebtoken');
// // const crypto = require('crypto');
// // const { generateOTP, sendOTPEmail } = require('../utils/emailService');

// // const generateToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
// // const generateRefreshToken = () => crypto.randomBytes(40).toString('hex');


// // exports.register = async (req, res) => {
// //   try {
// //     const { username, email, password, confirmPassword } = req.body;
// //     if (password !== confirmPassword) {
// //       return res.status(400).json({ message: 'Passwords do not match' });
// //     }

// //     // Check if email exists (any status)
// //     let existingUserByEmail = await User.findOne({ email });
    
// //     if (existingUserByEmail) {
// //       if (existingUserByEmail.isVerified) {
// //         return res.status(400).json({ message: 'Email already registered and verified' });
// //       } else {
// //         // Email exists but not verified – update user data and resend OTP
// //         existingUserByEmail.username = username;
// //         existingUserByEmail.password = password;
// //         const otp = generateOTP();
// //         existingUserByEmail.otp = otp;
// //         existingUserByEmail.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
// //         await existingUserByEmail.save();
        
// //         if (process.env.NODE_ENV === 'production') {
// //           await sendOTPEmail(email, otp, username);
// //         } else {
// //           console.log(`🔐 DEVELOPMENT MODE: OTP for ${email} is: ${otp}`);
// //         }
        
// //         return res.status(200).json({
// //           message: 'Account not verified. New OTP sent to your email.',
// //           userId: existingUserByEmail._id
// //         });
// //       }
// //     }
    
// //     // Check username uniqueness ONLY among verified users
// //     const usernameTaken = await User.findOne({ username, isVerified: true });
// //     if (usernameTaken) {
// //       return res.status(400).json({ message: 'Username already taken by a verified account' });
// //     }
    
// //     // Also check if username is taken by an unverified user – if so, delete that old unverified record and create new one
// //     const unverifiedWithSameUsername = await User.findOne({ username, isVerified: false });
// //     if (unverifiedWithSameUsername) {
// //       // Delete the old unverified record (since it's incomplete)
// //       await User.deleteOne({ _id: unverifiedWithSameUsername._id });
// //     }
    
// //     // Create new user
// //     const otp = generateOTP();
// //     const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
// //     const user = new User({ username, email, password, otp, otpExpires, isVerified: false });
// //     await user.save();
    
// //     if (process.env.NODE_ENV === 'production') {
// //       await sendOTPEmail(email, otp, username);
// //     } else {
// //       console.log(`🔐 DEVELOPMENT MODE: OTP for ${email} is: ${otp}`);
// //     }
    
// //     res.status(201).json({
// //       message: 'OTP sent to your email. Please verify to complete registration.',
// //       userId: user._id
// //     });
// //   } catch (error) {
// //     console.error(error);
// //     res.status(500).json({ message: 'Server error', error: error.message });
// //   }
// // };

// // exports.verifyOTP = async (req, res) => {
// //   try {
// //     const { userId, otp } = req.body;
// //     const user = await User.findById(userId);
// //     if (!user) return res.status(404).json({ message: 'User not found' });
// //     if (user.isVerified) return res.status(400).json({ message: 'Already verified' });
// //     if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
// //     if (user.otpExpires < new Date()) return res.status(400).json({ message: 'OTP expired' });

// //     user.isVerified = true;
// //     user.otp = undefined;
// //     user.otpExpires = undefined;
// //     await user.save();

// //     const token = generateToken(user._id);
// //     res.json({ message: 'Verified', token, user: { id: user._id, username: user.username, email: user.email } });
// //   } catch (error) {
// //     res.status(500).json({ message: 'Server error' });
// //   }
// // };

// // exports.resendOTP = async (req, res) => {
// //   try {
// //     const { email } = req.body;
// //     if (!email) {
// //       return res.status(400).json({ message: 'Email is required' });
// //     }

// //     const user = await User.findOne({ email });
// //     if (!user) {
// //       return res.status(404).json({ message: 'User not found' });
// //     }

// //     if (user.isVerified) {
// //       return res.status(400).json({ message: 'Email already verified' });
// //     }

// //     const otp = generateOTP();
// //     user.otp = otp;
// //     user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
// //     await user.save();

// //     if (process.env.NODE_ENV === 'development') {
// //       console.log(`\n🔐 DEVELOPMENT MODE (Resend): OTP for ${email} is: ${otp}\n`);
// //       return res.json({ message: 'OTP resent (check terminal)', userId: user._id });
// //     }

// //     await sendOTPEmail(email, otp, user.username);
// //     res.json({ message: 'OTP resent successfully', userId: user._id });
// //   } catch (error) {
// //     console.error('Resend OTP error:', error);
// //     res.status(500).json({ message: 'Server error. Please try again.' });
// //   }
// // };

// // exports.login = async (req, res) => {
// //   try {
// //     const { email, password, rememberMe } = req.body;
// //     const user = await User.findOne({ email });
// //     if (!user) return res.status(401).json({ message: 'Invalid credentials' });
// //     if (!user.isVerified) return res.status(401).json({ message: 'Please verify email first' });
// //     const valid = await user.comparePassword(password);
// //     if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

// //     // Add login history
// //     user.loginHistory.unshift({ email: user.email, timestamp: new Date() });
// //     user.loginHistory = user.loginHistory.slice(0, 5);

// //     if (rememberMe) {
// //       user.refreshToken = generateRefreshToken();
// //       user.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
// //     } else {
// //       user.refreshToken = null;
// //       user.refreshTokenExpires = null;
// //     }
// //     await user.save();

// //     const accessToken = generateToken(user._id);
// //     res.json({
// //       message: 'Login successful',
// //       accessToken,
// //       refreshToken: user.refreshToken,
// //       user: { id: user._id, username: user.username, email: user.email }
// //     });
// //   } catch (error) {
// //     res.status(500).json({ message: 'Server error' });
// //   }
// // };

// // exports.refreshToken = async (req, res) => {
// //   try {
// //     const { refreshToken, email } = req.body;
// //     if (!refreshToken || !email) {
// //       return res.status(400).json({ message: 'Missing refresh token or email' });
// //     }
// //     const user = await User.findOne({ email, refreshToken });
// //     if (!user || user.refreshTokenExpires < new Date()) {
// //       return res.status(401).json({ message: 'Invalid or expired refresh token' });
// //     }
// //     const newAccessToken = generateToken(user._id);
// //     res.json({ accessToken: newAccessToken });
// //   } catch (error) {
// //     res.status(500).json({ message: 'Server error' });
// //   }
// // };

// // exports.getLoginHistory = async (req, res) => {
// //   try {
// //     const user = await User.findById(req.user._id).select('loginHistory');
// //     res.json(user.loginHistory);
// //   } catch (error) {
// //     res.status(500).json({ message: 'Server error' });
// //   }
// // };

// // exports.checkEmail = async (req, res) => {
// //   try {
// //     const { email } = req.params;
// //     const user = await User.findOne({ email }).select('loginHistory isVerified');
// //     if (!user) {
// //       return res.json({ exists: false });
// //     }
// //     // Return last 5 logins (most recent first)
// //     const recentLogins = user.loginHistory.slice(0, 5);
// //     res.json({
// //       exists: true,
// //       isVerified: user.isVerified,
// //       recentLogins
// //     });
// //   } catch (error) {
// //     res.status(500).json({ message: 'Server error' });
// //   }
// // };

// // exports.forgotPassword = async (req, res) => {
// //   try {
// //     const { email } = req.body;
// //     const user = await User.findOne({ email });
// //     if (!user) return res.status(404).json({ message: 'User not found' });

// //     const otp = generateOTP();
// //     user.otp = otp;
// //     user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
// //     await user.save();

// //     await sendOTPEmail(email, otp, user.username);
// //     res.json({ message: 'OTP sent for password reset', userId: user._id });
// //   } catch (error) {
// //     res.status(500).json({ message: 'Server error' });
// //   }
// // };

// // exports.resetPassword = async (req, res) => {
// //   try {
// //     const { userId, otp, newPassword } = req.body;
// //     const user = await User.findById(userId);
// //     if (!user) return res.status(404).json({ message: 'User not found' });
// //     if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
// //     if (user.otpExpires < new Date()) return res.status(400).json({ message: 'OTP expired' });

// //     user.password = newPassword;
// //     user.otp = undefined;
// //     user.otpExpires = undefined;
// //     await user.save();

// //     res.json({ message: 'Password reset successful' });
// //   } catch (error) {
// //     res.status(500).json({ message: 'Server error' });
// //   }
// // };


// // // Get admin user info (by email from .env)
// // exports.getAdmin = async (req, res) => {
// //   try {
// //     const adminEmail = process.env.ADMIN_EMAIL;
// //     if (!adminEmail) {
// //       return res.status(500).json({ message: 'Admin email not configured' });
// //     }
// //     const admin = await User.findOne({ email: adminEmail }).select('_id username email');
// //     if (!admin) {
// //       return res.status(404).json({ message: 'Admin user not found' });
// //     }
// //     res.json({ id: admin._id, username: admin.username, email: admin.email });
// //   } catch (error) {
// //     res.status(500).json({ message: error.message });
// //   }
// // };







// const User = require('../models/User');
// const jwt = require('jsonwebtoken');
// const crypto = require('crypto');
// const { generateOTP, sendOTPEmail } = require('../utils/emailService');

// const generateToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1d' });

// // Helper: hash OTP / token
// const hashValue = (value) => crypto.createHash('sha256').update(value).digest('hex');

// // Register - atomic upsert
// // exports.register = async (req, res) => {
// //   try {
// //     const { username, email, password, confirmPassword } = req.body;
// //     if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });
// //     if (password.length < 6) return res.status(400).json({ message: 'Password too short' });
// //     if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return res.status(400).json({ message: 'Invalid username' });

// //     // Check verified email & username
// //     const existingVerified = await User.findOne({ $or: [{ email, isVerified: true }, { username, isVerified: true }] });
// //     if (existingVerified) {
// //       if (existingVerified.email === email) return res.status(400).json({ message: 'Email already registered' });
// //       if (existingVerified.username === username) return res.status(400).json({ message: 'Username taken' });
// //     }

// //     // Delete any unverified user with same email/username to avoid conflict
// //     await User.deleteMany({ $or: [{ email, isVerified: false }, { username, isVerified: false }] });

// //     const otp = generateOTP();
// //     const hashedOtp = hashValue(otp);
// //     const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

// //     const user = new User({ username, email, password, otp: hashedOtp, otpExpires, isVerified: false });
// //     await user.save();

// //     if (process.env.NODE_ENV === 'production') {
// //       await sendOTPEmail(email, otp, username);
// //     } else {
// //       console.log(`🔐 DEV OTP for ${email}: ${otp}`);
// //     }
// //     res.status(201).json({ message: 'OTP sent', userId: user._id });
// //   } catch (error) {
// //     console.error(error);
// //     res.status(500).json({ message: 'Server error' });
// //   }
// // };

// exports.register = async (req, res) => {
//   try {
//     const { username, email, password, confirmPassword } = req.body;
//     if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });
//     if (password.length < 6) return res.status(400).json({ message: 'Password too short' });
//     if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return res.status(400).json({ message: 'Invalid username' });

//     // Check verified email & username
//     const existingVerified = await User.findOne({ $or: [{ email, isVerified: true }, { username, isVerified: true }] });
//     if (existingVerified) {
//       if (existingVerified.email === email) return res.status(400).json({ message: 'Email already registered' });
//       if (existingVerified.username === username) return res.status(400).json({ message: 'Username taken' });
//     }

//     // Delete any unverified user with same email/username to avoid conflict
//     await User.deleteMany({ $or: [{ email, isVerified: false }, { username, isVerified: false }] });

//     const otp = generateOTP();
//     const hashedOtp = hashValue(otp);
//     const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

//     const user = new User({ username, email, password, otp: hashedOtp, otpExpires, isVerified: false });
//     await user.save();

//     // Attempt to send email (will log OTP on failure)
//     await sendOTPEmail(email, otp, username);
    
//     // Also explicitly log OTP for debugging (always visible in server logs)
//     console.log(`🔐 REGISTRATION OTP for ${email}: ${otp}`);

//     res.status(201).json({ message: 'OTP sent', userId: user._id });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Verify OTP - atomic
// exports.verifyOTP = async (req, res) => {
//   try {
//     const { userId, otp } = req.body;
//     const user = await User.findOne({ _id: userId, isVerified: false });
//     if (!user) return res.status(404).json({ message: 'User not found or already verified' });
//     if (!user.otp || hashValue(otp) !== user.otp) return res.status(400).json({ message: 'Invalid OTP' });
//     if (user.otpExpires < new Date()) return res.status(400).json({ message: 'OTP expired' });

//     await User.updateOne({ _id: userId }, { $set: { isVerified: true }, $unset: { otp: "", otpExpires: "" } });
//     const token = generateToken(user._id);
//     res.json({ message: 'Verified', token, user: { id: user._id, username: user.username, email: user.email } });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Resend OTP - atomic
// exports.resendOTP = async (req, res) => {
//   try {
//     const { email } = req.body;
//     const user = await User.findOne({ email, isVerified: false });
//     if (!user) return res.status(404).json({ message: 'User not found or already verified' });

//     const otp = generateOTP();
//     const hashedOtp = hashValue(otp);
//     await User.updateOne({ _id: user._id }, { $set: { otp: hashedOtp, otpExpires: new Date(Date.now() + 10 * 60 * 1000) } });

//     if (process.env.NODE_ENV === 'development') {
//       console.log(`🔐 RESEND OTP for ${email}: ${otp}`);
//       return res.json({ message: 'OTP resent (check terminal)', userId: user._id });
//     }
//     await sendOTPEmail(email, otp, user.username);
//     res.json({ message: 'OTP resent', userId: user._id });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Login - atomic loginHistory + refresh token (hashed)
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

//     // Add login history atomically
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

    // Check existing verified user
    const existingVerified = await User.findOne({ $or: [{ email, isVerified: true }, { username, isVerified: true }] });
    if (existingVerified) {
      if (existingVerified.email === email) return res.status(400).json({ message: 'Email already registered' });
      if (existingVerified.username === username) return res.status(400).json({ message: 'Username taken' });
    }

    // Delete unverified records with same email/username
    await User.deleteMany({ $or: [{ email, isVerified: false }, { username, isVerified: false }] });

    const otp = generateOTP();
    const hashedOtp = hashValue(otp);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = new User({ username, email, password, otp: hashedOtp, otpExpires, isVerified: false });
    await user.save();

    // Send OTP email (will log OTP if fails)
    await sendOTPEmail(email, otp, username, 'verification');

    console.log(`🔐 REGISTRATION OTP for ${email}: ${otp}`); // always visible in server logs

    res.status(201).json({ message: 'OTP sent to email. Please verify.', userId: user._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// -------------------- VERIFY OTP --------------------
exports.verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findOne({ _id: userId, isVerified: false });
    if (!user) return res.status(404).json({ message: 'User not found or already verified' });
    if (!user.otp || hashValue(otp) !== user.otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (user.otpExpires < new Date()) return res.status(400).json({ message: 'OTP expired' });

    await User.updateOne({ _id: userId }, { $set: { isVerified: true }, $unset: { otp: "", otpExpires: "" } });
    const token = generateToken(user._id);
    res.json({ message: 'Account verified successfully', token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// -------------------- RESEND OTP --------------------
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email, isVerified: false });
    if (!user) return res.status(404).json({ message: 'User not found or already verified' });

    const otp = generateOTP();
    const hashedOtp = hashValue(otp);
    await User.updateOne({ _id: user._id }, { $set: { otp: hashedOtp, otpExpires: new Date(Date.now() + 10 * 60 * 1000) } });

    await sendOTPEmail(email, otp, user.username, 'verification');
    console.log(`🔐 RESEND OTP for ${email}: ${otp}`);

    res.json({ message: 'New OTP sent', userId: user._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// -------------------- LOGIN --------------------
exports.login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const user = await User.findOne({ email, isVerified: true }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const accessToken = generateToken(user._id);
    let refreshTokenRaw = null;

    if (rememberMe) {
      refreshTokenRaw = crypto.randomBytes(40).toString('hex');
      const hashedRefresh = hashValue(refreshTokenRaw);
      await User.updateOne({ _id: user._id }, { $set: { refreshToken: hashedRefresh, refreshTokenExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } });
    } else {
      await User.updateOne({ _id: user._id }, { $unset: { refreshToken: "", refreshTokenExpires: "" } });
    }

    // Add login history
    await User.updateOne(
      { _id: user._id },
      { $push: { loginHistory: { $each: [{ email, timestamp: new Date() }], $slice: -5 } } }
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
    const user = await User.findOne({ email, isVerified: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = generateOTP();
    const hashedOtp = hashValue(otp);
    await User.updateOne({ _id: user._id }, { $set: { otp: hashedOtp, otpExpires: new Date(Date.now() + 10 * 60 * 1000) } });

    await sendOTPEmail(email, otp, user.username, 'reset');
    console.log(`🔐 PASSWORD RESET OTP for ${email}: ${otp}`);

    res.json({ message: 'Password reset OTP sent to your email', userId: user._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// -------------------- RESET PASSWORD (Verify OTP + Set new password) --------------------
exports.resetPassword = async (req, res) => {
  try {
    const { userId, otp, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'Password too short' });

    const user = await User.findOne({ _id: userId, isVerified: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.otp || hashValue(otp) !== user.otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (user.otpExpires < new Date()) return res.status(400).json({ message: 'OTP expired' });

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful. Please login.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Refresh token - compare hashed
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken, email } = req.body;
    if (!refreshToken || !email) return res.status(400).json({ message: 'Missing data' });
    
    const user = await User.findOne({ email, refreshTokenExpires: { $gt: new Date() } });
    if (!user) return res.status(401).json({ message: 'Invalid or expired refresh token' });
    
    if (hashValue(refreshToken) !== user.refreshToken) return res.status(401).json({ message: 'Invalid token' });
    
    const newAccessToken = generateToken(user._id);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get login history
exports.getLoginHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('loginHistory');
    res.json(user.loginHistory);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Check email exists
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email }).select('loginHistory isVerified');
    if (!user) return res.json({ exists: false });
    const recentLogins = user.loginHistory ? user.loginHistory.slice(0, 5) : [];
    res.json({ exists: true, isVerified: user.isVerified, recentLogins });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Forgot password - uses separate OTP (but same field, we clear after use)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email, isVerified: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = generateOTP();
    const hashedOtp = hashValue(otp);
    await User.updateOne({ _id: user._id }, { $set: { otp: hashedOtp, otpExpires: new Date(Date.now() + 10 * 60 * 1000) } });

    await sendOTPEmail(email, otp, user.username);
    res.json({ message: 'OTP sent for password reset', userId: user._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { userId, otp, newPassword } = req.body;
    const user = await User.findOne({ _id: userId, otp: { $exists: true } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (hashValue(otp) !== user.otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (user.otpExpires < new Date()) return res.status(400).json({ message: 'OTP expired' });

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get admin
exports.getAdmin = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return res.status(500).json({ message: 'Admin email not configured' });
    const admin = await User.findOne({ email: adminEmail }).select('_id username email');
    if (!admin) return res.status(404).json({ message: 'Admin user not found' });
    res.json({ id: admin._id, username: admin.username, email: admin.email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};