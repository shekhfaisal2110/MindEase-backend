// const UserSession = require('../models/UserSession');
// const User = require('../models/User');
// const UserActivity = require('../models/UserActivity');
// const UserDailyActivity = require('../models/UserDailyActivity');

// // Helper: compute real duration for a session (handles missing endTime or durationSeconds)
// const computeDuration = (session, now = new Date()) => {
//   if (session.durationSeconds && session.durationSeconds > 0) {
//     return session.durationSeconds;
//   }
//   if (!session.startTime) return 0;
//   const end = session.endTime && session.endTime < now ? session.endTime : now;
//   const start = new Date(session.startTime);
//   const endDate = new Date(end);
//   const diffSec = Math.floor((endDate - start) / 1000);
//   return Math.max(0, diffSec);
// };

// // ------------------------------------------------------------------
// // Time spent statistics (includes both ended and active sessions)
// // ------------------------------------------------------------------
// exports.getTimeSpentStats = async (req, res) => {
//   try {
//     const now = new Date();

//     const startOfDay = new Date(now);
//     startOfDay.setHours(0, 0, 0, 0);
//     const startOfWeek = new Date(now);
//     startOfWeek.setDate(now.getDate() - now.getDay());
//     startOfWeek.setHours(0, 0, 0, 0);
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const startOfYear = new Date(now.getFullYear(), 0, 1);
//     const startOfAllTime = new Date(0);

//     // Fetch all sessions that started before now
//     const allSessions = await UserSession.find({
//       startTime: { $lt: now }
//     }).lean();

//     console.log(`📊 Time spent stats: found ${allSessions.length} sessions`);

//     const aggregateForPeriod = (since) => {
//       let totalSeconds = 0;
//       const usersSet = new Set();
//       for (const session of allSessions) {
//         const sessionStart = new Date(session.startTime);
//         if (sessionStart >= since) {
//           const duration = computeDuration(session, now);
//           totalSeconds += duration;
//           usersSet.add(session.user.toString());
//         }
//       }
//       return { totalSeconds, uniqueUsers: usersSet.size };
//     };

//     const today = aggregateForPeriod(startOfDay);
//     const week = aggregateForPeriod(startOfWeek);
//     const month = aggregateForPeriod(startOfMonth);
//     const year = aggregateForPeriod(startOfYear);
//     const lifetime = aggregateForPeriod(startOfAllTime);

//     console.log('⏱️ Time spent result:', { today, week, month, year, lifetime });

//     res.json({
//       success: true,
//       data: { today, week, month, year, lifetime }
//     });
//   } catch (error) {
//     console.error('getTimeSpentStats error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // ------------------------------------------------------------------
// // Top active users (by total session time)
// // ------------------------------------------------------------------
// exports.getTopActiveUsers = async (req, res) => {
//   try {
//     const { period = 'month' } = req.query;
//     const now = new Date();
//     let startDate;
//     switch (period) {
//       case 'day':
//         startDate = new Date(now);
//         startDate.setHours(0, 0, 0, 0);
//         break;
//       case 'week':
//         startDate = new Date(now);
//         startDate.setDate(now.getDate() - now.getDay());
//         startDate.setHours(0, 0, 0, 0);
//         break;
//       case 'month':
//         startDate = new Date(now.getFullYear(), now.getMonth(), 1);
//         break;
//       case 'year':
//         startDate = new Date(now.getFullYear(), 0, 1);
//         break;
//       default:
//         startDate = new Date(0);
//     }

//     const allSessions = await UserSession.find({
//       startTime: { $gte: startDate, $lt: now }
//     }).lean();

//     const userTimeMap = new Map();
//     for (const session of allSessions) {
//       const userId = session.user.toString();
//       const duration = computeDuration(session, now);
//       userTimeMap.set(userId, (userTimeMap.get(userId) || 0) + duration);
//     }

//     const topUsers = Array.from(userTimeMap.entries())
//       .map(([userId, totalSeconds]) => ({ userId, totalSeconds }))
//       .sort((a, b) => b.totalSeconds - a.totalSeconds)
//       .slice(0, 10);

