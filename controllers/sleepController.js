// // const SleepLog = require('../models/SleepLog');
// // const EmotionalActivity = require('../models/EmotionalActivity');

// // const calculateDuration = (bedtime, wakeTime) => {
// //   const [bedHour, bedMin] = bedtime.split(':').map(Number);
// //   const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
// //   let bed = bedHour * 60 + bedMin;
// //   let wake = wakeHour * 60 + wakeMin;
// //   if (wake < bed) wake += 24 * 60;
// //   return (wake - bed) / 60;
// // };

// // exports.createSleepLog = async (req, res) => {
// //   try {
// //     const { date, bedtime, wakeTime, quality, notes } = req.body;
// //     const targetDate = new Date(date);
// //     targetDate.setHours(0,0,0,0);
// //     const duration = calculateDuration(bedtime, wakeTime);
// //     const sleepLog = new SleepLog({
// //       user: req.user._id,
// //       date: targetDate,
// //       bedtime,
// //       wakeTime,
// //       duration,
// //       quality,
// //       notes
// //     });
// //     await sleepLog.save();
// //     res.status(201).json(sleepLog);
// //   } catch (err) {
// //     if (err.code === 11000) return res.status(400).json({ message: 'Sleep log already exists for this date' });
// //     res.status(500).json({ message: err.message });
// //   }
// // };

// // exports.getSleepLogs = async (req, res) => {
// //   try {
// //     const logs = await SleepLog.find({ user: req.user._id }).sort({ date: -1 });
// //     res.json(logs);
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // };

// // exports.getSleepTrends = async (req, res) => {
// //   try {
// //     const days = parseInt(req.query.days) || 30;
// //     const endDate = new Date();
// //     endDate.setHours(0,0,0,0);
// //     const startDate = new Date();
// //     startDate.setDate(startDate.getDate() - days);
// //     startDate.setHours(0,0,0,0);

// //     const sleepLogs = await SleepLog.find({
// //       user: req.user._id,
// //       date: { $gte: startDate, $lte: endDate }
// //     }).sort({ date: 1 });

// //     const moodEntries = await EmotionalActivity.find({
// //       user: req.user._id,
// //       date: { $gte: startDate, $lte: endDate }
// //     });

// //     const moodByDate = new Map();
// //     moodEntries.forEach(mood => {
// //       const dateStr = mood.date.toISOString().split('T')[0];
// //       if (!moodByDate.has(dateStr)) moodByDate.set(dateStr, []);
// //       moodByDate.get(dateStr).push(mood.intensity);
// //     });
// //     const avgMoodByDate = new Map();
// //     for (let [date, intensities] of moodByDate.entries()) {
// //       avgMoodByDate.set(date, intensities.reduce((a,b) => a+b,0) / intensities.length);
// //     }

// //     const trend = [];
// //     const currentDate = new Date(startDate);
// //     while (currentDate <= endDate) {
// //       const dateStr = currentDate.toISOString().split('T')[0];
// //       const sleep = sleepLogs.find(s => s.date.toISOString().split('T')[0] === dateStr);
// //       if (sleep) {
// //         const nextDate = new Date(currentDate);
// //         nextDate.setDate(nextDate.getDate() + 1);
// //         const nextDateStr = nextDate.toISOString().split('T')[0];
// //         const mood = avgMoodByDate.get(nextDateStr) || null;
// //         trend.push({
// //           date: dateStr,
// //           sleepHours: parseFloat(sleep.duration.toFixed(1)),
// //           sleepQuality: sleep.quality,
// //           nextDayMood: mood ? parseFloat(mood.toFixed(1)) : null
// //         });
// //       }
// //       currentDate.setDate(currentDate.getDate() + 1);
// //     }
// //     res.json(trend);
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // };

// // exports.deleteSleepLog = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     await SleepLog.findOneAndDelete({ _id: id, user: req.user._id });
// //     res.json({ message: 'Deleted' });
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // };



// const SleepLog = require('../models/SleepLog');
// const EmotionalActivity = require('../models/EmotionalActivity');

// // Helper: convert any date input to YYYY-MM-DD string (UTC)
// const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

// // Calculate duration from bedtime and wakeTime (strings "HH:MM")
// const calculateDuration = (bedtime, wakeTime) => {
//   const [bedHour, bedMin] = bedtime.split(':').map(Number);
//   const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
//   let bed = bedHour * 60 + bedMin;
//   let wake = wakeHour * 60 + wakeMin;
//   if (wake < bed) wake += 24 * 60;
//   return (wake - bed) / 60;
// };

// // Create or update sleep log (upsert)
// exports.createSleepLog = async (req, res) => {
//   try {
//     const { date, bedtime, wakeTime, quality, notes } = req.body;
//     const dateStr = toDateStr(date);
//     const duration = calculateDuration(bedtime, wakeTime);

//     const sleepLog = await SleepLog.findOneAndUpdate(
//       { user: req.user._id, date: dateStr },
//       { $set: { bedtime, wakeTime, duration, quality, notes: notes || '' } },
//       { upsert: true, new: true, lean: true }
//     );
//     res.status(201).json(sleepLog);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get sleep logs with pagination
// exports.getSleepLogs = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 30;
//     const skip = (page - 1) * limit;

