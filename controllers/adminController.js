// const User = require('../models/User');
// const UserActivity = require('../models/UserActivity');
// const DeviceUsage = require('../models/DeviceUsage');
// const UserDailyActivity = require('../models/UserDailyActivity');
// const GratitudeEntry = require('../models/GratitudeEntry');
// const Affirmation = require('../models/Affirmation');
// const EmotionalActivity = require('../models/EmotionalActivity');
// const TherapyExercise = require('../models/TherapyExercise');
// const LetterToSelf = require('../models/LetterToSelf');
// const DailyRoutine = require('../models/DailyRoutine');
// const DailyEmotionalTracking = require('../models/DailyEmotionalTracking');
// const HourlyEmotion = require('../models/HourlyEmotion');
// const ReactResponse = require('../models/ReactResponse');
// const Ikigai = require('../models/Ikigai');

// const isAdmin = (req) => req.user.email === process.env.ADMIN_EMAIL;

// // 1. Daily Active Users (last 30 days)
// exports.getDailyActiveUsers = async (req, res) => {
//   if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
//   try {
//     const start = new Date();
//     start.setDate(start.getDate() - 30);
//     start.setHours(0,0,0,0);
//     const activities = await UserActivity.aggregate([
//       { $match: { date: { $gte: start } } },
//       { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, user: "$user" } } },
//       { $group: { _id: "$_id.date", count: { $sum: 1 } } },
//       { $sort: { _id: 1 } }
//     ]);
//     res.json(activities.map(a => ({ date: a._id, count: a.count })));
//   } catch (err) { res.status(500).json({ message: err.message }); }
// };

// // 2. User registrations over time (last 30 days)
// exports.getUserRegistrations = async (req, res) => {
//   if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
//   try {
//     const start = new Date();
//     start.setDate(start.getDate() - 30);
//     start.setHours(0,0,0,0);
//     const registrations = await User.aggregate([
//       { $match: { createdAt: { $gte: start } } },
//       { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
//       { $sort: { _id: 1 } }
//     ]);
//     res.json(registrations.map(r => ({ date: r._id, count: r.count })));
//   } catch (err) { res.status(500).json({ message: err.message }); }
// };

// // 3. Most used features (total entries per module)
// exports.getFeatureUsage = async (req, res) => {
//   if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
//   try {
//     const [gratitude, affirmations, emotional, therapy, letters, dailyRoutine, dailyTracker, hourly, react, ikigai] = await Promise.all([
//       GratitudeEntry.countDocuments(),
//       Affirmation.countDocuments(),
//       EmotionalActivity.countDocuments(),
//       TherapyExercise.countDocuments(),
//       LetterToSelf.countDocuments(),
//       DailyRoutine.countDocuments(),
//       DailyEmotionalTracking.countDocuments(),
//       HourlyEmotion.countDocuments(),
//       ReactResponse.countDocuments(),
//       Ikigai.countDocuments()
//     ]);
//     res.json({ gratitude, affirmations, emotional, therapy, letters, dailyRoutine, dailyTracker, hourly, react, ikigai });
//   } catch (err) { res.status(500).json({ message: err.message }); }
// };

// // 4. Total points breakdown (all users)
// exports.getPointsBreakdown = async (req, res) => {
//   if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
//   try {
//     const result = await UserActivity.aggregate([
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
//     res.json(result[0] || {});
//   } catch (err) { res.status(500).json({ message: err.message }); }
// };

// // 5. Engagement radar (average per user)
// exports.getEngagementRadar = async (req, res) => {
//   if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
//   try {
//     const totalUsers = await User.countDocuments();
//     if (totalUsers === 0) return res.json([]);
//     const [gratitudeCount, affirmationsCount, emotionalCount, therapyCount, lettersCount, dailyTrackerCount, hourlyCount, reactCount] = await Promise.all([
//       GratitudeEntry.countDocuments(),
//       Affirmation.countDocuments(),
//       EmotionalActivity.countDocuments(),
//       TherapyExercise.countDocuments(),
//       LetterToSelf.countDocuments(),
//       DailyEmotionalTracking.countDocuments(),
//       HourlyEmotion.countDocuments(),
//       ReactResponse.countDocuments()
//     ]);
//     const radar = [
//       { subject: 'Gratitude', value: (gratitudeCount / totalUsers).toFixed(1) },
//       { subject: 'Affirmations', value: (affirmationsCount / totalUsers).toFixed(1) },
//       { subject: 'Emotional', value: (emotionalCount / totalUsers).toFixed(1) },
//       { subject: 'Therapy', value: (therapyCount / totalUsers).toFixed(1) },
//       { subject: 'Letters', value: (lettersCount / totalUsers).toFixed(1) },
//       { subject: 'Daily Tracker', value: (dailyTrackerCount / totalUsers).toFixed(1) },
//       { subject: 'Hourly Emotions', value: (hourlyCount / totalUsers).toFixed(1) },
//       { subject: 'React/Response', value: (reactCount / totalUsers).toFixed(1) },
//     ];
//     res.json(radar);
//   } catch (err) { res.status(500).json({ message: err.message }); }
// };

