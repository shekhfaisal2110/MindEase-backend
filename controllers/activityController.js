// const UserActivity = require('../models/UserActivity');

// // Helper to get or create today's activity record
// const getTodayActivity = async (userId) => {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   let activity = await UserActivity.findOne({ user: userId, date: today });
//   if (!activity) {
//     activity = new UserActivity({ user: userId, date: today });
//     await activity.save();
//   }
//   return activity;
// };

// // Add points for an action
// exports.addPoints = async (req, res) => {
//   try {
//     const { actionType, points, meta } = req.body;
//     const userId = req.user._id;
//     const activity = await getTodayActivity(userId);

//     // Update breakdown and total
//     let pointsToAdd = points;
//     if (actionType === 'affirmation') {
//       pointsToAdd = Math.floor((meta?.totalAffirmations || 0) / 2);
//     }

//     if (actionType === 'pageView') activity.breakdown.pageView += pointsToAdd || 1;
//     else if (actionType === 'hourlyEmotion') activity.breakdown.hourlyEmotion += pointsToAdd || 5;
//     else if (actionType === 'emotionalCheckIn') activity.breakdown.emotionalCheckIn += pointsToAdd || 1;
//     else if (actionType === 'gratitude') activity.breakdown.gratitude += pointsToAdd || 2;
//     else if (actionType === 'affirmation') activity.breakdown.affirmation += pointsToAdd;
//     else if (actionType === 'growthHealing') activity.breakdown.growthHealing += pointsToAdd || 1;
//     else if (actionType === 'letterToSelf') activity.breakdown.letterToSelf += pointsToAdd || 20;
//     else if (actionType === 'dailyTask') activity.breakdown.dailyTask += pointsToAdd || 3;
//     else if (actionType === 'reactResponse') activity.breakdown.reactResponse += pointsToAdd || 5;
//     else if (actionType === 'ikigaiItem') activity.breakdown.ikigaiItem += pointsToAdd || 10;

//     activity.totalPoints += pointsToAdd;
//     await activity.save();

//     res.json({ success: true, totalPoints: activity.totalPoints });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Get activity history for the last N days (default 30)
// exports.getActivityHistory = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const days = parseInt(req.query.days) || 30;
//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - days);
//     startDate.setHours(0, 0, 0, 0);

//     const activities = await UserActivity.find({
//       user: userId,
//       date: { $gte: startDate }
//     }).sort({ date: 1 });

//     res.json(activities);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Get all-time total points for the user
// exports.getAllTimeTotal = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const result = await UserActivity.aggregate([
//       { $match: { user: userId } },
//       { $group: { _id: null, total: { $sum: "$totalPoints" } } }
//     ]);
//     const allTimeTotal = result.length > 0 ? result[0].total : 0;
//     res.json({ allTimeTotal });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };





const UserActivity = require('../models/UserActivity');

// Points mapping table
const POINTS_MAP = {
  pageView: 1,
  hourlyEmotion: 5,
  emotionalCheckIn: 1,
  gratitude: 2,
  affirmation: null,      // dynamic, calculated separately
  growthHealing: 1,
  letterToSelf: 20,
  dailyTask: 3,
  reactResponse: 5,
  ikigaiItem: 10
};

// Helper to get today's date string (YYYY-MM-DD)
const getTodayStr = () => new Date().toISOString().split('T')[0];

// Add points (atomic + upsert)
exports.addPoints = async (req, res) => {
  try {
    const { actionType, points, meta } = req.body;
    const userId = req.user._id;
    const todayStr = getTodayStr();

    let pointsToAdd = points || POINTS_MAP[actionType] || 1;
    if (actionType === 'affirmation') {
      // totalAffirmations should be sent from frontend OR calculate from DB
      // Assuming meta.totalAffirmations is safe (better to calculate backend)
      pointsToAdd = Math.floor((meta?.totalAffirmations || 0) / 2);
    }

    if (pointsToAdd === 0) {
      return res.json({ success: true, totalPoints: 0, message: 'No points added' });
    }

    // Build dynamic $inc object
    const incUpdate = {
      totalPoints: pointsToAdd,
      [`breakdown.${actionType}`]: 1   // increment count for that activity
    };
    // If actionType is not in breakdown (like 'pageView' matches field name), it's fine

    const result = await UserActivity.findOneAndUpdate(
      { user: userId, date: todayStr },
      { $inc: incUpdate },
      { upsert: true, new: true, lean: true }
    );

    res.json({ success: true, totalPoints: result.totalPoints });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get activity history with pagination (default 10 per page)
exports.getActivityHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const days = parseInt(req.query.days) || 30;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = getTodayStr();

    const [activities, total] = await Promise.all([
      UserActivity.find({
        user: userId,
        date: { $gte: startStr, $lte: endStr }
      })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserActivity.countDocuments({
        user: userId,
        date: { $gte: startStr, $lte: endStr }
      })
    ]);

    res.json({
      activities,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all-time total points (with optional caching)
exports.getAllTimeTotal = async (req, res) => {
  try {
    const userId = req.user._id;
    // Use aggregation (efficient with index on user + totalPoints)
    const result = await UserActivity.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: "$totalPoints" } } }
    ]);
    const allTimeTotal = result.length > 0 ? result[0].total : 0;
    res.json({ allTimeTotal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Optional: get today's points without increment (for dashboard)
exports.getTodayPoints = async (req, res) => {
  try {
    const userId = req.user._id;
    const todayStr = getTodayStr();
    const activity = await UserActivity.findOne(
      { user: userId, date: todayStr },
      { totalPoints: 1, breakdown: 1, _id: 0 }
    ).lean();
    res.json(activity || { totalPoints: 0, breakdown: {} });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};