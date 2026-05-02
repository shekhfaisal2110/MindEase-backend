// // controllers/emotionalActivityController.js
// const EmotionalActivity = require('../models/EmotionalActivity');

// // Helper: get date string (YYYY-MM-DD) from Date object (UTC)
// const toDateStr = (date) => new Date(date).toISOString().split('T')[0];
// const getTodayStr = () => toDateStr(new Date()); 

// // Get all emotional check‑ins with pagination
// exports.getActivities = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;
//     const [activities, total] = await Promise.all([
//       EmotionalActivity.find({ user: req.user._id })
//         .sort({ date: -1 })
//         .skip(skip)
//         .limit(limit)
//         .select('emotion intensity note date')
//         .lean(),
//       EmotionalActivity.countDocuments({ user: req.user._id })
//     ]);
//     res.json({ activities, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Create a new emotional check-in
// exports.createActivity = async (req, res) => {
//   try {
//     const { emotion, intensity, note } = req.body;
//     if (!emotion || intensity === undefined) {
//       return res.status(400).json({ message: 'Emotion and intensity are required' });
//     }
//     if (intensity < 1 || intensity > 10) {
//       return res.status(400).json({ message: 'Intensity must be between 1 and 10' });
//     }
//     const activity = new EmotionalActivity({
//       user: req.user._id,
//       emotion: emotion.trim().toLowerCase(),
//       intensity: parseInt(intensity),
//       note: note ? note.trim() : '',
//       date: getTodayStr() // ensure date is set correctly
//     });
//     await activity.save();
//     res.status(201).json(activity);
//   } catch (err) {
//     console.error('Create emotional activity error:', err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get statistics (last 30 days and all‑time) using aggregation
// exports.getStats = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const thirtyDaysAgo = new Date();
//     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
//     const thirtyDaysAgoStr = toDateStr(thirtyDaysAgo);
//     const todayStr = toDateStr(new Date());

//     // All-time stats
//     const allTimeAgg = await EmotionalActivity.aggregate([
//       { $match: { user: userId } },
//       { $group: {
//           _id: null,
//           total: { $sum: 1 },
//           avgIntensity: { $avg: "$intensity" },
//           emotionCounts: { $push: "$emotion" }
//         }
//       }
//     ]);

//     let allTimeStats = { total: 0, avgIntensity: 0, emotionCounts: {}, mostFrequent: null };
//     if (allTimeAgg.length) {
//       const emotionCounts = allTimeAgg[0].emotionCounts.reduce((acc, e) => {
//         acc[e] = (acc[e] || 0) + 1;
//         return acc;
//       }, {});
//       const mostFrequent = Object.entries(emotionCounts).reduce((a, b) => a[1] > b[1] ? a : b, [null, 0])[0];
//       allTimeStats = {
//         total: allTimeAgg[0].total,
//         avgIntensity: allTimeAgg[0].avgIntensity.toFixed(1),
//         emotionCounts,
//         mostFrequent
//       };
//     }

//     // Last 30 days stats and daily trend
//     const recentAgg = await EmotionalActivity.aggregate([
//       { $match: { user: userId, date: { $gte: thirtyDaysAgo } } },
//       { $group: {
//           _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
//           count: { $sum: 1 },
//           totalIntensity: { $sum: "$intensity" },
//           emotions: { $push: "$emotion" }
//         }
//       },
//       { $sort: { _id: 1 } }
//     ]);

//     if (!recentAgg.length) {
//       return res.json({ recent: { total: 0, avgIntensity: 0, emotionCounts: {}, mostFrequent: null }, allTime: allTimeStats, dailyTrend: {} });
//     }

//     // Compute overall recent stats
//     let recentTotal = 0, recentTotalIntensity = 0, recentEmotionCounts = {};
//     const dailyTrend = {};
//     for (const day of recentAgg) {
//       recentTotal += day.count;
//       recentTotalIntensity += day.totalIntensity;
//       day.emotions.forEach(e => { recentEmotionCounts[e] = (recentEmotionCounts[e] || 0) + 1; });
//       dailyTrend[day._id] = {
//         count: day.count,
//         avgIntensity: (day.totalIntensity / day.count).toFixed(1)
//       };
//     }
//     const mostFrequentRecent = Object.entries(recentEmotionCounts).reduce((a, b) => a[1] > b[1] ? a : b, [null, 0])[0];
//     const recentStats = {
//       total: recentTotal,
//       avgIntensity: (recentTotalIntensity / recentTotal).toFixed(1),
//       emotionCounts: recentEmotionCounts,
//       mostFrequent: mostFrequentRecent
//     };

//     res.json({
//       recent: recentStats,
//       allTime: allTimeStats,
//       dailyTrend
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get intensity trend for a specific emotion (last 30 days)
// exports.getEmotionTrend = async (req, res) => {
//   try {
//     const { emotion } = req.params;
//     const userId = req.user._id;
//     const thirtyDaysAgo = new Date();
//     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

//     const trend = await EmotionalActivity.aggregate([
//       { $match: { user: userId, emotion: emotion, date: { $gte: thirtyDaysAgo } } },
//       { $group: {
//           _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
//           avgIntensity: { $avg: "$intensity" }
//         }
//       },
//       { $sort: { _id: 1 } }
//     ]);
//     res.json(trend.map(t => ({ date: t._id, avgIntensity: parseFloat(t.avgIntensity.toFixed(1)) })));
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // (Optional) Delete an emotional activity
// exports.deleteActivity = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const result = await EmotionalActivity.findOneAndDelete({ _id: id, user: req.user._id });
//     if (!result) return res.status(404).json({ message: 'Activity not found' });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };










