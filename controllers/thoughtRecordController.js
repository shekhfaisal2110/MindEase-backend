// const ThoughtRecord = require('../models/ThoughtRecord');

// // Helper: get today's date string
// const getTodayStr = () => new Date().toISOString().split('T')[0];

// // Get all thought records for a user (paginated, with projection)
// exports.getThoughtRecords = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const [records, total] = await Promise.all([
//       ThoughtRecord.find({ user: req.user._id })
//         .sort({ date: -1 })
//         .skip(skip)
//         .limit(limit)
//         .select('date situation automaticThoughts feelings cognitiveDistortions balancedResponse outcomeEmotions createdAt')
//         .lean(),
//       ThoughtRecord.countDocuments({ user: req.user._id })
//     ]);
//     res.json({ records, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Create a new thought record
// exports.createThoughtRecord = async (req, res) => {
//   try {
//     const { situation, automaticThoughts, feelings, cognitiveDistortions, balancedResponse, outcomeEmotions } = req.body;
//     if (!situation || !automaticThoughts) {
//       return res.status(400).json({ message: 'Situation and automatic thoughts are required' });
//     }
//     const record = new ThoughtRecord({
//       user: req.user._id,
//       date: getTodayStr(),
//       situation: situation.trim(),
//       automaticThoughts: automaticThoughts.trim(),
//       feelings: feelings || [],
//       cognitiveDistortions: cognitiveDistortions || [],
//       balancedResponse: balancedResponse?.trim() || '',
//       outcomeEmotions: outcomeEmotions || []
//     });
//     await record.save();

//     // Optionally award points for completing a thought record (e.g., +10)
//     // await api call to activity/add (but we'll keep it separate for clarity)

//     res.status(201).json(record);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get statistics (trend over last 30 days)
// exports.getStats = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
//     const endDate = getTodayStr();

//     const records = await ThoughtRecord.find({
//       user: userId,
//       date: { $gte: startDate, $lte: endDate }
//     }).select('feelings outcomeEmotions date').lean();

//     // Calculate average pre‑CBT intensity vs post‑CBT intensity
//     let preTotal = 0, postTotal = 0, count = 0;
//     records.forEach(rec => {
//       const preAvg = rec.feelings.reduce((sum, f) => sum + f.intensity, 0) / (rec.feelings.length || 1);
//       const postAvg = rec.outcomeEmotions.reduce((sum, f) => sum + f.intensity, 0) / (rec.outcomeEmotions.length || 1);
//       preTotal += preAvg;
//       postTotal += postAvg;
//       count++;
//     });
//     const avgPre = count ? (preTotal / count).toFixed(1) : 0;
//     const avgPost = count ? (postTotal / count).toFixed(1) : 0;
//     const improvement = (avgPre - avgPost).toFixed(1);

//     // Most common cognitive distortions
//     const distortionCounts = {};
//     records.forEach(rec => {
//       rec.cognitiveDistortions?.forEach(d => { distortionCounts[d] = (distortionCounts[d] || 0) + 1; });
//     });
//     const topDistortions = Object.entries(distortionCounts)
//       .map(([name, count]) => ({ name, count }))
//       .sort((a,b) => b.count - a.count)
//       .slice(0, 3);

//     res.json({
//       totalRecords: records.length,
//       avgIntensityBefore: avgPre,
//       avgIntensityAfter: avgPost,
//       improvement,
//       topDistortions
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Delete a thought record
// exports.deleteThoughtRecord = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const result = await ThoughtRecord.findOneAndDelete({ _id: id, user: req.user._id });
//     if (!result) return res.status(404).json({ message: 'Record not found' });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


// controllers/thoughtRecordController.js
const ThoughtRecord = require('../models/ThoughtRecord');

// Helper: get today's date string YYYY-MM-DD
const getTodayStr = () => new Date().toISOString().split('T')[0];

// Get all thought records for a user – cursor‑based pagination (no skip/limit)
exports.getThoughtRecords = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cursor = req.query.cursor || null;   // last document _id from previous page

    const query = { user: req.user._id };
    if (cursor) query._id = { $lt: cursor };   // because sorted by date desc, _id desc

    const records = await ThoughtRecord.find(query)
      .sort({ date: -1, _id: -1 })
      .limit(limit)
      .select('date situation automaticThoughts feelings cognitiveDistortions balancedResponse outcomeEmotions createdAt')
      .lean();

    const nextCursor = records.length === limit ? records[records.length - 1]._id : null;
    res.json({ records, nextCursor, hasMore: !!nextCursor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a new thought record – uses model's static method (if available) or direct save
exports.createThoughtRecord = async (req, res) => {
  try {
    const { situation, automaticThoughts, feelings, cognitiveDistortions, balancedResponse, outcomeEmotions } = req.body;
    if (!situation || !automaticThoughts) {
      return res.status(400).json({ message: 'Situation and automatic thoughts are required' });
    }
    const record = new ThoughtRecord({
      user: req.user._id,
      date: getTodayStr(),
      situation: situation.trim(),
      automaticThoughts: automaticThoughts.trim(),
      feelings: feelings || [],
      cognitiveDistortions: cognitiveDistortions || [],
      balancedResponse: (balancedResponse || '').trim(),
      outcomeEmotions: outcomeEmotions || []
    });
    await record.save();
    res.status(201).json(record.toJSON());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get statistics (trend over last 30 days) – single aggregation pipeline
exports.getStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = getTodayStr();

    const result = await ThoughtRecord.aggregate([
      { $match: { user: userId, date: { $gte: startDate, $lte: endDate } } },
      {
        $addFields: {
          avgPre: { $avg: "$feelings.intensity" },
          avgPost: { $avg: "$outcomeEmotions.intensity" }
        }
      },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          totalPre: { $sum: "$avgPre" },
          totalPost: { $sum: "$avgPost" },
          distortionList: { $push: "$cognitiveDistortions" }
        }
      },
      { $unwind: { path: "$distortionList", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$distortionList", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { _id: "$_id", distortion: "$distortionList" },
          totalRecords: { $first: "$totalRecords" },
          totalPre: { $first: "$totalPre" },
          totalPost: { $first: "$totalPost" },
          distortionCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id._id",
          totalRecords: { $first: "$totalRecords" },
          totalPre: { $first: "$totalPre" },
          totalPost: { $first: "$totalPost" },
          distortions: { $push: { name: "$_id.distortion", count: "$distortionCount" } }
        }
      },
      {
        $project: {
          totalRecords: 1,
          avgIntensityBefore: { $round: [{ $divide: ["$totalPre", "$totalRecords"] }, 1] },
          avgIntensityAfter: { $round: [{ $divide: ["$totalPost", "$totalRecords"] }, 1] },
          topDistortions: {
            $slice: [
              { $sortArray: { input: "$distortions", sortBy: { count: -1 } } },
              3
            ]
          }
        }
      }
    ], { allowDiskUse: false }).exec();

    const stats = result[0] || { totalRecords: 0, avgIntensityBefore: 0, avgIntensityAfter: 0, improvement: 0, topDistortions: [] };
    const improvement = (stats.avgIntensityBefore - stats.avgIntensityAfter).toFixed(1);
    res.json({
      totalRecords: stats.totalRecords,
      avgIntensityBefore: stats.avgIntensityBefore,
      avgIntensityAfter: stats.avgIntensityAfter,
      improvement: parseFloat(improvement),
      topDistortions: stats.topDistortions || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Delete a thought record – atomic, lean
exports.deleteThoughtRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ThoughtRecord.findOneAndDelete({ _id: id, user: req.user._id }).lean();
    if (!result) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};