// // 6. Total users over time (cumulative – last 30 days)
// exports.getTotalUsersOverTime = async (req, res) => {
//   if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
//   try {
//     const start = new Date();
//     start.setDate(start.getDate() - 30);
//     start.setHours(0,0,0,0);
//     const registrations = await User.aggregate([
//       { $match: { createdAt: { $gte: start } } },
//       { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
//       { $sort: { _id: 1 } }
//     ]);
//     let cumulative = 0;
//     const cumulativeData = [];
//     for (let i = 0; i < 30; i++) {
//       const date = new Date(start);
//       date.setDate(start.getDate() + i);
//       const dateStr = date.toISOString().split('T')[0];
//       const reg = registrations.find(r => r._id === dateStr);
//       cumulative += reg ? reg.count : 0;
//       cumulativeData.push({ date: dateStr, totalUsers: cumulative });
//     }
//     res.json(cumulativeData);
//   } catch (err) { res.status(500).json({ message: err.message }); }
// };

// // 7. Total time spent on website (sum of device usage minutes)
// exports.getTotalTimeSpent = async (req, res) => {
//   if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
//   try {
//     const result = await DeviceUsage.aggregate([
//       { $group: { _id: null, totalMinutes: { $sum: "$totalMinutes" } } }
//     ]);
//     const totalMinutes = result.length ? result[0].totalMinutes : 0;
//     res.json({ totalMinutes });
//   } catch (err) { res.status(500).json({ message: err.message }); }
// };

// // 8. Total page views (sum of breakdown.pageView)
// exports.getTotalPageViews = async (req, res) => {
//   if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
//   try {
//     const result = await UserActivity.aggregate([
//       { $group: { _id: null, totalPageViews: { $sum: "$breakdown.pageView" } } }
//     ]);
//     const totalPageViews = result.length ? result[0].totalPageViews : 0;
//     res.json({ totalPageViews });
//   } catch (err) { res.status(500).json({ message: err.message }); }
// };

// // 9. Daily page views (last 30 days) – for chart
// exports.getPageViewCounts = async (req, res) => {
//   if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
//   try {
//     const start = new Date();
//     start.setDate(start.getDate() - 30);
//     start.setHours(0,0,0,0);
//     const pageViews = await UserActivity.aggregate([
//       { $match: { date: { $gte: start } } },
//       { $group: {
//           _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
//           count: { $sum: "$breakdown.pageView" }
//         }
//       },
//       { $sort: { _id: 1 } }
//     ]);
//     res.json(pageViews.map(pv => ({ date: pv._id, count: pv.count })));
//   } catch (err) { res.status(500).json({ message: err.message }); }
// };






const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const DeviceUsage = require('../models/DeviceUsage');
const GratitudeEntry = require('../models/GratitudeEntry');
const Affirmation = require('../models/Affirmation');
const EmotionalActivity = require('../models/EmotionalActivity');
const TherapyExercise = require('../models/TherapyExercise');
const LetterToSelf = require('../models/LetterToSelf');
const DailyRoutine = require('../models/DailyRoutine');
const DailyEmotionalTracking = require('../models/DailyEmotionalTracking');
const HourlyEmotion = require('../models/HourlyEmotion');
const ReactResponse = require('../models/ReactResponse');
const Ikigai = require('../models/Ikigai');

const isAdmin = (req) => req.user?.email === process.env.ADMIN_EMAIL;

// Helper to get date range (start to end of day)
const getDateRange = (daysAgo = 30) => {
  const start = new Date();
  start.setDate(start.getDate() - daysAgo);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// 1. Daily Active Users (last 30 days) - Optimized
exports.getDailyActiveUsers = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const { start, end } = getDateRange(30);
    // Use UserDailyActivity if available (faster). Otherwise use UserActivity.
    // Assuming UserActivity model has `date` field as Date type with index.
    const activities = await UserActivity.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, user: "$user" } } },
      { $group: { _id: "$_id.date", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json(activities.map(a => ({ date: a._id, count: a.count })));
  } catch (err) { 
    console.error(err);
    res.status(500).json({ message: err.message }); 
  }
};

// 2. User registrations over time - Optimized (using aggregation without manual loop)
exports.getUserRegistrations = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const { start, end } = getDateRange(30);
    const registrations = await User.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json(registrations.map(r => ({ date: r._id, count: r.count })));
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
};

