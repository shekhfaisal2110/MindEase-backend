const UserSession = require('../models/UserSession');
const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const UserDailyActivity = require('../models/UserDailyActivity');

// Helper: get start/end of a period
const getPeriodBounds = (period, now = new Date()) => {
  switch (period) {
    case 'day':
      const startDay = new Date(now);
      startDay.setHours(0, 0, 0, 0);
      return { start: startDay, end: new Date(startDay.getTime() + 24*60*60*1000 - 1) };
    case 'week':
      const startWeek = new Date(now);
      startWeek.setDate(now.getDate() - now.getDay());
      startWeek.setHours(0,0,0,0);
      return { start: startWeek, end: new Date(startWeek.getTime() + 7*24*60*60*1000 - 1) };
    case 'month':
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start: startMonth, end: endMonth };
    case 'year':
      const startYear = new Date(now.getFullYear(), 0, 1);
      const endYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start: startYear, end: endYear };
    default:
      return { start: new Date(0), end: new Date() };
  }
};

// ------------------------------------------------------------------
// Time spent (from sessions with endTime)
// ------------------------------------------------------------------
exports.getTimeSpentStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfAllTime = new Date(0);

    const aggregateTime = async (since) => {
      const sessions = await UserSession.aggregate([
        { $match: { endTime: { $ne: null, $gte: since }, startTime: { $lt: now } } },
        { $addFields: {
            realDuration: {
              $cond: [
                { $and: [{ $gt: ["$durationSeconds", 0] }, { $ne: ["$durationSeconds", null] }] },
                "$durationSeconds",
                { $divide: [{ $subtract: ["$endTime", "$startTime"] }, 1000] }
              ]
            }
          }
        },
        { $group: { _id: "$user", totalSeconds: { $sum: "$realDuration" } } }
      ]);
      const uniqueUsers = sessions.length;
      const totalSeconds = sessions.reduce((sum, s) => sum + (s.totalSeconds || 0), 0);
      return { totalSeconds, uniqueUsers };
    };

    const [today, week, month, year, lifetime] = await Promise.all([
      aggregateTime(startOfDay), aggregateTime(startOfWeek), aggregateTime(startOfMonth),
      aggregateTime(startOfYear), aggregateTime(startOfAllTime)
    ]);

    res.json({ success: true, data: { today, week, month, year, lifetime } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------------------------------------
// Top active users (by total session time)
// ------------------------------------------------------------------
exports.getTopActiveUsers = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const now = new Date();
    let startDate;
    switch (period) {
      case 'day': startDate = new Date(now); startDate.setHours(0,0,0,0); break;
      case 'week': startDate = new Date(now); startDate.setDate(now.getDate() - now.getDay()); startDate.setHours(0,0,0,0); break;
      case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'year': startDate = new Date(now.getFullYear(), 0, 1); break;
      default: startDate = new Date(0);
    }
    const topUsers = await UserSession.aggregate([
      { $match: { endTime: { $ne: null, $gte: startDate }, startTime: { $lt: now } } },
      { $addFields: { realDuration: { $cond: [{ $gt: ["$durationSeconds", 0] }, "$durationSeconds", { $divide: [{ $subtract: ["$endTime", "$startTime"] }, 1000] }] } } },
      { $group: { _id: "$user", totalSeconds: { $sum: "$realDuration" } } },
      { $sort: { totalSeconds: -1 } },
      { $limit: 10 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "userInfo" } },
      { $unwind: "$userInfo" },
      { $project: { name: { $ifNull: ["$userInfo.username", "$userInfo.email"] }, email: "$userInfo.email", totalSeconds: 1 } }
    ]);
    res.json({ success: true, data: topUsers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------------------------------------
// Page views by page (from UserDailyActivity)
// ------------------------------------------------------------------
exports.getPageViewsByPage = async (req, res) => {
  try {
    const result = await UserDailyActivity.aggregate([
      { $project: { pageViews: { $objectToArray: "$pageViews" } } },
      { $unwind: "$pageViews" },
      { $match: { "pageViews.v": true } },
      { $group: { _id: "$pageViews.k", count: { $sum: 1 } } },
      { $project: { page: "$_id", views: "$count", _id: 0 } },
      { $sort: { views: -1 } }
    ]);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------------------------------------
// User visits (unique active users) – based on UserActivity
// ------------------------------------------------------------------
exports.getUserVisits = async (req, res) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = now.toISOString().slice(0, 7); // YYYY-MM
    const yearStr = now.getFullYear().toString();

    const [dayUsers, monthUsers, yearUsers, allUsers] = await Promise.all([
      UserActivity.distinct('user', { date: todayStr }),
      UserActivity.distinct('user', { date: { $regex: `^${monthStr}` } }),
      UserActivity.distinct('user', { date: { $regex: `^${yearStr}` } }),
      UserActivity.distinct('user'),
    ]);
    res.json({
      success: true,
      data: {
        day: dayUsers.length,
        month: monthUsers.length,
        year: yearUsers.length,
        lifetime: allUsers.length,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------------------------------------
// New users per period (from User collection)
// ------------------------------------------------------------------
exports.getNewUsers = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const [day, month, year, total] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startOfDay } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ createdAt: { $gte: startOfYear } }),
      User.countDocuments(),
    ]);
    res.json({ success: true, data: { day, month, year, lifetime: total } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------------------------------------
// Total user points (from UserActivity)
// ------------------------------------------------------------------
exports.getTotalUserPoints = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    const [allTime, thisMonth, thisYear] = await Promise.all([
      UserActivity.aggregate([{ $group: { _id: null, total: { $sum: "$totalPoints" } } }]),
      UserActivity.aggregate([{ $match: { date: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: "$totalPoints" } } }]),
      UserActivity.aggregate([{ $match: { date: { $gte: startOfYear } } }, { $group: { _id: null, total: { $sum: "$totalPoints" } } }]),
    ]);
    res.json({
      success: true,
      data: {
        allTime: allTime[0]?.total || 0,
        thisMonth: thisMonth[0]?.total || 0,
        thisYear: thisYear[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};