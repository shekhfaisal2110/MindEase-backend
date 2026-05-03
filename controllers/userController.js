// const User = require('../models/User');
// const UserActivity = require('../models/UserActivity');
// const GratitudeEntry = require('../models/GratitudeEntry');
// const Affirmation = require('../models/Affirmation');
// const TherapyExercise = require('../models/TherapyExercise');
// const LetterToSelf = require('../models/LetterToSelf');
// const { generateOTP, sendOTPEmail } = require('../utils/emailService');

// // ========== PASSWORD CHANGE WITH OTP ==========
// exports.requestPasswordChangeOTP = async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id);
//     const otp = generateOTP();
//     user.pendingOTP = otp;
//     user.pendingOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
//     await user.save();
//     await sendOTPEmail(user.email, otp, user.username);
//     res.json({ message: 'OTP sent to your email address' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.verifyPasswordChangeOTP = async (req, res) => {
//   try {
//     const { otp } = req.body;
//     const user = await User.findById(req.user._id);
//     if (!user.pendingOTP || user.pendingOTP !== otp || user.pendingOTPExpires < new Date()) {
//       return res.status(400).json({ message: 'Invalid or expired OTP' });
//     }
//     user.otpVerifiedForPasswordChange = true;
//     await user.save();
//     res.json({ message: 'OTP verified. You can now set a new password.' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.changePasswordWithOTP = async (req, res) => {
//   try {
//     const { newPassword } = req.body;
//     const user = await User.findById(req.user._id);
//     if (!user.otpVerifiedForPasswordChange) {
//       return res.status(403).json({ message: 'OTP not verified. Please request and verify OTP first.' });
//     }
//     if (!newPassword || newPassword.length < 6) {
//       return res.status(400).json({ message: 'Password must be at least 6 characters' });
//     }
//     user.password = newPassword;
//     user.pendingOTP = undefined;
//     user.pendingOTPExpires = undefined;
//     user.otpVerifiedForPasswordChange = undefined;
//     await user.save();
//     res.json({ message: 'Password changed successfully' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // ========== USERNAME UPDATE ==========
// exports.updateUsername = async (req, res) => {
//   try {
//     const { username } = req.body;
//     if (!username || username.trim().length < 3) {
//       return res.status(400).json({ message: 'Username must be at least 3 characters' });
//     }
//     const existing = await User.findOne({ username: username.trim(), _id: { $ne: req.user._id } });
//     if (existing) {
//       return res.status(400).json({ message: 'Username already taken' });
//     }
//     const user = await User.findByIdAndUpdate(
//       req.user._id,
//       { username: username.trim() },
//       { new: true }
//     ).select('username email');
//     res.json({ user });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // ========== GRATITUDE CHALLENGE TARGET ==========
// exports.getGratitudeTarget = async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id).select('gratitudeChallengeTarget');
//     res.json({ target: user.gratitudeChallengeTarget });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.updateGratitudeTarget = async (req, res) => {
//   try {
//     const { target } = req.body;
//     if (target < 1 || target > 365) {
//       return res.status(400).json({ message: 'Target must be between 1 and 365' });
//     }
//     const user = await User.findByIdAndUpdate(
//       req.user._id,
//       { gratitudeChallengeTarget: target },
//       { new: true }
//     ).select('gratitudeChallengeTarget');
//     res.json({ target: user.gratitudeChallengeTarget });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // ========== USER PROGRESS (FOR PROFILE PAGE) ==========
// exports.getProgress = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const user = await User.findById(userId).select('username email createdAt');

//     // Total points all time
//     const pointsAgg = await UserActivity.aggregate([
//       { $match: { user: userId } },
//       { $group: { _id: null, total: { $sum: "$totalPoints" } } }
//     ]);
//     const totalPoints = pointsAgg.length ? pointsAgg[0].total : 0;

//     // Last 30 days activities
//     const thirtyDaysAgo = new Date();
//     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
//     const activities = await UserActivity.find({
//       user: userId,
//       date: { $gte: thirtyDaysAgo }
//     }).sort({ date: 1 });

//     // Streak calculation
//     let streak = 0;
//     const today = new Date();
//     today.setHours(0,0,0,0);
//     for (let i = 0; i < 30; i++) {
//       const checkDate = new Date(today);
//       checkDate.setDate(today.getDate() - i);
//       const act = activities.find(a => a.date.toDateString() === checkDate.toDateString());
//       if (act && act.totalPoints > 0) streak++;
//       else break;
//     }

//     // Metrics
//     const [gratitudeCount, affirmationCount, therapyCount, lettersCount] = await Promise.all([
//       GratitudeEntry.countDocuments({ user: userId }),
//       Affirmation.countDocuments({ user: userId }),
//       TherapyExercise.countDocuments({ user: userId }),
//       LetterToSelf.countDocuments({ user: userId })
//     ]);