// 3. Most used features - Optimized (use estimatedDocumentCount for large collections, but keep parallel)
exports.getFeatureUsage = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
  try {
    // Using estimatedDocumentCount is faster for total counts (no filter)
    const [gratitude, affirmations, emotional, therapy, letters, dailyRoutine, dailyTracker, hourly, react, ikigai] = await Promise.all([
      GratitudeEntry.estimatedDocumentCount(),
      Affirmation.estimatedDocumentCount(),
      EmotionalActivity.estimatedDocumentCount(),
      TherapyExercise.estimatedDocumentCount(),
      LetterToSelf.estimatedDocumentCount(),
      DailyRoutine.estimatedDocumentCount(),
      DailyEmotionalTracking.estimatedDocumentCount(),
      HourlyEmotion.estimatedDocumentCount(),
      ReactResponse.estimatedDocumentCount(),
      Ikigai.estimatedDocumentCount()
    ]);
    res.json({ gratitude, affirmations, emotional, therapy, letters, dailyRoutine, dailyTracker, hourly, react, ikigai });
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
};

// 4. Total points breakdown - Already good, but add lean()? aggregate returns plain objects.
exports.getPointsBreakdown = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const result = await UserActivity.aggregate([
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
    res.json(result[0] || {});
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
};

// 5. Engagement radar - Optimized (use distinct counts for % of users who engaged)
exports.getEngagementRadar = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const totalUsers = await User.estimatedDocumentCount();
    if (totalUsers === 0) return res.json([]);
    
    // Get distinct user counts for each feature (more meaningful than average entries)
    const [gratitudeUsers, affirmationsUsers, emotionalUsers, therapyUsers, lettersUsers, dailyTrackerUsers, hourlyUsers, reactUsers] = await Promise.all([
      GratitudeEntry.distinct('user').then(d => d.length),
      Affirmation.distinct('user').then(d => d.length),
      EmotionalActivity.distinct('user').then(d => d.length),
      TherapyExercise.distinct('user').then(d => d.length),
      LetterToSelf.distinct('user').then(d => d.length),
      DailyEmotionalTracking.distinct('user').then(d => d.length),
      HourlyEmotion.distinct('user').then(d => d.length),
      ReactResponse.distinct('user').then(d => d.length)
    ]);
    
    const radar = [
      { subject: 'Gratitude', value: +((gratitudeUsers / totalUsers) * 100).toFixed(1) },
      { subject: 'Affirmations', value: +((affirmationsUsers / totalUsers) * 100).toFixed(1) },
      { subject: 'Emotional', value: +((emotionalUsers / totalUsers) * 100).toFixed(1) },
      { subject: 'Therapy', value: +((therapyUsers / totalUsers) * 100).toFixed(1) },
      { subject: 'Letters', value: +((lettersUsers / totalUsers) * 100).toFixed(1) },
      { subject: 'Daily Tracker', value: +((dailyTrackerUsers / totalUsers) * 100).toFixed(1) },
      { subject: 'Hourly Emotions', value: +((hourlyUsers / totalUsers) * 100).toFixed(1) },
      { subject: 'React/Response', value: +((reactUsers / totalUsers) * 100).toFixed(1) },
    ];
    res.json(radar);
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
};

// 6. Total users over time - Optimized to use aggregation with cumulative sum
exports.getTotalUsersOverTime = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const { start, end } = getDateRange(30);
    // Get daily registration counts
    const registrations = await User.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    // Calculate cumulative
    let cumulative = 0;
    const cumulativeData = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const reg = registrations.find(r => r._id === dateStr);
      cumulative += reg ? reg.count : 0;
      cumulativeData.push({ date: dateStr, totalUsers: cumulative });
    }
    res.json(cumulativeData);
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
};

// 7. Total time spent - Already good, but ensure index on DeviceUsage.user? Doesn't matter for aggregation.
exports.getTotalTimeSpent = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const result = await DeviceUsage.aggregate([
      { $group: { _id: null, totalMinutes: { $sum: "$totalMinutes" } } }
    ]);
    const totalMinutes = result.length ? result[0].totalMinutes : 0;
    res.json({ totalMinutes });
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
};

// 8. Total page views - Good
exports.getTotalPageViews = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const result = await UserActivity.aggregate([
      { $group: { _id: null, totalPageViews: { $sum: "$breakdown.pageView" } } }
    ]);
    const totalPageViews = result.length ? result[0].totalPageViews : 0;
    res.json({ totalPageViews });
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
};

// 9. Daily page views - Optimized with date range
exports.getPageViewCounts = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const { start, end } = getDateRange(30);
    const pageViews = await UserActivity.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          count: { $sum: "$breakdown.pageView" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(pageViews.map(pv => ({ date: pv._id, count: pv.count })));
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
};


