// // controllers/hourlyEmotionController.js
// const HourlyEmotion = require('../models/HourlyEmotion');

// // Helper: convert any date to YYYY-MM-DD string (UTC)
// const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

// const ALLOWED_EMOTIONS = ['positive', 'negative', 'neutral'];

// // Get all emotions with pagination
// exports.getAll = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 30;
//     const skip = (page - 1) * limit;

//     const [emotions, total] = await Promise.all([
//       HourlyEmotion.find({ user: req.user._id })
//         .sort({ date: -1, hourBlock: 1 })
//         .skip(skip)
//         .limit(limit)
//         .select('date hourBlock emotion')
//         .lean(),
//       HourlyEmotion.countDocuments({ user: req.user._id })
//     ]);
//     res.json({ emotions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get all emotions for a specific date (YYYY-MM-DD)
// exports.getByDate = async (req, res) => {
//   try {
//     const dateStr = toDateStr(req.params.date);
//     const emotions = await HourlyEmotion.find(
//       { user: req.user._id, date: dateStr },
//       { hourBlock: 1, emotion: 1, _id: 0 }
//     ).sort({ hourBlock: 1 }).lean();
//     res.json(emotions);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Save or update emotion for a specific hourBlock on a date (atomic upsert)
// exports.saveEmotion = async (req, res) => {
//   try {
//     const { date, hourBlock, emotion } = req.body;
//     if (!date || !hourBlock || !emotion) {
//       return res.status(400).json({ message: 'date, hourBlock, and emotion required' });
//     }
//     if (!ALLOWED_EMOTIONS.includes(emotion)) {
//       return res.status(400).json({ message: 'Invalid emotion value' });
//     }
//     const dateStr = toDateStr(date);
//     const updated = await HourlyEmotion.findOneAndUpdate(
//       { user: req.user._id, date: dateStr, hourBlock },
//       { $set: { emotion } },
//       { upsert: true, new: true, lean: true }
//     );
//     res.json(updated);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get monthly summary (using aggregation)
// exports.getMonthlySummary = async (req, res) => {
//   try {
//     const { year, month } = req.params;
//     const startStr = `${year}-${month.padStart(2, '0')}-01`;
//     const endDate = new Date(year, month, 0);
//     const endStr = `${year}-${month.padStart(2, '0')}-${endDate.getDate()}`;

//     const result = await HourlyEmotion.aggregate([
//       { $match: { user: req.user._id, date: { $gte: startStr, $lte: endStr } } },
//       { $group: { _id: { date: "$date", emotion: "$emotion" }, count: { $sum: 1 } } },
//       { $group: {
//           _id: "$_id.date",
//           positive: { $sum: { $cond: [{ $eq: ["$_id.emotion", "positive"] }, "$count", 0] } },
//           negative: { $sum: { $cond: [{ $eq: ["$_id.emotion", "negative"] }, "$count", 0] } },
//           neutral: { $sum: { $cond: [{ $eq: ["$_id.emotion", "neutral"] }, "$count", 0] } }
//         }
//       },
//       { $addFields: {
//           sentiment: {
//             $cond: [
//               { $gt: ["$positive", "$negative"] }, "positive",
//               { $cond: [{ $gt: ["$negative", "$positive"] }, "negative", "neutral"] }
//             ]
//           }
//         }
//       },
//       { $project: { date: "$_id", sentiment: 1, _id: 0 } },
//       { $sort: { date: 1 } }
//     ]);
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };



// controllers/hourlyEmotionController.js
const HourlyEmotion = require('../models/HourlyEmotion');

// Helper: convert any date to YYYY-MM-DD string (UTC)
const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

const ALLOWED_EMOTIONS = ['positive', 'negative', 'neutral'];

// Get all emotions with cursor‑based pagination (no skip/limit)
exports.getAll = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const cursor = req.query.cursor || null; // last document _id from previous page

    // Because we sort by date descending, then hourBlock ascending, we need a compound cursor.
    // Simpler: use the model's getRange with date boundaries (all dates) – not scalable.
    // Alternative: use cursor on _id only (since we sort by date desc, _id desc).
    const query = { user: req.user._id };
    if (cursor) query._id = { $lt: cursor };

    const emotions = await HourlyEmotion.find(query)
      .sort({ date: -1, hourBlock: 1, _id: -1 })
      .limit(limit)
      .select('date hourBlock emotion')
      .lean();

    const nextCursor = emotions.length === limit ? emotions[emotions.length - 1]._id : null;
    res.json({ emotions, nextCursor, hasMore: !!nextCursor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all emotions for a specific date (uses model's getSchedule)
exports.getByDate = async (req, res) => {
  try {
    const dateStr = toDateStr(req.params.date);
    const schedule = await HourlyEmotion.getSchedule(req.user._id, dateStr);
    // Convert schedule object to array format (optional, keep as object or array)
    const emotions = Object.entries(schedule).map(([hourBlock, emotion]) => ({ hourBlock, emotion }));
    res.json(emotions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Save or update emotion for a specific hourBlock on a date (atomic upsert)
exports.saveEmotion = async (req, res) => {
  try {
    const { date, hourBlock, emotion } = req.body;
    if (!date || !hourBlock || !emotion) {
      return res.status(400).json({ message: 'date, hourBlock, and emotion required' });
    }
    if (!ALLOWED_EMOTIONS.includes(emotion)) {
      return res.status(400).json({ message: 'Invalid emotion value' });
    }
    const dateStr = toDateStr(date);
    const updated = await HourlyEmotion.setEmotion(req.user._id, dateStr, hourBlock, emotion);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get monthly summary – aggregation with allowDiskUse: false
exports.getMonthlySummary = async (req, res) => {
  try {
    const { year, month } = req.params;
    const monthPadded = month.padStart(2, '0');
    const startStr = `${year}-${monthPadded}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endStr = `${year}-${monthPadded}-${lastDay}`;

    const result = await HourlyEmotion.aggregate([
      { $match: { user: req.user._id, date: { $gte: startStr, $lte: endStr } } },
      { $group: { _id: { date: "$date", emotion: "$emotion" }, count: { $sum: 1 } } },
      { $group: {
          _id: "$_id.date",
          positive: { $sum: { $cond: [{ $eq: ["$_id.emotion", "positive"] }, "$count", 0] } },
          negative: { $sum: { $cond: [{ $eq: ["$_id.emotion", "negative"] }, "$count", 0] } },
          neutral: { $sum: { $cond: [{ $eq: ["$_id.emotion", "neutral"] }, "$count", 0] } }
        }
      },
      { $addFields: {
          sentiment: {
            $cond: [
              { $gt: ["$positive", "$negative"] }, "positive",
              { $cond: [{ $gt: ["$negative", "$positive"] }, "negative", "neutral"] }
            ]
          }
        }
      },
      { $project: { date: "$_id", sentiment: 1, _id: 0 } },
      { $sort: { date: 1 } }
    ], { allowDiskUse: false }).exec();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};