//     // Last 7 days points
//     const last7Days = [];
//     for (let i = 6; i >= 0; i--) {
//       const date = new Date(today);
//       date.setDate(today.getDate() - i);
//       const act = activities.find(a => a.date.toDateString() === date.toDateString());
//       last7Days.push({
//         date: date.toLocaleDateString(undefined, { weekday: 'short' }),
//         points: act ? act.totalPoints : 0
//       });
//     }

//     res.json({
//       user: {
//         username: user.username,
//         email: user.email,
//         memberSince: user.createdAt
//       },
//       totalPoints,
//       streak,
//       metrics: {
//         gratitudeEntries: gratitudeCount,
//         affirmations: affirmationCount,
//         therapyExercises: therapyCount,
//         lettersToSelf: lettersCount
//       },
//       last7Days
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // ========== ACTIVITY BREAKDOWN (PIE CHART) ==========
// exports.getActivityBreakdown = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const result = await UserActivity.aggregate([
//       { $match: { user: userId } },
//       { $group: {
//           _id: null,
//           pageView: { $sum: "$breakdown.pageView" },
//           hourlyEmotion: { $sum: "$breakdown.hourlyEmotion" },
//           emotionalCheckIn: { $sum: "$breakdown.emotionalCheckIn" },
//           gratitude: { $sum: "$breakdown.gratitude" },
//           affirmation: { $sum: "$breakdown.affirmation" },
//           growthHealing: { $sum: "$breakdown.growthHealing" },
//           letterToSelf: { $sum: "$breakdown.letterToSelf" },
//           dailyTask: { $sum: "$breakdown.dailyTask" },
//           reactResponse: { $sum: "$breakdown.reactResponse" },
//           ikigaiItem: { $sum: "$breakdown.ikigaiItem" }
//         }
//       }
//     ]);
//     const breakdown = result.length ? result[0] : {};
//     res.json(breakdown);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // ========== RECENT ACTIVITIES (LAST 10 DAYS) ==========
// exports.getRecentActivities = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const activities = await UserActivity.find({ user: userId })
//       .sort({ date: -1 })
//       .limit(10)
//       .select('date totalPoints');
//     const recent = activities.map(act => ({
//       _id: act._id,
//       date: act.date,
//       type: 'Daily points',
//       description: `Earned ${act.totalPoints} points`,
//       points: act.totalPoints
//     }));
//     res.json(recent);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // ========== TOTAL ACTIVE DAYS (ALL TIME) ==========
// exports.getActiveDays = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const activities = await UserActivity.find({ user: userId }).select('date');
//     const uniqueDates = new Set();
//     activities.forEach(act => {
//       uniqueDates.add(act.date.toISOString().split('T')[0]);
//     });
//     res.json({ activeDays: uniqueDates.size });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // // Get leaderboard (excludes hidden users)
// // exports.getLeaderboard = async (req, res) => {
// //   try {
// //     const leaderboard = await UserActivity.aggregate([
// //       { $group: { _id: "$user", totalPoints: { $sum: "$totalPoints" } } },
// //       { $sort: { totalPoints: -1 } },
// //       { $limit: 100 }
// //     ]);
// //     const userIds = leaderboard.map(item => item._id);
// //     const users = await User.find({ _id: { $in: userIds } }).select('username hideFromLeaderboard');
// //     const userMap = {};
// //     users.forEach(u => { userMap[u._id] = u; });

// //     const result = [];
// //     let rank = 1;
// //     for (const item of leaderboard) {
// //       const user = userMap[item._id];
// //       if (user && !user.hideFromLeaderboard) {
// //         result.push({
// //           rank: rank++,
// //           userId: item._id,
// //           username: user.username,
// //           totalPoints: item.totalPoints
// //         });
// //       }
// //     }
// //     res.json(result);
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // };

// // // Get current user's visibility setting
// // exports.getLeaderboardVisibility = async (req, res) => {
// //   try {
// //     const user = await User.findById(req.user._id).select('hideFromLeaderboard');
// //     res.json({ hideFromLeaderboard: user.hideFromLeaderboard });
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // };

// // // Update visibility setting
// // exports.updateLeaderboardVisibility = async (req, res) => {
// //   try {
// //     const { hide } = req.body;
// //     const user = await User.findByIdAndUpdate(
// //       req.user._id,
// //       { hideFromLeaderboard: hide },
// //       { new: true }
// //     ).select('hideFromLeaderboard');
// //     res.json({ hideFromLeaderboard: user.hideFromLeaderboard });
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // };






// // Get leaderboard – excludes users with hideFromLeaderboard = true
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
//       if (user && !user.hideFromLeaderboard) {   // ✅ only visible users
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

