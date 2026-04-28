const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const DeviceUsage = require('../models/DeviceUsage');
const UserDailyActivity = require('../models/UserDailyActivity');
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

const isAdmin = (req) => req.user.email === process.env.ADMIN_EMAIL;

// 1. Daily Active Users (last 30 days)
exports.getDailyActiveUsers = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0,0,0,0);
    const activities = await UserActivity.aggregate([
      { $match: { date: { $gte: start } } },
      { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, user: "$user" } } },
      { $group: { _id: "$_id.date", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json(activities.map(a => ({ date: a._id, count: a.count })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 2. User registrations over time (last 30 days)
exports.getUserRegistrations = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0,0,0,0);
    const registrations = await User.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json(registrations.map(r => ({ date: r._id, count: r.count })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 3. Most used features (total entries per module)
exports.getFeatureUsage = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const [gratitude, affirmations, emotional, therapy, letters, dailyRoutine, dailyTracker, hourly, react, ikigai] = await Promise.all([
      GratitudeEntry.countDocuments(),
      Affirmation.countDocuments(),
      EmotionalActivity.countDocuments(),
      TherapyExercise.countDocuments(),
      LetterToSelf.countDocuments(),
      DailyRoutine.countDocuments(),
      DailyEmotionalTracking.countDocuments(),
      HourlyEmotion.countDocuments(),
      ReactResponse.countDocuments(),
      Ikigai.countDocuments()
    ]);
    res.json({ gratitude, affirmations, emotional, therapy, letters, dailyRoutine, dailyTracker, hourly, react, ikigai });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 4. Total points breakdown (all users)
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
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 5. Engagement radar (average per user)
exports.getEngagementRadar = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const totalUsers = await User.countDocuments();
    if (totalUsers === 0) return res.json([]);
    const [gratitudeCount, affirmationsCount, emotionalCount, therapyCount, lettersCount, dailyTrackerCount, hourlyCount, reactCount] = await Promise.all([
      GratitudeEntry.countDocuments(),
      Affirmation.countDocuments(),
      EmotionalActivity.countDocuments(),
      TherapyExercise.countDocuments(),
      LetterToSelf.countDocuments(),
      DailyEmotionalTracking.countDocuments(),
      HourlyEmotion.countDocuments(),
      ReactResponse.countDocuments()
    ]);
    const radar = [
      { subject: 'Gratitude', value: (gratitudeCount / totalUsers).toFixed(1) },
      { subject: 'Affirmations', value: (affirmationsCount / totalUsers).toFixed(1) },
      { subject: 'Emotional', value: (emotionalCount / totalUsers).toFixed(1) },
      { subject: 'Therapy', value: (therapyCount / totalUsers).toFixed(1) },
      { subject: 'Letters', value: (lettersCount / totalUsers).toFixed(1) },
      { subject: 'Daily Tracker', value: (dailyTrackerCount / totalUsers).toFixed(1) },
      { subject: 'Hourly Emotions', value: (hourlyCount / totalUsers).toFixed(1) },
      { subject: 'React/Response', value: (reactCount / totalUsers).toFixed(1) },
    ];
    res.json(radar);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 6. Total users over time (cumulative – last 30 days)
exports.getTotalUsersOverTime = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0,0,0,0);
    const registrations = await User.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
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
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 7. Total time spent on website (sum of device usage minutes)
exports.getTotalTimeSpent = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const result = await DeviceUsage.aggregate([
      { $group: { _id: null, totalMinutes: { $sum: "$totalMinutes" } } }
    ]);
    const totalMinutes = result.length ? result[0].totalMinutes : 0;
    res.json({ totalMinutes });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 8. Total page views (sum of breakdown.pageView)
exports.getTotalPageViews = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const result = await UserActivity.aggregate([
      { $group: { _id: null, totalPageViews: { $sum: "$breakdown.pageView" } } }
    ]);
    const totalPageViews = result.length ? result[0].totalPageViews : 0;
    res.json({ totalPageViews });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// 9. Daily page views (last 30 days) – for chart
exports.getPageViewCounts = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0,0,0,0);
    const pageViews = await UserActivity.aggregate([
      { $match: { date: { $gte: start } } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          count: { $sum: "$breakdown.pageView" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(pageViews.map(pv => ({ date: pv._id, count: pv.count })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

