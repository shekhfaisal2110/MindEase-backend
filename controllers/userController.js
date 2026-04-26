const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const GratitudeEntry = require('../models/GratitudeEntry');
const Affirmation = require('../models/Affirmation');
const TherapyExercise = require('../models/TherapyExercise');
const LetterToSelf = require('../models/LetterToSelf');
const { generateOTP, sendOTPEmail } = require('../utils/emailService');

// ========== PASSWORD CHANGE WITH OTP ==========
exports.requestPasswordChangeOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const otp = generateOTP();
    user.pendingOTP = otp;
    user.pendingOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await sendOTPEmail(user.email, otp, user.username);
    res.json({ message: 'OTP sent to your email address' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.verifyPasswordChangeOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user._id);
    if (!user.pendingOTP || user.pendingOTP !== otp || user.pendingOTPExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    user.otpVerifiedForPasswordChange = true;
    await user.save();
    res.json({ message: 'OTP verified. You can now set a new password.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.changePasswordWithOTP = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user.otpVerifiedForPasswordChange) {
      return res.status(403).json({ message: 'OTP not verified. Please request and verify OTP first.' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    user.password = newPassword;
    user.pendingOTP = undefined;
    user.pendingOTPExpires = undefined;
    user.otpVerifiedForPasswordChange = undefined;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========== USERNAME UPDATE ==========
exports.updateUsername = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters' });
    }
    const existing = await User.findOne({ username: username.trim(), _id: { $ne: req.user._id } });
    if (existing) {
      return res.status(400).json({ message: 'Username already taken' });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { username: username.trim() },
      { new: true }
    ).select('username email');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========== GRATITUDE CHALLENGE TARGET ==========
exports.getGratitudeTarget = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('gratitudeChallengeTarget');
    res.json({ target: user.gratitudeChallengeTarget });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateGratitudeTarget = async (req, res) => {
  try {
    const { target } = req.body;
    if (target < 1 || target > 365) {
      return res.status(400).json({ message: 'Target must be between 1 and 365' });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { gratitudeChallengeTarget: target },
      { new: true }
    ).select('gratitudeChallengeTarget');
    res.json({ target: user.gratitudeChallengeTarget });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========== USER PROGRESS (FOR PROFILE PAGE) ==========
exports.getProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('username email createdAt');

    // Total points all time
    const pointsAgg = await UserActivity.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: "$totalPoints" } } }
    ]);
    const totalPoints = pointsAgg.length ? pointsAgg[0].total : 0;

    // Last 30 days activities
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activities = await UserActivity.find({
      user: userId,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: 1 });

    // Streak calculation
    let streak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const act = activities.find(a => a.date.toDateString() === checkDate.toDateString());
      if (act && act.totalPoints > 0) streak++;
      else break;
    }

    // Metrics
    const [gratitudeCount, affirmationCount, therapyCount, lettersCount] = await Promise.all([
      GratitudeEntry.countDocuments({ user: userId }),
      Affirmation.countDocuments({ user: userId }),
      TherapyExercise.countDocuments({ user: userId }),
      LetterToSelf.countDocuments({ user: userId })
    ]);

    // Last 7 days points
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const act = activities.find(a => a.date.toDateString() === date.toDateString());
      last7Days.push({
        date: date.toLocaleDateString(undefined, { weekday: 'short' }),
        points: act ? act.totalPoints : 0
      });
    }

    res.json({
      user: {
        username: user.username,
        email: user.email,
        memberSince: user.createdAt
      },
      totalPoints,
      streak,
      metrics: {
        gratitudeEntries: gratitudeCount,
        affirmations: affirmationCount,
        therapyExercises: therapyCount,
        lettersToSelf: lettersCount
      },
      last7Days
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ========== ACTIVITY BREAKDOWN (PIE CHART) ==========
exports.getActivityBreakdown = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await UserActivity.aggregate([
      { $match: { user: userId } },
      { $group: {
          _id: null,
          pageView: { $sum: "$breakdown.pageView" },
          hourlyEmotion: { $sum: "$breakdown.hourlyEmotion" },
          emotionalCheckIn: { $sum: "$breakdown.emotionalCheckIn" },
          gratitude: { $sum: "$breakdown.gratitude" },
          affirmation: { $sum: "$breakdown.affirmation" },
          growthHealing: { $sum: "$breakdown.growthHealing" },
          letterToSelf: { $sum: "$breakdown.letterToSelf" },
          dailyTask: { $sum: "$breakdown.dailyTask" },
          reactResponse: { $sum: "$breakdown.reactResponse" },
          ikigaiItem: { $sum: "$breakdown.ikigaiItem" }
        }
      }
    ]);
    const breakdown = result.length ? result[0] : {};
    res.json(breakdown);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========== RECENT ACTIVITIES (LAST 10 DAYS) ==========
exports.getRecentActivities = async (req, res) => {
  try {
    const userId = req.user._id;
    const activities = await UserActivity.find({ user: userId })
      .sort({ date: -1 })
      .limit(10)
      .select('date totalPoints');
    const recent = activities.map(act => ({
      _id: act._id,
      date: act.date,
      type: 'Daily points',
      description: `Earned ${act.totalPoints} points`,
      points: act.totalPoints
    }));
    res.json(recent);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========== TOTAL ACTIVE DAYS (ALL TIME) ==========
exports.getActiveDays = async (req, res) => {
  try {
    const userId = req.user._id;
    const activities = await UserActivity.find({ user: userId }).select('date');
    const uniqueDates = new Set();
    activities.forEach(act => {
      uniqueDates.add(act.date.toISOString().split('T')[0]);
    });
    res.json({ activeDays: uniqueDates.size });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// // Get leaderboard (excludes hidden users)
// exports.getLeaderboard = async (req, res) => {
//   try {
//     const leaderboard = await UserActivity.aggregate([
//       { $group: { _id: "$user", totalPoints: { $sum: "$totalPoints" } } },
//       { $sort: { totalPoints: -1 } },
//       { $limit: 100 }
//     ]);
//     const userIds = leaderboard.map(item => item._id);
//     const users = await User.find({ _id: { $in: userIds } }).select('username hideFromLeaderboard');
//     const userMap = {};
//     users.forEach(u => { userMap[u._id] = u; });

//     const result = [];
//     let rank = 1;
//     for (const item of leaderboard) {
//       const user = userMap[item._id];
//       if (user && !user.hideFromLeaderboard) {
//         result.push({
//           rank: rank++,
//           userId: item._id,
//           username: user.username,
//           totalPoints: item.totalPoints
//         });
//       }
//     }
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get current user's visibility setting
// exports.getLeaderboardVisibility = async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id).select('hideFromLeaderboard');
//     res.json({ hideFromLeaderboard: user.hideFromLeaderboard });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Update visibility setting
// exports.updateLeaderboardVisibility = async (req, res) => {
//   try {
//     const { hide } = req.body;
//     const user = await User.findByIdAndUpdate(
//       req.user._id,
//       { hideFromLeaderboard: hide },
//       { new: true }
//     ).select('hideFromLeaderboard');
//     res.json({ hideFromLeaderboard: user.hideFromLeaderboard });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };






// Get leaderboard – excludes users with hideFromLeaderboard = true
exports.getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await UserActivity.aggregate([
      { $group: { _id: "$user", totalPoints: { $sum: "$totalPoints" } } },
      { $sort: { totalPoints: -1 } },
      { $limit: 100 }
    ]);
    const userIds = leaderboard.map(item => item._id);
    const users = await User.find({ _id: { $in: userIds } }).select('username hideFromLeaderboard');
    const userMap = {};
    users.forEach(u => { userMap[u._id] = u; });

    const result = [];
    let rank = 1;
    for (const item of leaderboard) {
      const user = userMap[item._id];
      if (user && !user.hideFromLeaderboard) {   // ✅ only visible users
        result.push({
          rank: rank++,
          userId: item._id,
          username: user.username,
          totalPoints: item.totalPoints
        });
      }
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get current user's visibility setting
exports.getLeaderboardVisibility = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('hideFromLeaderboard');
    res.json({ hideFromLeaderboard: user.hideFromLeaderboard });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update visibility setting
exports.updateLeaderboardVisibility = async (req, res) => {
  try {
    const { hide } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { hideFromLeaderboard: hide },
      { new: true }
    ).select('hideFromLeaderboard');
    res.json({ hideFromLeaderboard: user.hideFromLeaderboard });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin only – get all users
exports.getAllUsers = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const users = await User.find().select('username email createdAt').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};