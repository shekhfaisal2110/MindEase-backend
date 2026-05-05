// const UserActivity = require('../models/UserActivity');

// // ---------- Points mapping for all activity types ----------
// const POINTS_MAP = {
//   pageView: 1,
//   hourlyEmotion: 5,
//   emotionalCheckIn: 1,
//   reactResponse: 5,
//   gratitude: 2,
//   affirmation: 1,     
//   therapy: 1,            
//   letterToSelf: 20,
//   ikigaiItem: 10,
//   cbtThoughtRecord: 10,   
//   sleepLog: 2,           
//   dailyTask: 3,           
//   motivationThought: 5,   
//   copingCardUse: 2,       
//   copingCardCreate: 5,    
//   behavioralTaskComplete: 3, 
//   growthHealing: 1,
//   journaling: 2,          
//   affirmationLegacy: 1,
//   timeEntry: 20,           
//   deviceUsage: 5,          
//   wellbeingActivity: 5,    
//   badgeEarned: 20,         
// };

// // Helper: get today's date string (YYYY-MM-DD)
// const getTodayStr = () => new Date().toISOString().split('T')[0];

// // Add points (atomic upsert)
// exports.addPoints = async (req, res) => {
//   try {
//     const { actionType, points, meta } = req.body;
//     const userId = req.user._id;
//     const todayStr = getTodayStr();

//     let pointsToAdd = points || POINTS_MAP[actionType] || 1;

//     // Special handling for affirmations (points based on number of affirmations)
//     if (actionType === 'affirmation') {
//       // You can either trust meta.totalAffirmations from frontend or compute from DB
//       // For accuracy, we fetch from DB:
//       const Affirmation = require('../models/Affirmation');
//       const todayMonth = new Date().toISOString().slice(0, 7);
//       const count = await Affirmation.countDocuments({
//         user: userId,
//         month: todayMonth,
//       });
//       pointsToAdd = Math.floor(count / 2);
//     }

//     if (pointsToAdd === 0) {
//       return res.json({ success: true, totalPoints: 0, message: 'No points added' });
//     }

//     // Build dynamic $inc object
//     const incUpdate = {
//       totalPoints: pointsToAdd,
//       [`breakdown.${actionType}`]: 1,
//     };

//     const result = await UserActivity.findOneAndUpdate(
//       { user: userId, date: todayStr },
//       { $inc: incUpdate },
//       { upsert: true, new: true, lean: true }
//     );

//     res.json({ success: true, totalPoints: result.totalPoints });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Get activity history with pagination
// exports.getActivityHistory = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const days = parseInt(req.query.days) || 30;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - days);
//     const startStr = startDate.toISOString().split('T')[0];
//     const endStr = getTodayStr();

//     const [activities, total] = await Promise.all([
//       UserActivity.find({
//         user: userId,
//         date: { $gte: startStr, $lte: endStr },
//       })
//         .sort({ date: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       UserActivity.countDocuments({
//         user: userId,
//         date: { $gte: startStr, $lte: endStr },
//       }),
//     ]);

//     res.json({
//       activities,
//       pagination: { page, limit, total, pages: Math.ceil(total / limit) },
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Get all-time total points
// exports.getAllTimeTotal = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const result = await UserActivity.aggregate([
//       { $match: { user: userId } },
//       { $group: { _id: null, total: { $sum: '$totalPoints' } } },
//     ]);
//     const allTimeTotal = result.length ? result[0].total : 0;
//     res.json({ allTimeTotal });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Get today's points (without increment)
// exports.getTodayPoints = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const todayStr = getTodayStr();
//     const activity = await UserActivity.findOne(
//       { user: userId, date: todayStr },
//       { totalPoints: 1, breakdown: 1, _id: 0 }
//     ).lean();
//     res.json(activity || { totalPoints: 0, breakdown: {} });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };


const UserActivity = require('../models/UserActivity');
const Affirmation = require('../models/Affirmation');

// ---------- Points mapping for all activity types ----------
const POINTS_MAP = {
  pageView: 1,
  hourlyEmotion: 5,
  emotionalCheckIn: 1,
  reactResponse: 5,
  gratitude: 2,
  affirmation: 1,
  therapy: 1,
  letterToSelf: 20,
  ikigaiItem: 10,
  cbtThoughtRecord: 10,
  sleepLog: 2,
  dailyTask: 3,
  motivationThought: 5,
  copingCardUse: 2,
  copingCardCreate: 5,
  behavioralTaskComplete: 3,
  growthHealing: 1,
  journaling: 2,
  affirmationLegacy: 1,
  timeEntry: 20,
  deviceUsage: 5,
  wellbeingActivity: 5,
  badgeEarned: 20,
};

const getTodayStr = () => new Date().toISOString().split('T')[0];

// ---------- Helper: compute affirmation points efficiently ----------
// Uses a single lightweight aggregate to get count for current month
async function getAffirmationPoints(userId) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  const result = await Affirmation.aggregate([
    { $match: { user: userId, createdAt: { $gte: startOfMonth, $lt: endOfMonth } } },
    { $count: "total" }
  ]).exec();
  const count = result[0]?.total || 0;
  return Math.floor(count / 2);
}

// ---------- Add points (atomic upsert) ----------
exports.addPoints = async (req, res) => {
  try {
    const { actionType, points, meta } = req.body;
    const userId = req.user._id;
    const todayStr = getTodayStr();

    let pointsToAdd = points || POINTS_MAP[actionType] || 1;

    // Special handling for affirmations (points based on number of affirmations this month)
    if (actionType === 'affirmation') {
      pointsToAdd = await getAffirmationPoints(userId);
    }

    if (pointsToAdd === 0) {
      return res.json({ success: true, totalPoints: 0, message: 'No points added' });
    }

    const incUpdate = {
      totalPoints: pointsToAdd,
      [`breakdown.${actionType}`]: 1,
    };

    const result = await UserActivity.findOneAndUpdate(
      { user: userId, date: todayStr },
      { $inc: incUpdate },
      { upsert: true, new: true, lean: true, runValidators: false }
    );

    res.json({ success: true, totalPoints: result.totalPoints });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ---------- Get activity history with cursor-based pagination (no skip/limit) ----------
exports.getActivityHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const days = parseInt(req.query.days) || 30;
    const limit = parseInt(req.query.limit) || 10;
    const cursor = req.query.cursor || null; // last document _id from previous page

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = getTodayStr();

    const query = {
      user: userId,
      date: { $gte: startStr, $lte: endStr },
    };
    if (cursor) query._id = { $lt: cursor }; // because sorted by date descending

    const activities = await UserActivity.find(query)
      .sort({ date: -1, _id: -1 })
      .limit(limit)
      .lean();

    const nextCursor = activities.length === limit ? activities[activities.length - 1]._id : null;
    // Optional: total count can be omitted or computed efficiently if needed
    // (but we can estimate from cursor and limit; for exact total, use a fast count)
    const total = await UserActivity.countDocuments(query).lean();

    res.json({
      activities,
      nextCursor,
      hasMore: !!nextCursor,
      pagination: { limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ---------- Get all-time total points (optimised aggregation) ----------
exports.getAllTimeTotal = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await UserActivity.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: '$totalPoints' } } }
    ], { allowDiskUse: false }).exec();
    const allTimeTotal = result.length ? result[0].total : 0;
    res.json({ allTimeTotal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ---------- Get today's points (lean and fast) ----------
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