//     const userIds = topUsers.map(u => u.userId);
//     const users = await User.find({ _id: { $in: userIds } }).select('username email').lean();
//     const userMap = new Map(users.map(u => [u._id.toString(), u]));

//     const result = topUsers.map(u => ({
//       name: userMap.get(u.userId)?.username || userMap.get(u.userId)?.email || 'Unknown',
//       email: userMap.get(u.userId)?.email || '',
//       totalSeconds: u.totalSeconds
//     }));

//     res.json({ success: true, data: result });
//   } catch (error) {
//     console.error('getTopActiveUsers error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // ------------------------------------------------------------------
// // Page views by page (from UserDailyActivity)
// // ------------------------------------------------------------------
// exports.getPageViewsByPage = async (req, res) => {
//   try {
//     const result = await UserDailyActivity.aggregate([
//       { $match: { pageViews: { $type: "object", $ne: null } } },
//       { $project: { pageViews: { $objectToArray: "$pageViews" } } },
//       { $unwind: "$pageViews" },
//       { $match: { "pageViews.v": true } },
//       { $group: { _id: "$pageViews.k", count: { $sum: 1 } } },
//       { $project: { page: "$_id", views: "$count", _id: 0 } },
//       { $sort: { views: -1 } }
//     ]);
//     res.json(result);
//   } catch (error) {
//     console.error(error);
//     res.json([]);
//   }
// };

// // ------------------------------------------------------------------
// // User visits (unique active users) – based on UserActivity
// // ------------------------------------------------------------------
// exports.getUserVisits = async (req, res) => {
//   try {
//     const now = new Date();
//     const todayStr = now.toISOString().split('T')[0];
//     const monthStr = now.toISOString().slice(0, 7);
//     const yearStr = now.getFullYear().toString();

//     const [dayUsers, monthUsers, yearUsers, allUsers] = await Promise.all([
//       UserActivity.distinct('user', { date: todayStr }),
//       UserActivity.distinct('user', { date: { $regex: `^${monthStr}` } }),
//       UserActivity.distinct('user', { date: { $regex: `^${yearStr}` } }),
//       UserActivity.distinct('user')
//     ]);
//     res.json({
//       success: true,
//       data: {
//         day: dayUsers.length,
//         month: monthUsers.length,
//         year: yearUsers.length,
//         lifetime: allUsers.length
//       }
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // ------------------------------------------------------------------
// // New users per period (from User collection)
// // ------------------------------------------------------------------
// exports.getNewUsers = async (req, res) => {
//   try {
//     const now = new Date();
//     const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const startOfYear = new Date(now.getFullYear(), 0, 1);
//     const [day, month, year, total] = await Promise.all([
//       User.countDocuments({ createdAt: { $gte: startOfDay } }),
//       User.countDocuments({ createdAt: { $gte: startOfMonth } }),
//       User.countDocuments({ createdAt: { $gte: startOfYear } }),
//       User.countDocuments()
//     ]);
//     res.json({ success: true, data: { day, month, year, lifetime: total } });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // ------------------------------------------------------------------
// // Total user points (from UserActivity)
// // ------------------------------------------------------------------
// exports.getTotalUserPoints = async (req, res) => {
//   try {
//     const now = new Date();
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
//     const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
//     const [allTime, thisMonth, thisYear] = await Promise.all([
//       UserActivity.aggregate([{ $group: { _id: null, total: { $sum: "$totalPoints" } } }]),
//       UserActivity.aggregate([{ $match: { date: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: "$totalPoints" } } }]),
//       UserActivity.aggregate([{ $match: { date: { $gte: startOfYear } } }, { $group: { _id: null, total: { $sum: "$totalPoints" } } }])
//     ]);
//     res.json({
//       success: true,
//       data: {
//         allTime: allTime[0]?.total || 0,
//         thisMonth: thisMonth[0]?.total || 0,
//         thisYear: thisYear[0]?.total || 0
//       }
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };





const UserSession = require('../models/UserSession');
const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const UserDailyActivity = require('../models/UserDailyActivity');