// Get all users with their total points and today's points (paginated, sorted by total points desc)
exports.getUserProgress = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get all users (only username, email, _id)
    const users = await User.find()
      .select('username email _id')
      .lean()
      .skip(skip)
      .limit(limit);

    // Get total points for each user (aggregation)
    const userIds = users.map(u => u._id);
    const pointsAgg = await UserActivity.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: '$user', totalPoints: { $sum: '$totalPoints' } } }
    ]);
    const pointsMap = {};
    pointsAgg.forEach(p => { pointsMap[p._id] = p.totalPoints; });

    // Get today's points for each user (using current date string YYYY-MM-DD)
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAgg = await UserActivity.aggregate([
      { $match: { user: { $in: userIds }, date: todayStr } },
      { $group: { _id: '$user', todayPoints: { $sum: '$totalPoints' } } }
    ]);
    const todayMap = {};
    todayAgg.forEach(t => { todayMap[t._id] = t.todayPoints; });

    // Combine results
    const combined = users.map(u => ({
      userId: u._id,
      username: u.username,
      email: u.email,
      totalPoints: pointsMap[u._id] || 0,
      todayPoints: todayMap[u._id] || 0
    }));

    // Sort by totalPoints descending (already done by aggregation? But we need pagination before counting total users)
    combined.sort((a, b) => b.totalPoints - a.totalPoints);

    // Get total user count for pagination (without pagination filter)
    const totalUsers = await User.countDocuments();

    res.json({
      users: combined,
      pagination: { page, limit, total: totalUsers, pages: Math.ceil(totalUsers / limit) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Get monthly rankings (points earned in a specific month, sorted desc)
exports.getMonthlyRankings = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ message: 'year and month required (e.g., year=2026&month=5)' });
    }
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endStr = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Aggregate points per user in that month
    const rankings = await UserActivity.aggregate([
      { $match: { date: { $gte: startStr, $lte: endStr } } },
      { $group: { _id: '$user', totalPoints: { $sum: '$totalPoints' } } },
      { $sort: { totalPoints: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
      { $unwind: '$userInfo' },
      { $project: { userId: '$_id', username: '$userInfo.username', email: '$userInfo.email', totalPoints: 1 } }
    ]);

    const totalRanked = await UserActivity.distinct('user', { date: { $gte: startStr, $lte: endStr } }).then(d => d.length);

    res.json({
      rankings,
      pagination: { page, limit, total: totalRanked, pages: Math.ceil(totalRanked / limit) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Send a congratulatory message to a specific user (using existing notification system)
exports.sendCongratulations = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { userId, title, message } = req.body;
    if (!userId || !title || !message) {
      return res.status(400).json({ message: 'userId, title, and message required' });
    }
    const Notification = require('../models/Notification');
    const notification = new Notification({
      user: userId,
      title,
      message,
      type: 'success',
      createdBy: req.user._id,
    });
    await notification.save();
    res.json({ success: true, message: 'Congratulations message sent!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Get users who haven't received welcome notification (paginated)
exports.getPendingWelcomeUsers = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) return res.status(403).json({ message: 'Admin only' });
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find({ welcomeNotificationSent: false })
        .select('username email createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({ welcomeNotificationSent: false })
    ]);
    res.json({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Send welcome notification to specific user (or all pending)
exports.sendWelcomeNotification = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) return res.status(403).json({ message: 'Admin only' });
    const { userId, title, message, sendToAll = false } = req.body;
    if (!title || !message) return res.status(400).json({ message: 'Title and message required' });
    const Notification = require('../models/Notification');
    let targetUsers = [];
    if (sendToAll) {
      targetUsers = await User.find({ welcomeNotificationSent: false }).select('_id').lean();
      targetUsers = targetUsers.map(u => u._id);
    } else if (userId) {
      targetUsers = [userId];
    } else {
      return res.status(400).json({ message: 'userId required or sendToAll true' });
    }
    if (targetUsers.length === 0) return res.json({ message: 'No pending users found' });
    const notifications = targetUsers.map(uid => ({
      user: uid,
      title,
      message,
      type: 'success',
      createdBy: req.user._id,
    }));
    await Notification.insertMany(notifications);
    // Mark these users as welcomed
    await User.updateMany({ _id: { $in: targetUsers } }, { $set: { welcomeNotificationSent: true } });
    res.json({ message: `Welcome notification sent to ${targetUsers.length} user(s)` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get admin dashboard stats
exports.getAdminStats = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) return res.status(403).json({ message: 'Admin only' });
    const [pendingFeedback, pendingWelcome, pendingContact, totalUsers] = await Promise.all([
      require('../models/Feedback').countDocuments({ isApproved: false }),
      require('../models/User').countDocuments({ welcomeNotificationSent: false }),
      require('../models/ContactMessage').countDocuments({ status: 'pending' }),
      require('../models/User').countDocuments(),
    ]);
    res.json({ pendingFeedback, pendingWelcome, pendingContact, totalUsers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};