//     const [logs, total] = await Promise.all([
//       SleepLog.find({ user: req.user._id })
//         .sort({ date: -1 })
//         .skip(skip)
//         .limit(limit)
//         .select('date bedtime wakeTime duration quality notes')
//         .lean(),
//       SleepLog.countDocuments({ user: req.user._id })
//     ]);

//     res.json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get sleep vs next-day mood trends (optimized with aggregation)
// exports.getSleepTrends = async (req, res) => {
//   try {
//     const days = parseInt(req.query.days) || 30;
//     const endDate = new Date();
//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - days);
//     const startStr = toDateStr(startDate);
//     const endStr = toDateStr(endDate);

//     // Use aggregation to compute next-day mood directly
//     const trends = await SleepLog.aggregate([
//       { $match: { user: req.user._id, date: { $gte: startStr, $lte: endStr } } },
//       { $addFields: { nextDay: { $dateToString: { format: "%Y-%m-%d", date: { $dateAdd: { startDate: { $dateFromString: { dateString: "$date" } }, unit: "day", amount: 1 } } } } } },
//       { $lookup: {
//           from: "emotionalactivities",
//           let: { nextDate: "$nextDay", userId: req.user._id },
//           pipeline: [
//             { $match: { $expr: { $and: [ { $eq: ["$user", "$$userId"] }, { $eq: ["$date", "$$nextDate"] } ] } } },
//             { $group: { _id: null, avgIntensity: { $avg: "$intensity" } } }
//           ],
//           as: "nextDayMood"
//         }
//       },
//       { $unwind: { path: "$nextDayMood", preserveNullAndEmptyArrays: true } },
//       { $project: {
//           date: 1,
//           sleepHours: { $round: ["$duration", 1] },
//           sleepQuality: "$quality",
//           nextDayMood: { $ifNull: ["$nextDayMood.avgIntensity", null] }
//         }
//       },
//       { $sort: { date: 1 } }
//     ]);

//     // Also include days where no sleep logged (if you want null entries, but optional)
//     // For simplicity, return only days with sleep logs.
//     res.json(trends);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // Delete sleep log
// exports.deleteSleepLog = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const result = await SleepLog.deleteOne({ _id: id, user: req.user._id });
//     if (result.deletedCount === 0) return res.status(404).json({ message: 'Log not found' });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };








const SleepLog = require('../models/SleepLog');

// Helper: convert any date to YYYY-MM-DD (UTC)
const toDateStr = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Calculate duration (hours)
const calculateDuration = (bedtime, wakeTime) => {
  const [bedHour, bedMin] = bedtime.split(':').map(Number);
  const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
  let bed = bedHour * 60 + bedMin;
  let wake = wakeHour * 60 + wakeMin;
  if (wake < bed) wake += 24 * 60;
  return (wake - bed) / 60;
};

// Create or update (upsert) sleep log
exports.createSleepLog = async (req, res) => {
  try {
    const { date, bedtime, wakeTime, quality, notes } = req.body;
    const dateStr = toDateStr(date);
    const duration = calculateDuration(bedtime, wakeTime);

    const log = await SleepLog.findOneAndUpdate(
      { user: req.user._id, date: dateStr },
      {
        $set: {
          bedtime,
          wakeTime,
          quality,
          notes: notes || '',
          duration
        }
      },
      { upsert: true, new: true, runValidators: true }
    );
    res.status(201).json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Get sleep logs (simple pagination with skip/limit)
exports.getSleepLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const logs = await SleepLog.find({ user: req.user._id })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await SleepLog.countDocuments({ user: req.user._id });

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Sleep vs next‑day mood trends (using aggregation)
exports.getSleepTrends = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startStr = toDateStr(startDate);
    const endStr = toDateStr(endDate);

    const trends = await SleepLog.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startStr, $lte: endStr }
        }
      },
      {
        $addFields: {
          nextDay: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: {
                $dateAdd: {
                  startDate: { $dateFromString: { dateString: "$date" } },
                  unit: "day",
                  amount: 1
                }
              }
            }
          }
        }
      },
      {
        $lookup: {
          from: "emotionalactivities",
          let: { nextDate: "$nextDay", userId: req.user._id },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$user", "$$userId"] },
                    { $eq: ["$date", "$$nextDate"] }
                  ]
                }
              }
            },
            { $group: { _id: null, avgIntensity: { $avg: "$intensity" } } }
          ],
          as: "nextDayMood"
        }
      },
      { $unwind: { path: "$nextDayMood", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          date: 1,
          sleepHours: { $round: ["$duration", 1] },
          sleepQuality: "$quality",
          nextDayMood: { $ifNull: ["$nextDayMood.avgIntensity", null] }
        }
      },
      { $sort: { date: 1 } }
    ]);

    res.json(trends);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Delete a sleep log (with ownership check)
exports.deleteSleepLog = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await SleepLog.deleteOne({ _id: id, user: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Log not found' });
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};