// // Admin only – get all users
// exports.getAllUsers = async (req, res) => {
//   try {
//     const adminEmail = process.env.ADMIN_EMAIL;
//     if (req.user.email !== adminEmail) {
//       return res.status(403).json({ message: 'Admin access required' });
//     }
//     const users = await User.find().select('username email createdAt').sort({ createdAt: -1 });
//     res.json(users);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };





const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const GratitudeEntry = require('../models/GratitudeEntry');
const Affirmation = require('../models/Affirmation');
const TherapyExercise = require('../models/TherapyExercise');
const LetterToSelf = require('../models/LetterToSelf');
const { generateOTP, sendOTPEmail } = require('../utils/emailService');
const crypto = require('crypto');

// Helper: hash OTP before saving (optional but recommended)
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');
const verifyOtp = (plain, hashed) => hashOtp(plain) === hashed;

// Helper: get today's date string (YYYY-MM-DD)
const getTodayStr = () => new Date().toISOString().split('T')[0];

// ========== PASSWORD CHANGE WITH OTP (using unified OTP fields) ==========
exports.requestPasswordChangeOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const otp = generateOTP();
    user.otp = hashOtp(otp);
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.otpPurpose = 'passwordReset';
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
    if (!user.otp || !verifyOtp(otp, user.otp) || user.otpExpires < new Date() || user.otpPurpose !== 'passwordReset') {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    user.otpVerifiedForPasswordChange = true; // keep this flag
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
      return res.status(403).json({ message: 'OTP not verified.' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpPurpose = undefined;
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

// ========== USER PROGRESS (OPTIMIZED) ==========
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

    // Last 30 days activities (get only dates with points > 0)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // include today
    const startStr = thirtyDaysAgo.toISOString().split('T')[0];
    const endStr = getTodayStr();

    const activities = await UserActivity.find({
      user: userId,
      date: { $gte: startStr, $lte: endStr },
      totalPoints: { $gt: 0 }
    }).select('date totalPoints').lean();

    // Build map: dateStr -> totalPoints
    const pointsMap = new Map();
    activities.forEach(act => { pointsMap.set(act.date, act.totalPoints); });

    // Streak calculation using dates comparison (string works)
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      if (pointsMap.has(dateStr)) {
        streak++;
      } else {
        break;
      }
    }

    // Metrics (counts)
    const [gratitudeCount, affirmationCount, therapyCount, lettersCount] = await Promise.all([
      GratitudeEntry.countDocuments({ user: userId }),
      Affirmation.countDocuments({ user: userId }),
      TherapyExercise.countDocuments({ user: userId }),
      LetterToSelf.countDocuments({ user: userId })
    ]);

    // Last 7 days points (ordered oldest to newest)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const points = pointsMap.get(dateStr) || 0;
      last7Days.push({
        date: date.toLocaleDateString(undefined, { weekday: 'short' }),
        points
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

// ========== ACTIVITY BREAKDOWN (AGGREGATION) ==========
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
      .select('date totalPoints')
      .lean();
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

// ========== TOTAL ACTIVE DAYS (DISTINCT COUNT) ==========
exports.getActiveDays = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await UserActivity.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$date" } },
      { $count: "activeDays" }
    ]);
    const activeDays = result.length ? result[0].activeDays : 0;
    res.json({ activeDays });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========== LEADERBOARD (SINGLE AGGREGATION WITH LOOKUP) ==========
exports.getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await UserActivity.aggregate([
      { $group: { _id: "$user", totalPoints: { $sum: "$totalPoints" } } },
      { $sort: { totalPoints: -1 } },
      { $limit: 100 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "userInfo" } },
      { $unwind: "$userInfo" },
      { $match: { "userInfo.hideFromLeaderboard": false } },
      { $project: {
          userId: "$_id",
          username: "$userInfo.username",
          totalPoints: 1,
          rank: { $literal: 0 } // will compute later
        }
      }
    ]);

    // Add rank
    let rank = 1;
    const result = leaderboard.map(entry => ({ ...entry, rank: rank++ }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get user's leaderboard visibility
exports.getLeaderboardVisibility = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('hideFromLeaderboard');
    res.json({ hideFromLeaderboard: user.hideFromLeaderboard });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update visibility
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

// Admin: get all users (with pagination)
exports.getAllUsers = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().select('username email createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments()
    ]);
    res.json({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBadgeHistory = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ message: 'Year and month required' });
    }
    const targetDate = new Date(year, month, 0); // last day of month
    targetDate.setHours(23, 59, 59, 999);
    const userId = req.user._id;

    // Helper to count documents created on or before targetDate
    const countDocs = async (model) => {
      return await model.countDocuments({ user: userId, createdAt: { $lte: targetDate } });
    };

    const [gratitudeCount, affirmationsCount, therapyCount, lettersCount,
      emotionalCount, hourlyCount, reactCount] = await Promise.all([
      GratitudeEntry.countDocuments({ user: userId, createdAt: { $lte: targetDate } }),
      Affirmation.countDocuments({ user: userId, createdAt: { $lte: targetDate } }),
      TherapyExercise.countDocuments({ user: userId, createdAt: { $lte: targetDate } }),
      LetterToSelf.countDocuments({ user: userId, createdAt: { $lte: targetDate } }),
      EmotionalActivity.countDocuments({ user: userId, createdAt: { $lte: targetDate } }),
      HourlyEmotion.countDocuments({ user: userId, createdAt: { $lte: targetDate } }),
      ReactResponse.countDocuments({ user: userId, createdAt: { $lte: targetDate } }),
    ]);

    // Ikigai items count
    const ikigaiDoc = await Ikigai.findOne({ user: userId });
    const ikigaiItems = ikigaiDoc
      ? (ikigaiDoc.love.length + ikigaiDoc.skill.length + ikigaiDoc.worldNeed.length + ikigaiDoc.earn.length)
      : 0;

    // UserActivity for points, daily tasks, active days, streak
    const activities = await UserActivity.find({ user: userId, date: { $lte: targetDate } }).lean();
    const totalDailyTaskPoints = activities.reduce((sum, a) => sum + (a.breakdown?.dailyTask || 0), 0);
    const dailyTaskCompletions = Math.floor(totalDailyTaskPoints / 3);
    const totalPoints = activities.reduce((sum, a) => sum + a.totalPoints, 0);

    // Active days – safely convert date to string
    const activeDaysSet = new Set();
    activities.forEach(a => {
      let dateStr;
      if (a.date instanceof Date) dateStr = a.date.toISOString().split('T')[0];
      else dateStr = new Date(a.date).toISOString().split('T')[0];
      activeDaysSet.add(dateStr);
    });
    const activeDays = activeDaysSet.size;

    // Streak calculation
    let streak = 0;
    const sortedDates = Array.from(activeDaysSet).sort();
    let currentStreak = 0;
    let prevDate = null;
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const dateStr = sortedDates[i];
      const date = new Date(dateStr);
      if (!prevDate) {
        currentStreak = 1;
        prevDate = date;
        continue;
      }
      const diff = (prevDate - date) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        currentStreak++;
        prevDate = date;
      } else break;
    }
    streak = currentStreak;

    const totalActivities = gratitudeCount + affirmationsCount + therapyCount + lettersCount +
      emotionalCount + hourlyCount + reactCount + dailyTaskCompletions + ikigaiItems;

    res.json({
      asOf: targetDate.toISOString().split('T')[0],
      streak,
      totalPoints,
      totalActivities,
      activeDays,
      gratitude: gratitudeCount,
      affirmations: affirmationsCount,
      therapy: therapyCount,
      letters: lettersCount,
      emotionalCheckIns: emotionalCount,
      hourlyEmotions: hourlyCount,
      dailyTaskCompletions,
      reactResponseEntries: reactCount,
      ikigaiItems,
    });
  } catch (err) {
    console.error('Error in getBadgeHistory:', err);
    res.status(500).json({ message: err.message });
  }
};