// Helper: date boundaries (start of day, week, month, year) as Date objects
const getDateBoundaries = (now = new Date()) => {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfAllTime = new Date(0);
  return { startOfDay, startOfWeek, startOfMonth, startOfYear, startOfAllTime };
};

// ------------------------------------------------------------------
// Time spent statistics (using aggregation, no in‑memory loops)
// ------------------------------------------------------------------
exports.getTimeSpentStats = async (req, res) => {
  try {
    const now = new Date();
    const { startOfDay, startOfWeek, startOfMonth, startOfYear, startOfAllTime } = getDateBoundaries(now);

    // Convert boundaries to ISODate for $match
    const pipeline = [
      { $match: { startTime: { $lt: now } } },
      // Compute effective endTime (if null, use now) and duration
      { $addFields: {
          effectiveEnd: { $ifNull: ["$endTime", now] },
          // Ensure startTime is a date
          startTimeDate: "$startTime"
        }
      },
      { $addFields: {
          durationSecs: {
            $floor: {
              $divide: [
                { $subtract: ["$effectiveEnd", "$startTimeDate"] },
                1000
              ]
            }
          }
        }
      },
      // Group into multiple periods using $facet
      { $facet: {
          day: [
            { $match: { startTime: { $gte: startOfDay } } },
            { $group: { _id: null, totalSeconds: { $sum: "$durationSecs" }, users: { $addToSet: "$user" } } },
            { $project: { totalSeconds: 1, uniqueUsers: { $size: "$users" } } }
          ],
          week: [
            { $match: { startTime: { $gte: startOfWeek } } },
            { $group: { _id: null, totalSeconds: { $sum: "$durationSecs" }, users: { $addToSet: "$user" } } },
            { $project: { totalSeconds: 1, uniqueUsers: { $size: "$users" } } }
          ],
          month: [
            { $match: { startTime: { $gte: startOfMonth } } },
            { $group: { _id: null, totalSeconds: { $sum: "$durationSecs" }, users: { $addToSet: "$user" } } },
            { $project: { totalSeconds: 1, uniqueUsers: { $size: "$users" } } }
          ],
          year: [
            { $match: { startTime: { $gte: startOfYear } } },
            { $group: { _id: null, totalSeconds: { $sum: "$durationSecs" }, users: { $addToSet: "$user" } } },
            { $project: { totalSeconds: 1, uniqueUsers: { $size: "$users" } } }
          ],
          lifetime: [
            { $match: { startTime: { $gte: startOfAllTime } } },
            { $group: { _id: null, totalSeconds: { $sum: "$durationSecs" }, users: { $addToSet: "$user" } } },
            { $project: { totalSeconds: 1, uniqueUsers: { $size: "$users" } } }
          ]
        }
      }
    ];

    const result = await UserSession.aggregate(pipeline, { allowDiskUse: false }).exec();
    const data = result[0] || {};

    const extract = (period) => {
      const p = data[period]?.[0] || { totalSeconds: 0, uniqueUsers: 0 };
      return { totalSeconds: p.totalSeconds, uniqueUsers: p.uniqueUsers };
    };

    res.json({
      success: true,
      data: {
        today: extract('day'),
        week: extract('week'),
        month: extract('month'),
        year: extract('year'),
        lifetime: extract('lifetime')
      }
    });
  } catch (error) {
    console.error('getTimeSpentStats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------------------------------------
// Top active users (by total session time in a period)
// ------------------------------------------------------------------
exports.getTopActiveUsers = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const now = new Date();
    let startDate;
    switch (period) {
      case 'day':
        startDate = new Date(now); startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0);
    }

    const pipeline = [
      { $match: { startTime: { $gte: startDate, $lt: now } } },
      { $addFields: {
          effectiveEnd: { $ifNull: ["$endTime", now] },
          startTimeDate: "$startTime"
        }
      },
      { $addFields: {
          durationSecs: {
            $floor: {
              $divide: [
                { $subtract: ["$effectiveEnd", "$startTimeDate"] },
                1000
              ]
            }
          }
        }
      },
      { $group: { _id: "$user", totalSeconds: { $sum: "$durationSecs" } } },
      { $sort: { totalSeconds: -1 } },
      { $limit: 10 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "userInfo" } },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
      { $project: {
          name: { $ifNull: ["$userInfo.username", "$userInfo.email", "Unknown"] },
          email: "$userInfo.email",
          totalSeconds: 1,
          _id: 0
        }
      }
    ];

    const topUsers = await UserSession.aggregate(pipeline, { allowDiskUse: false }).exec();
    res.json({ success: true, data: topUsers });
  } catch (error) {
    console.error('getTopActiveUsers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------------------------------------
// Page views by page (from UserDailyActivity) – summing numeric fields
// ------------------------------------------------------------------
exports.getPageViewsByPage = async (req, res) => {
  try {
    // Since `pageViews` fields are numbers, we sum them directly
    const result = await UserDailyActivity.aggregate([
      { $group: {
          _id: null,
          dashboard: { $sum: '$pageViews.dashboard' },
          affirmations: { $sum: '$pageViews.affirmations' },
          gratitude: { $sum: '$pageViews.gratitude' },
          emotional: { $sum: '$pageViews.emotional' },
          therapy: { $sum: '$pageViews.therapy' },
          letters: { $sum: '$pageViews.letters' },
          dailytracker: { $sum: '$pageViews.dailytracker' },
          hourlyEmotion: { $sum: '$pageViews.hourlyEmotion' },
          reactResponse: { $sum: '$pageViews.reactResponse' },
          ikigai: { $sum: '$pageViews.ikigai' },
          growthHealing: { $sum: '$pageViews.growthHealing' }
        }
      }
    ], { allowDiskUse: false }).exec();

    if (!result.length) return res.json([]);
    const data = result[0];
    const pageArray = Object.entries(data)
      .filter(([key]) => key !== '_id')
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views);
    res.json(pageArray);
  } catch (error) {
    console.error(error);
    res.json([]);
  }
};

// ------------------------------------------------------------------
// User visits (unique active users) – using date string ranges
// ------------------------------------------------------------------
exports.getUserVisits = async (req, res) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
    const startOfYearStr = `${now.getFullYear()}-01-01`;

    // Use $gte/$lte on string date field (indexed)
    const [dayUsers, monthUsers, yearUsers, allUsers] = await Promise.all([
      UserActivity.distinct('user', { date: todayStr }),
      UserActivity.distinct('user', { date: { $gte: startOfMonthStr, $lte: todayStr } }),
      UserActivity.distinct('user', { date: { $gte: startOfYearStr, $lte: todayStr } }),
      UserActivity.distinct('user')
    ]);

    res.json({
      success: true,
      data: {
        day: dayUsers.length,
        month: monthUsers.length,
        year: yearUsers.length,
        lifetime: allUsers.length
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------------------------------------
// New users per period (from User collection) – optimized counts
// ------------------------------------------------------------------
exports.getNewUsers = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [day, month, year, total] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startOfDay } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ createdAt: { $gte: startOfYear } }),
      User.estimatedDocumentCount()  // faster than countDocuments for total
    ]);

    res.json({ success: true, data: { day, month, year, lifetime: total } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------------------------------------
// Total user points (from UserActivity) – aggregation with in‑memory
// ------------------------------------------------------------------
exports.getTotalUserPoints = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const startOfYearStr = `${now.getFullYear()}-01-01`;

    const [allTime, thisMonth, thisYear] = await Promise.all([
      UserActivity.aggregate([{ $group: { _id: null, total: { $sum: "$totalPoints" } } }], { allowDiskUse: false }),
      UserActivity.aggregate([{ $match: { date: { $gte: startOfMonthStr } } }, { $group: { _id: null, total: { $sum: "$totalPoints" } } }], { allowDiskUse: false }),
      UserActivity.aggregate([{ $match: { date: { $gte: startOfYearStr } } }, { $group: { _id: null, total: { $sum: "$totalPoints" } } }], { allowDiskUse: false })
    ]);

    res.json({
      success: true,
      data: {
        allTime: allTime[0]?.total || 0,
        thisMonth: thisMonth[0]?.total || 0,
        thisYear: thisYear[0]?.total || 0
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};