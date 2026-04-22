const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { generateOTP, sendOTPEmail } = require('../utils/emailService');

const generateToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
const generateRefreshToken = () => crypto.randomBytes(40).toString('hex');


exports.register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Check if email exists (any status)
    let existingUserByEmail = await User.findOne({ email });
    
    if (existingUserByEmail) {
      if (existingUserByEmail.isVerified) {
        return res.status(400).json({ message: 'Email already registered and verified' });
      } else {
        // Email exists but not verified – update user data and resend OTP
        existingUserByEmail.username = username;
        existingUserByEmail.password = password;
        const otp = generateOTP();
        existingUserByEmail.otp = otp;
        existingUserByEmail.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await existingUserByEmail.save();
        
        if (process.env.NODE_ENV === 'production') {
          await sendOTPEmail(email, otp, username);
        } else {
          console.log(`🔐 DEVELOPMENT MODE: OTP for ${email} is: ${otp}`);
        }
        
        return res.status(200).json({
          message: 'Account not verified. New OTP sent to your email.',
          userId: existingUserByEmail._id
        });
      }
    }
    
    // Check username uniqueness ONLY among verified users
    const usernameTaken = await User.findOne({ username, isVerified: true });
    if (usernameTaken) {
      return res.status(400).json({ message: 'Username already taken by a verified account' });
    }
    
    // Also check if username is taken by an unverified user – if so, delete that old unverified record and create new one
    const unverifiedWithSameUsername = await User.findOne({ username, isVerified: false });
    if (unverifiedWithSameUsername) {
      // Delete the old unverified record (since it's incomplete)
      await User.deleteOne({ _id: unverifiedWithSameUsername._id });
    }
    
    // Create new user
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    const user = new User({ username, email, password, otp, otpExpires, isVerified: false });
    await user.save();
    
    if (process.env.NODE_ENV === 'production') {
      await sendOTPEmail(email, otp, username);
    } else {
      console.log(`🔐 DEVELOPMENT MODE: OTP for ${email} is: ${otp}`);
    }
    
    res.status(201).json({
      message: 'OTP sent to your email. Please verify to complete registration.',
      userId: user._id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Already verified' });
    if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (user.otpExpires < new Date()) return res.status(400).json({ message: 'OTP expired' });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken(user._id);
    res.json({ message: 'Verified', token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    if (process.env.NODE_ENV === 'development') {
      console.log(`\n🔐 DEVELOPMENT MODE (Resend): OTP for ${email} is: ${otp}\n`);
      return res.json({ message: 'OTP resent (check terminal)', userId: user._id });
    }

    await sendOTPEmail(email, otp, user.username);
    res.json({ message: 'OTP resent successfully', userId: user._id });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.isVerified) return res.status(401).json({ message: 'Please verify email first' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    // Add login history
    user.loginHistory.unshift({ email: user.email, timestamp: new Date() });
    user.loginHistory = user.loginHistory.slice(0, 5);

    if (rememberMe) {
      user.refreshToken = generateRefreshToken();
      user.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else {
      user.refreshToken = null;
      user.refreshTokenExpires = null;
    }
    await user.save();

    const accessToken = generateToken(user._id);
    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken: user.refreshToken,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken, email } = req.body;
    if (!refreshToken || !email) {
      return res.status(400).json({ message: 'Missing refresh token or email' });
    }
    const user = await User.findOne({ email, refreshToken });
    if (!user || user.refreshTokenExpires < new Date()) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
    const newAccessToken = generateToken(user._id);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLoginHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('loginHistory');
    res.json(user.loginHistory);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email }).select('loginHistory isVerified');
    if (!user) {
      return res.json({ exists: false });
    }
    // Return last 5 logins (most recent first)
    const recentLogins = user.loginHistory.slice(0, 5);
    res.json({
      exists: true,
      isVerified: user.isVerified,
      recentLogins
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOTPEmail(email, otp, user.username);
    res.json({ message: 'OTP sent for password reset', userId: user._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { userId, otp, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
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


// Get admin user info (by email from .env)
exports.getAdmin = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      return res.status(500).json({ message: 'Admin email not configured' });
    }
    const admin = await User.findOne({ email: adminEmail }).select('_id username email');
    if (!admin) {
      return res.status(404).json({ message: 'Admin user not found' });
    }
    res.json({ id: admin._id, username: admin.username, email: admin.email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};