// Check if new month started (first visit after month change)
exports.checkMonthStart = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const user = await User.findById(userId).select('lastMonthStartNotified');
    const lastNotified = user.lastMonthStartNotified;
    const isNewMonth = (!lastNotified || lastNotified !== currentMonth);
    res.json({ isNewMonth, currentMonth });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Check if user should see monthly report notification (once per month)
exports.checkMonthlyReport = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const user = await User.findById(userId).select('lastReportNotifiedMonth');
    const lastNotified = user.lastReportNotifiedMonth;
    const shouldShow = !lastNotified || lastNotified !== currentMonth;
    res.json({ shouldShow, currentMonth });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mark monthly report as seen (so it won't show again this month)
exports.acknowledgeMonthlyReport = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentMonth = new Date().toISOString().slice(0, 7);
    await User.findByIdAndUpdate(userId, { lastReportNotifiedMonth: currentMonth });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Check if a new month has started (for the "New Month Begins" banner)
exports.checkMonthStart = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const user = await User.findById(userId).select('lastMonthStartNotified');
    const lastNotified = user.lastMonthStartNotified;
    const isNewMonth = (!lastNotified || lastNotified !== currentMonth);
    res.json({ isNewMonth, currentMonth });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Acknowledge month-start banner
exports.acknowledgeMonthStart = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentMonth = new Date().toISOString().slice(0, 7);
    await User.findByIdAndUpdate(userId, { lastMonthStartNotified: currentMonth });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};