const EmotionalActivity = require('../models/EmotionalActivity');

// Helper: convert any date to YYYY-MM-DD string (UTC)
const toDateStr = (date) => new Date(date).toISOString().split('T')[0];
const getTodayStr = () => toDateStr(new Date());   // <-- define this

// Get all emotional check‑ins with pagination
exports.getActivities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const [activities, total] = await Promise.all([
      EmotionalActivity.find({ user: req.user._id })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .select('emotion intensity note date')
        .lean(),
      EmotionalActivity.countDocuments({ user: req.user._id })
    ]);
    res.json({ activities, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a new emotional check-in
exports.createActivity = async (req, res) => {
  try {
    const { emotion, intensity, note } = req.body;
    if (!emotion || intensity === undefined) {
      return res.status(400).json({ message: 'Emotion and intensity are required' });
    }
    if (intensity < 1 || intensity > 10) {
      return res.status(400).json({ message: 'Intensity must be between 1 and 10' });
    }
    const activity = new EmotionalActivity({
      user: req.user._id,
      emotion: emotion.trim().toLowerCase(),
      intensity: parseInt(intensity),
      note: note ? note.trim() : '',
      date: getTodayStr()
    });
    await activity.save();
    res.status(201).json(activity);
  } catch (err) {
    console.error('Create emotional activity error:', err);
    // Handle validation errors specially
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Failed to save emotional activity' });
  }
};

// Get statistics (last 30 days and all‑time) – works with string dates
exports.getStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const todayStr = getTodayStr();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startStr = toDateStr(thirtyDaysAgo);

    // All-time stats (still works because $match uses string comparison)
    const allTimeAgg = await EmotionalActivity.aggregate([
      { $match: { user: userId } },
      { $group: {
          _id: null,
          total: { $sum: 1 },
          avgIntensity: { $avg: "$intensity" },
          emotionCounts: { $push: "$emotion" }
        }
      }
    ]);

    let allTimeStats = { total: 0, avgIntensity: 0, emotionCounts: {}, mostFrequent: null };
    if (allTimeAgg.length) {
      const emotionCounts = allTimeAgg[0].emotionCounts.reduce((acc, e) => {
        acc[e] = (acc[e] || 0) + 1;
        return acc;
      }, {});
      const mostFrequent = Object.entries(emotionCounts).reduce((a, b) => a[1] > b[1] ? a : b, [null, 0])[0];
      allTimeStats = {
        total: allTimeAgg[0].total,
        avgIntensity: allTimeAgg[0].avgIntensity.toFixed(1),
        emotionCounts,
        mostFrequent
      };
    }

    // Last 30 days: group by date string (no $dateToString needed)
    const recentAgg = await EmotionalActivity.aggregate([
      { $match: { user: userId, date: { $gte: startStr, $lte: todayStr } } },
      { $group: {
          _id: "$date",
          count: { $sum: 1 },
          totalIntensity: { $sum: "$intensity" },
          emotions: { $push: "$emotion" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    if (!recentAgg.length) {
      return res.json({ recent: { total: 0, avgIntensity: 0, emotionCounts: {}, mostFrequent: null }, allTime: allTimeStats, dailyTrend: {} });
    }

    let recentTotal = 0, recentTotalIntensity = 0, recentEmotionCounts = {};
    const dailyTrend = {};
    for (const day of recentAgg) {
      recentTotal += day.count;
      recentTotalIntensity += day.totalIntensity;
      day.emotions.forEach(e => { recentEmotionCounts[e] = (recentEmotionCounts[e] || 0) + 1; });
      dailyTrend[day._id] = {
        count: day.count,
        avgIntensity: (day.totalIntensity / day.count).toFixed(1)
      };
    }
    const mostFrequentRecent = Object.entries(recentEmotionCounts).reduce((a, b) => a[1] > b[1] ? a : b, [null, 0])[0];
    const recentStats = {
      total: recentTotal,
      avgIntensity: (recentTotalIntensity / recentTotal).toFixed(1),
      emotionCounts: recentEmotionCounts,
      mostFrequent: mostFrequentRecent
    };

    res.json({
      recent: recentStats,
      allTime: allTimeStats,
      dailyTrend
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Get intensity trend for a specific emotion (last 30 days) – works with string dates
exports.getEmotionTrend = async (req, res) => {
  try {
    const { emotion } = req.params;
    const userId = req.user._id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startStr = toDateStr(thirtyDaysAgo);
    const todayStr = getTodayStr();

    const trend = await EmotionalActivity.aggregate([
      { $match: { user: userId, emotion: emotion, date: { $gte: startStr, $lte: todayStr } } },
      { $group: {
          _id: "$date",
          avgIntensity: { $avg: "$intensity" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(trend.map(t => ({ date: t._id, avgIntensity: parseFloat(t.avgIntensity.toFixed(1)) })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete an emotional activity
exports.deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await EmotionalActivity.findOneAndDelete({ _id: id, user: req.user._id });
    if (!result) return res.status(404).json({ message: 'Activity not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};